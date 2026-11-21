import SwiftUI

extension View {
    /// Registers every `Route` destination once on a navigation stack.
    func routeDestinations() -> some View {
        navigationDestination(for: Route.self) { RouteView(route: $0) }
    }
}

private struct RouteView: View {
    let route: Route

    var body: some View {
        switch route {
        case .settings: SettingsView()
        case .challenge: ChallengeView()
        case .editExpense(let id): EditExpenseScreen(expenseId: id)
        case .accounts: AccountsView()
        case .newAccount: NewAccountScreen()
        case .editAccount(let id): EditAccountScreen(accountId: id)
        case .envelopes(let id): EnvelopesScreen(accountId: id)
        case .goals: GoalsView()
        case .newGoal: NewGoalScreen()
        case .goal(let id): GoalDetailScreen(goalId: id)
        case .editGoal(let id): EditGoalScreen(goalId: id)
        case .subscriptions: SubscriptionsView()
        case .newSubscription: NewSubscriptionScreen()
        case .subscription(let id): SubscriptionDetailScreen(subscriptionId: id)
        case .editSubscription(let id): EditSubscriptionScreen(subscriptionId: id)
        case .group(let id): GroupDetailScreen(groupId: id)
        }
    }
}
