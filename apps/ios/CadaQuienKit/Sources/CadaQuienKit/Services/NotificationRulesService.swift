import Foundation

public struct NotificationRulesService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    /// One rule per kind; the ones never touched come back with their defaults.
    public func list() async throws -> [NotificationRule] {
        try await client.get("/api/notification-rules", key: "rules")
    }

    public func save(_ rule: NotificationRule) async throws {
        let _: NotificationRule = try await client.put("/api/notification-rules/\(rule.kind.rawValue)", key: "rule", body: Body(rule))
    }

    /// The kind goes in the path, not in the body.
    private struct Body: Encodable {
        let enabled: Bool
        let daysBefore: Int
        let hour: Int

        init(_ rule: NotificationRule) {
            enabled = rule.enabled
            daysBefore = rule.daysBefore
            hour = rule.hour
        }
    }
}
