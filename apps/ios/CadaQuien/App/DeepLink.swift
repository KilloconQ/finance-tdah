import CadaQuienKit
import Foundation

/// Where a link sends the person: `cadaquien://` links from the widget, and the paths the server puts in a notification.
enum DeepLink: Equatable {
    case addExpense
    case panic
    case subscription(EntityID)

    init?(url: URL) {
        guard url.scheme?.lowercased() == "cadaquien" else { return nil }
        switch url.host?.lowercased() {
        case "add": self = .addExpense
        case "panic": self = .panic
        default: return nil
        }
    }

    /// The server sends web paths: `/add-expense` (daily reminder), `/subscriptions/<id>` (charge alert), `/` (budget,
    /// jar). Anything that has no screen of its own just opens the app.
    init?(webPath: String) {
        let parts = webPath.split(separator: "/").map(String.init)
        switch parts.count {
        case 1 where parts[0] == "add-expense": self = .addExpense
        case 2 where parts[0] == "subscriptions" && !parts[1].isEmpty: self = .subscription(EntityID(parts[1]))
        default: return nil
        }
    }
}
