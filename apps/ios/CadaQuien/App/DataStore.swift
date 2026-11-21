import CadaQuienKit
import Observation

/// The server data the signed-in user's screens share. A new one is built for every session, so signing out
/// (or being signed out) never leaves one person's numbers on screen for the next.
@MainActor @Observable
final class DataStore {
    let summary: Resource<HomeSummary>
    let accounts: Resource<[Account]>
    let envelopes: Resource<[Envelope]>
    let expenses: Resource<[Expense]>
    let goals: Resource<[Goal]>
    let subscriptions: Resource<[Subscription]>
    let challenge: Resource<Challenge?>
    let groups: Resource<[ExpenseGroup]>
    let invitations: Resource<[GroupInvitation]>

    @ObservationIgnored private var groupDetails: [EntityID: Resource<GroupDetail>] = [:]
    @ObservationIgnored private let services: Services
    @ObservationIgnored private let fire: @MainActor () -> Void

    init(services: Services, unauthorized: UnauthorizedHandler) {
        let fire: @MainActor () -> Void = { unauthorized.fire() }
        self.services = services
        self.fire = fire
        summary = Resource(onUnauthorized: fire) { try await services.dashboard.home() }
        accounts = Resource(onUnauthorized: fire) { try await services.accounts.list() }
        envelopes = Resource(onUnauthorized: fire) { try await services.envelopes.list() }
        expenses = Resource(onUnauthorized: fire) { try await services.expenses.list() }
        goals = Resource(onUnauthorized: fire) { try await services.goals.list() }
        subscriptions = Resource(onUnauthorized: fire) { try await services.subscriptions.list() }
        challenge = Resource(onUnauthorized: fire) { try await services.challenges.active() }
        groups = Resource(onUnauthorized: fire) { try await services.groups.list() }
        invitations = Resource(onUnauthorized: fire) { try await services.invitations.list() }
    }

    /// Money moved: balances, envelopes, the week's numbers and the list of movements may all have changed.
    func refreshMoney() async {
        async let summary: Void = summary.reloadIfLoaded()
        async let accounts: Void = accounts.reloadIfLoaded()
        async let envelopes: Void = envelopes.reloadIfLoaded()
        async let expenses: Void = expenses.reloadIfLoaded()
        async let goals: Void = goals.reloadIfLoaded()
        _ = await (summary, accounts, envelopes, expenses, goals)
    }

    func refreshGoals() async {
        async let goals: Void = goals.reloadIfLoaded()
        async let summary: Void = summary.reloadIfLoaded()
        _ = await (goals, summary)
    }

    func refreshSubscriptions() async {
        await subscriptions.reloadIfLoaded()
    }

    func refreshChallenge() async {
        await challenge.reloadIfLoaded()
    }

    func refreshGroups() async {
        async let groups: Void = groups.reloadIfLoaded()
        async let invitations: Void = invitations.reloadIfLoaded()
        _ = await (groups, invitations)
    }

    /// One group's balances, expenses and members; created on first use and kept for the session.
    func groupDetail(_ id: EntityID) -> Resource<GroupDetail> {
        if let existing = groupDetails[id] { return existing }
        let services = services
        let resource = Resource<GroupDetail>(onUnauthorized: fire) { try await services.groups.detail(id) }
        groupDetails[id] = resource
        return resource
    }

    /// After writing to a group: its detail and the list (balances show in both).
    func refreshGroup(_ id: EntityID) async {
        async let detail: Void = groupDetail(id).load()
        async let list: Void = groups.reloadIfLoaded()
        _ = await (detail, list)
    }
}
