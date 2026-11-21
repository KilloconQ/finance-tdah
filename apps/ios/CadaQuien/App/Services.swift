import CadaQuienKit

/// Every API service, built once from one client.
struct Services: Sendable {
    let auth: AuthService
    let profile: ProfileService
    let accounts: AccountsService
    let envelopes: EnvelopesService
    let expenses: ExpensesService
    let goals: GoalsService
    let subscriptions: SubscriptionsService
    let challenges: ChallengesService
    let dashboard: DashboardService
    let groups: GroupsService
    let invitations: InvitationsService
    let incomes: IncomesService
    let calendar: CalendarService

    init(client: APIClient) {
        auth = AuthService(client: client)
        profile = ProfileService(client: client)
        accounts = AccountsService(client: client)
        envelopes = EnvelopesService(client: client)
        expenses = ExpensesService(client: client)
        goals = GoalsService(client: client)
        subscriptions = SubscriptionsService(client: client)
        challenges = ChallengesService(client: client)
        dashboard = DashboardService(client: client)
        groups = GroupsService(client: client)
        invitations = InvitationsService(client: client)
        incomes = IncomesService(client: client)
        calendar = CalendarService(client: client)
    }
}
