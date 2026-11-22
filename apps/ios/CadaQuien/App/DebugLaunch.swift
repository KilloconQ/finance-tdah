#if DEBUG
import CadaQuienKit
import Foundation

/// Debug builds only: lets a script open the app already signed in on a given tab, so screens can be checked
/// with `xcrun simctl launch <device> app.cadaquien.ios -cq-token <token> -cq-tab 2`.
enum DebugLaunch {
    private static func value(after flag: String) -> String? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: flag), arguments.indices.contains(index + 1) else { return nil }
        return arguments[index + 1]
    }

    static func apply(to tokens: any TokenStore) {
        if let token = value(after: "-cq-token") { tokens.save(token) }
    }

    /// `-cq-tab 0..4` (Hoy, Movimientos, Dinero, Calendario, Grupos), `-cq-route settings` to push a screen, `-cq-panic`,
    /// and `-cq-add` to open the add-expense sheet.
    @MainActor
    static func configure(_ navigator: Navigator) {
        let tabs: [MainTab] = [.today, .movements, .money, .calendar, .groups]
        if let index = value(after: "-cq-tab").flatMap(Int.init), tabs.indices.contains(index) {
            navigator.tab = tabs[index]
        }
        if let name = value(after: "-cq-route"), let route = Route.named(name) {
            navigator.open(route, in: navigator.tab)
        }
        navigator.isShowingPanic = ProcessInfo.processInfo.arguments.contains("-cq-panic")
        navigator.isAddingExpense = ProcessInfo.processInfo.arguments.contains("-cq-add")
    }
}

extension Route {
    /// Routes that need no id, by name, for `-cq-route`.
    static func named(_ name: String) -> Route? {
        switch name {
        case "settings": .settings
        case "widgets": .widgetGallery
        case "challenge": .challenge
        case "accounts": .accounts
        case "newAccount": .newAccount
        case "goals": .goals
        case "newGoal": .newGoal
        case "subscriptions": .subscriptions
        case "newSubscription": .newSubscription
        default: nil
        }
    }
}
#endif
