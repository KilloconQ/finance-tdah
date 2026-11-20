import Foundation

public struct EnvelopesService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func list() async throws -> [Envelope] {
        try await client.get("/api/envelopes", key: "envelopes")
    }

    public func create(_ input: NewEnvelope) async throws -> Envelope {
        try await client.post("/api/envelopes", key: "envelope", body: input)
    }

    public func update(_ id: EntityID, _ input: EnvelopeUpdate) async throws -> Envelope {
        try await client.patch("/api/envelopes/\(id.rawValue)", key: "envelope", body: input)
    }

    /// Positive sets money aside in the envelope; negative releases it back to the account.
    public func adjust(_ id: EntityID, deltaCents: Int) async throws -> Envelope {
        try await client.post("/api/envelopes/\(id.rawValue)/adjust", key: "envelope", body: ["deltaCents": deltaCents])
    }

    public func delete(_ id: EntityID) async throws {
        try await client.send(.delete, "/api/envelopes/\(id.rawValue)")
    }

    public struct NewEnvelope: Encodable, Sendable {
        public var accountId: EntityID
        public var name: String
        public var emoji: String?
        public var amountCents: Int?

        public init(accountId: EntityID, name: String, emoji: String? = nil, amountCents: Int? = nil) {
            self.accountId = accountId
            self.name = name
            self.emoji = emoji
            self.amountCents = amountCents
        }
    }

    public struct EnvelopeUpdate: Encodable, Sendable {
        public var name: String?
        public var emoji: String?

        public init(name: String? = nil, emoji: String? = nil) {
            self.name = name
            self.emoji = emoji
        }
    }
}
