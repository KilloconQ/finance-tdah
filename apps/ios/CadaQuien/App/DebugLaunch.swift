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

    /// 0 Hoy, 1 Movimientos, 2 Dinero, 3 Grupos.
    static var tab: Int? { value(after: "-cq-tab").flatMap(Int.init) }

    /// A named screen to push on the selected tab, e.g. `accounts`, `goals`, `subscriptions`, `settings`.
    static var route: String? { value(after: "-cq-route") }
}
#endif
