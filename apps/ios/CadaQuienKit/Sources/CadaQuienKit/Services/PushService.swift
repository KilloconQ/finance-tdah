import Foundation

/// Registers this phone for native (APNs) notifications. The token identifies the phone; whoever signed in last on it owns it.
public struct PushService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    /// Which Apple server a token belongs to: Xcode (debug) builds use the sandbox; TestFlight and the App Store, production.
    public enum Environment: String, Codable, Sendable {
        case sandbox, production
    }

    private struct Registration: Encodable {
        let token: String
        let environment: Environment
    }

    public func register(token: String, environment: Environment) async throws {
        try await client.send(.post, "/api/push/device", body: Registration(token: token, environment: environment))
    }

    /// Stops notifications to this phone for the signed-in user. A 404 means it was already gone, which is the goal.
    public func unregister(token: String) async throws {
        do {
            try await client.send(.delete, "/api/push/device", body: ["token": token])
        } catch APIError.server(status: 404, _) {
            return
        }
    }
}

public enum DeviceToken {
    /// APNs hands the app raw bytes; the server wants them as lowercase hex.
    public static func hex(_ data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined()
    }
}

public enum ReminderHour {
    /// `0` -> "12:00 am", `9` -> "9:00 am", `21` -> "9:00 pm". Same labels as the web.
    public static func label(_ hour: Int) -> String {
        let twelve = hour % 12 == 0 ? 12 : hour % 12
        return "\(twelve):00 \(hour < 12 ? "am" : "pm")"
    }

    public static let all = Array(0...23)
}
