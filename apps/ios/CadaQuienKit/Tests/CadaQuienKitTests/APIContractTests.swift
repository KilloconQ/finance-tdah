import Foundation
import Testing
@testable import CadaQuienKit

/// Runs the Swift models against the real API, so a drift from `packages/shared` fails here and not in the app.
/// Opt-in, like the API's own integration tests. Start the API on a throwaway database with
/// `ALLOWED_EMAILS=ios-contract@test.local`, then:
///
///     CADAQUIEN_CONTRACT_URL=http://localhost:3001 swift test --filter APIContractTests
private let contractURL = ProcessInfo.processInfo.environment["CADAQUIEN_CONTRACT_URL"]

@Suite(.enabled(if: contractURL != nil))
struct APIContractTests {
    private struct Wrapped<Value: Decodable>: Decodable {
        let value: Value
        init(from decoder: any Decoder) throws {
            let container = try decoder.container(keyedBy: AnyKey.self)
            guard let key = container.allKeys.first else { throw APIError.invalidResponse }
            value = try container.decode(Value.self, forKey: key)
        }
    }

    private struct AnyKey: CodingKey {
        var stringValue: String
        var intValue: Int? { nil }
        init?(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { nil }
    }

    private struct Body: Encodable {
        var values: [String: JSONScalar]
        func encode(to encoder: any Encoder) throws {
            var container = encoder.container(keyedBy: AnyKey.self)
            for (key, value) in values { try container.encode(value, forKey: AnyKey(stringValue: key)!) }
        }
    }

    private enum JSONScalar: Encodable {
        case string(String), int(Int)
        func encode(to encoder: any Encoder) throws {
            var container = encoder.singleValueContainer()
            switch self {
            case .string(let value): try container.encode(value)
            case .int(let value): try container.encode(value)
            }
        }
    }

    private func body(_ pairs: [String: Any]) -> Body {
        Body(values: pairs.mapValues { $0 as? Int != nil ? .int($0 as! Int) : .string("\($0)") })
    }

