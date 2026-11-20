import Foundation
import Testing

@testable import CadaQuienKit

/// Runs the services and models against the real API, so a drift from `packages/shared` fails here and not in the app.
/// Opt-in, like the API's own integration tests. Start the API on a throwaway database with
/// `ALLOWED_EMAILS=ios-contract@test.local`, then (the API rate-limits sign-ups to 5 per minute):
///
///     CADAQUIEN_CONTRACT_URL=http://localhost:3001 swift test --filter APIContractTests
private let contractURL = ProcessInfo.processInfo.environment["CADAQUIEN_CONTRACT_URL"]

@Suite(.enabled(if: contractURL != nil))
struct APIContractTests {
  @Test func servicesRoundTripAgainstTheRealAPI() async throws {
    let environment = APIEnvironment(baseURL: URL(string: try #require(contractURL))!)
    let tokens = InMemoryTokenStore()
    let client = APIClient(environment: environment, tokens: tokens)
    let auth = AuthService(client: client)
    let email = "ios-contract@test.local"
    let password = "correct-horse-battery"

    // Clean slate: a previous run leaves its data behind, and deleting the account cascades it all.
    if (try? await auth.signIn(email: email, password: password)) != nil {
      try await ProfileService(client: client).deleteAccount()
      tokens.clear()
    }
    try await auth.signUp(email: email, password: password, name: "iOS Contract")
    #expect(try await auth.currentUser()?.email == email)

    // Profile: nil before onboarding, then a decoded profile; a PATCH leaves unsent fields alone.
    let profiles = ProfileService(client: client)
    #expect(try await profiles.get() == nil)
    let created = try await profiles.completeOnboarding(.init(displayName: "Ana", pain: ["olvido"], inputPreference: .widget))
    #expect(created.inputPreference == .widget)
    let patched = try await profiles.update(.init(weeklyBudgetCents: 250_000, dailyReminderHour: 8))
    #expect(patched.weeklyBudgetCents == 250_000)
    #expect(patched.dailyReminderHour == 8)
    #expect(patched.inputPreference == .widget)  // untouched
    #expect(patched.displayName == "Ana")  // untouched

    // Accounts: credit card with statement days, a debit account, edit, statement.
    let accounts = AccountsService(client: client)
    let card = try await accounts.create(
      .init(name: "Tarjeta", type: .credito, balanceCents: -100_000, cutoffDay: 15, paymentDay: 5))
    #expect(card.cutoffDay == 15)
    let debit = try await accounts.create(.init(name: "Débito", type: .debito, balanceCents: 500_000))
    let renamed = try await accounts.update(debit.id, .init(name: "Nómina"))
    #expect(renamed.name == "Nómina")
    #expect(renamed.balanceCents == 500_000)  // untouched by a rename
    await #expect(
      throws: APIError.server(status: 422, message: "Pon el día de corte y el de pago, o deja los dos vacíos.")
    ) {
      _ = try await accounts.update(card.id, .init(paymentDay: .clear))
    }
    // `.clear` goes out as a real null: the API takes it and keeps everything else.
    let cleared = try await accounts.update(debit.id, .init(cutoffDay: .clear, paymentDay: .clear))
    #expect(cleared.cutoffDay == nil)
    #expect(cleared.name == "Nómina")  // untouched
    #expect(try await accounts.list().count == 2)
    let statement = try await accounts.statement(card.id)
    #expect(statement.cutoffDate < statement.nextCutoffDate)

    // Envelopes: create, adjust, spend from it, take the expense out again.
    let envelopes = EnvelopesService(client: client)
    let envelope = try await envelopes.create(.init(accountId: debit.id, name: "Comida", emoji: "🍜", amountCents: 10_000))
    #expect(envelope.balanceCents == 10_000)
    #expect(try await envelopes.adjust(envelope.id, deltaCents: 2_500).balanceCents == 12_500)
    #expect(try await envelopes.update(envelope.id, .init(name: "Super")).name == "Super")

    let expenses = ExpensesService(client: client)
    let tacos = try await expenses.create(
      .init(amountCents: 1_500, category: "comida", description: "Tacos", accountId: debit.id, envelopeId: envelope.id))
    #expect(tacos.envelopeId == envelope.id)
    #expect(try await envelopes.list().first?.balanceCents == 11_000)
    let detached = try await expenses.update(tacos.id, .init(envelopeId: .clear))
    #expect(detached.envelopeId == nil)
    #expect(detached.amountCents == 1_500)  // untouched
    #expect(try await expenses.list().contains { $0.id == tacos.id })
    let income = try await expenses.create(
      .init(kind: .income, amountCents: 5_000, category: "sueldo", description: "Pago", accountId: debit.id))
    #expect(income.kind == .income)
    let transfer = try await expenses.create(
      .init(
        kind: .transfer, amountCents: 2_000, category: "pago", description: "Pago tarjeta", accountId: debit.id,
        toAccountId: card.id))
    #expect(transfer.toAccountId == card.id)
    try await expenses.delete(income.id)
    #expect(try await expenses.list().contains { $0.id == income.id } == false)

    // Goals
    let goals = GoalsService(client: client)
    let goal = try await goals.create(
      .init(name: "Viaje", targetCents: 100_000, deadline: CalendarDay(year: 2027, month: 1, day: 1)))
    #expect(goal.deadline == CalendarDay(year: 2027, month: 1, day: 1))
    #expect(try await goals.add(goal.id, amountCents: 20_000).currentCents == 20_000)
    #expect(try await goals.update(goal.id, .init(name: "Playa")).deadline == goal.deadline)  // untouched
    #expect(try await goals.get(goal.id).name == "Playa")

    // Subscriptions
    let subscriptions = SubscriptionsService(client: client)
    let netflix = try await subscriptions.create(
      .init(
        name: "Netflix", category: "streaming", amountCents: 19_900, cadence: .yearly,
        nextChargeAt: CalendarDay(year: 2027, month: 1, day: 10)))
    #expect(netflix.cadence == .yearly)
    let renamedSub = try await subscriptions.update(netflix.id, .init(name: "HBO"))
    #expect(renamedSub.cadence == .yearly)  // a rename must not turn a yearly subscription monthly
    #expect(try await subscriptions.cancel(netflix.id).cancelledAt != nil)
    let other = try await subscriptions.create(
      .init(name: "Spotify", category: "musica", amountCents: 9_900, nextChargeAt: CalendarDay(year: 2027, month: 2, day: 1)))
    _ = try await subscriptions.pause(other.id)

    // Challenge
    let challenges = ChallengesService(client: client)
    #expect(try await challenges.active() == nil)
    let challenge = try await challenges.create(.init(name: "Sin antojos", description: "7 días sin antojos", days: 7))
    #expect(try await challenges.active()?.id == challenge.id)
    #expect(try await challenges.check(challenge.id).doneDays == 1)
    #expect(try await challenges.reset(challenge.id).doneDays == 0)
    #expect(try await challenges.list().isEmpty == false)

    // Dashboard
    let dashboard = DashboardService(client: client)
    #expect(try await dashboard.home().greeting.isEmpty == false)
    #expect(try await dashboard.breakdown().jarsCents == 20_000)

    // Groups: create, add a shared expense, read the detail.
    let groups = GroupsService(client: client)
    let group = try await groups.create(name: "Depa")
    let me = try #require(group.members.first)
    let shared = try await groups.addExpense(
      to: group.id,
      .init(
        paidBy: me.userId, description: "Super", amountCents: 9_000, date: CalendarDay(year: 2026, month: 11, day: 10),
        participantIds: [me.userId]))
    #expect(shared.splits.first?.shareCents == 9_000)
    let detail = try await groups.detail(group.id)
    #expect(detail.expenses.count == 1)
    #expect(detail.group.members.count == 1)
    try await groups.deleteExpense(in: group.id, shared.id)
    #expect(try await groups.detail(group.id).expenses.isEmpty)
    #expect(try await groups.list().count == 1)
    #expect(try await InvitationsService(client: client).list().isEmpty)

    // Sign out must revoke the token on the server, not just forget it on the phone.
    let issuedToken = try #require(tokens.token())
    await auth.signOut()
    #expect(tokens.token() == nil)
    let stale = AuthService(client: APIClient(environment: environment, tokens: InMemoryTokenStore(token: issuedToken)))
    #expect(try await stale.currentUser() == nil)
  }
}
