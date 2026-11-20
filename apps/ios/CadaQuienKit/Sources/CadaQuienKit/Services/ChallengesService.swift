import Foundation

public struct ChallengesService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    /// The challenge in progress, or nil when there is none.
    public func active() async throws -> Challenge? {
        try await client.get("/api/challenges/active", key: "challenge")
    }

    public func list() async throws -> [Challenge] {
        try await client.get("/api/challenges", key: "challenges")
    }

    public func create(_ input: NewChallenge) async throws -> Challenge {
        try await client.post("/api/challenges", key: "challenge", body: input)
    }

    /// Marks today as done.
    public func check(_ id: EntityID) async throws -> Challenge {
        try await client.post("/api/challenges/\(id.rawValue)/check", key: "challenge")
    }

    public func reset(_ id: EntityID) async throws -> Challenge {
        try await client.post("/api/challenges/\(id.rawValue)/reset", key: "challenge")
    }

    public struct NewChallenge: Encodable, Sendable {
        public var name: String
        public var description: String
        public var days: Int?
        public var expectedSavingsCents: Int?

        public init(name: String, description: String, days: Int? = nil, expectedSavingsCents: Int? = nil) {
            self.name = name
            self.description = description
            self.days = days
            self.expectedSavingsCents = expectedSavingsCents
        }
    }
}
