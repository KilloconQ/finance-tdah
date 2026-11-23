import Foundation

/// Whether the signed-in user may use the app. `required` is false in dev/local: the app must not show a paywall then.
public struct BillingStatus: Codable, Sendable, Hashable {
    public let required: Bool
    public let hasAccess: Bool
    public let access: Access

    public enum Access: String, Codable, Sendable, Hashable {
        case free, allowlist, subscribed, none
    }

    public init(required: Bool, hasAccess: Bool, access: Access) {
        self.required = required
        self.hasAccess = hasAccess
        self.access = access
    }

    /// Only a server that charges AND says this user hasn't paid sends them to the paywall.
    public var needsPaywall: Bool { required && !hasAccess }
}
