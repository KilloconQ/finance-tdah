import Foundation

public struct InvitationsService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    /// Group invitations waiting for the signed-in user.
    public func list() async throws -> [GroupInvitation] {
        try await client.get("/api/invitations", key: "invitations")
    }

    /// Returns the id of the group just joined.
    public func accept(_ id: EntityID) async throws -> EntityID {
        try await client.post("/api/invitations/\(id.rawValue)/accept", key: "groupId")
    }

    public func decline(_ id: EntityID) async throws {
        try await client.send(.post, "/api/invitations/\(id.rawValue)/decline")
    }

    /// Invites someone to sign up for the app .
    public func inviteToApp(email: String) async throws {
        try await client.send(.post, "/api/invitations/app", body: ["email": email])
    }
}