    @Test func everyReadModelDecodesTheRealResponses() async throws {
        let environment = APIEnvironment(baseURL: URL(string: try #require(contractURL))!)
        let tokens = InMemoryTokenStore()
        let client = APIClient(environment: environment, tokens: tokens)
        let auth = AuthService(client: client)

        // Clean slate: a previous run leaves its data behind, and deleting the account cascades it all.
        let email = "ios-contract@test.local"
        if (try? await auth.signIn(email: email, password: "correct-horse-battery")) != nil {
            try await client.send(.post, "/api/profile/delete")
            tokens.clear()
        }
        try await auth.signUp(email: email, password: "correct-horse-battery", name: "iOS Contract")
        #expect(tokens.token() != nil)
        let user = try await auth.currentUser()
        #expect(user?.email == email)

        // Profile
        let noProfile: Wrapped<UserProfile?> = try await client.get("/api/profile")
        if noProfile.value == nil {
            let _: Wrapped<UserProfile> = try await client.post(
                "/api/profile/onboarding", body: Onboarding(displayName: "Ana", pain: [], inputPreference: "widget")
            )
        }
        let profile: Wrapped<UserProfile> = try await client.get("/api/profile")
        #expect(profile.value.displayName.isEmpty == false)

        // Accounts + statement + envelopes
        let card: Wrapped<Account> = try await client.post(
            "/api/accounts",
            body: body(["name": "Tarjeta", "type": "credito", "balanceCents": -100_000, "cutoffDay": 15, "paymentDay": 5])
        )
        #expect(card.value.type == .credito)
        #expect(card.value.cutoffDay == 15)
        let debit: Wrapped<Account> = try await client.post(
            "/api/accounts", body: body(["name": "Débito", "type": "debito", "balanceCents": 500_000])
        )
        let accounts: Wrapped<[Account]> = try await client.get("/api/accounts")
        #expect(accounts.value.count >= 2)
        let statement: Wrapped<CardStatement> = try await client.get("/api/accounts/\(card.value.id.uuidString.lowercased())/statement")
        #expect(statement.value.cutoffDate < statement.value.nextCutoffDate)

        let envelope: Wrapped<Envelope> = try await client.post(
            "/api/envelopes",
            body: body(["accountId": debit.value.id.uuidString.lowercased(), "name": "Comida", "emoji": "🍜", "amountCents": 10_000])
        )
        #expect(envelope.value.balanceCents == 10_000)
        let envelopes: Wrapped<[Envelope]> = try await client.get("/api/envelopes")
        #expect(envelopes.value.contains { $0.id == envelope.value.id })

        // Expenses (the id round-trips as an UPPERCASE UUID from Swift; the API must accept it)
        let expense: Wrapped<Expense> = try await client.post(
            "/api/expenses",
            body: Expense_(amountCents: 1_500, category: "comida", description: "Tacos", accountId: debit.value.id, kind: .expense)
        )
        #expect(expense.value.amountCents == 1_500)
        let expenses: Wrapped<[Expense]> = try await client.get("/api/expenses")
        #expect(expenses.value.contains { $0.id == expense.value.id })

        // Goals, subscriptions, challenge
        let goal: Wrapped<Goal> = try await client.post(
            "/api/goals", body: body(["name": "Viaje", "targetCents": 100_000, "deadline": "2027-01-01"])
        )
        #expect(goal.value.deadline == CalendarDay(year: 2027, month: 1, day: 1))
        let goals: Wrapped<[Goal]> = try await client.get("/api/goals")
        #expect(goals.value.contains { $0.id == goal.value.id })

        let subscription: Wrapped<Subscription> = try await client.post(
            "/api/subscriptions",
            body: body(["name": "Netflix", "category": "streaming", "amountCents": 19_900, "cadence": "monthly", "nextChargeAt": "2027-01-10"])
        )
        #expect(subscription.value.cadence == .monthly)
        let subscriptions: Wrapped<[Subscription]> = try await client.get("/api/subscriptions")
        #expect(subscriptions.value.contains { $0.id == subscription.value.id })

        let challenge: Wrapped<Challenge> = try await client.post(
            "/api/challenges", body: body(["name": "Sin antojos", "description": "7 días sin antojos", "days": 7])
        )
        #expect(challenge.value.days == 7)
        let active: Wrapped<Challenge?> = try await client.get("/api/challenges/active")
        #expect(active.value?.id == challenge.value.id)

        // Dashboard
        let home: Wrapped<HomeSummary> = try await client.get("/api/dashboard/home")
        #expect(home.value.greeting.isEmpty == false)
        let breakdown: Wrapped<AccountsBreakdown> = try await client.get("/api/dashboard/breakdown")
        #expect(breakdown.value.debtCents == 100_000)

        // Groups
        let group: Wrapped<ExpenseGroup> = try await client.post("/api/groups", body: body(["name": "Depa"]))
        let detail: GroupDetail = try await client.get("/api/groups/\(group.value.id.uuidString.lowercased())")
        #expect(detail.group.members.count == 1)
        let invitations: Wrapped<[GroupInvitation]> = try await client.get("/api/invitations")
        #expect(invitations.value.isEmpty)

        // Sign out must revoke the token on the server, not just forget it on the phone.
        let issuedToken = try #require(tokens.token())
        await auth.signOut()
        #expect(tokens.token() == nil)
        let stale = AuthService(client: APIClient(environment: environment, tokens: InMemoryTokenStore(token: issuedToken)))
        #expect(try await stale.currentUser() == nil)
    }

    private struct Onboarding: Encodable {
        let displayName: String
        let pain: [String]
        let inputPreference: String
    }

    /// Mirrors `createExpenseSchema`: nil fields are omitted, not sent as null.
    private struct Expense_: Encodable {
        let amountCents: Int
        let category: String
        let description: String
        let accountId: UUID
        let kind: ExpenseKind
    }
}
