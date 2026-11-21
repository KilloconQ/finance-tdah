import Foundation

/// Where a `cadaquien://` link sends the person: the widget uses `add`.
enum DeepLink: Equatable {
    case addExpense
    case panic

    init?(url: URL) {
        guard url.scheme?.lowercased() == "cadaquien" else { return nil }
        switch url.host?.lowercased() {
        case "add": self = .addExpense
        case "panic": self = .panic
        default: return nil
        }
    }
}
