import Observation

enum MainTab: Hashable {
    case today, movements, money, groups
}

/// Which tab is showing, what is pushed on each, and the sheets that open from anywhere. Lives in the environment so
/// a screen can send the person somewhere else (e.g. the panic screen opening the subscriptions list).
@MainActor @Observable
final class Navigator {
    var tab: MainTab = .today
    var todayPath: [Route] = []
    var movementsPath: [Route] = []
    var moneyPath: [Route] = []
    var groupsPath: [Route] = []

    var isAddingExpense = false
    var isShowingPanic = false

    init() {
        #if DEBUG
        DebugLaunch.configure(self)
        #endif
    }

    /// Switches to `tab` and shows `route` on top of its root.
    func open(_ route: Route, in tab: MainTab) {
        self.tab = tab
        switch tab {
        case .today: todayPath = [route]
        case .movements: movementsPath = [route]
        case .money: moneyPath = [route]
        case .groups: groupsPath = [route]
        }
    }
}
