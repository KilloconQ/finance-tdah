import CadaQuienKit

/// Every screen that can be pushed on a tab's navigation stack.
enum Route: Hashable {
    case settings
    case challenge
    case editExpense(EntityID)

    case accounts
    case newAccount
    case editAccount(EntityID)
    case envelopes(EntityID)

    case goals
    case newGoal
    case goal(EntityID)
    case editGoal(EntityID)

    case subscriptions
    case newSubscription
    case subscription(EntityID)
    case editSubscription(EntityID)

    case group(EntityID)
}
