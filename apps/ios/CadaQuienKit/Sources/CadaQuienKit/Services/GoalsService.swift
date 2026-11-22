import Foundation

public struct GoalsService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func list() async throws -> [Goal] {
        try await client.get("/api/goals", key: "goals")
    }

    public func get(_ id: EntityID) async throws -> Goal {
        try await client.get("/api/goals/\(id.rawValue)", key: "goal")
    }

    public func create(_ input: NewGoal) async throws -> Goal {
        try await client.post("/api/goals", key: "goal", body: input)
    }

    public func update(_ id: EntityID, _ input: GoalUpdate) async throws -> Goal {
        try await client.patch("/api/goals/\(id.rawValue)", key: "goal", body: input)
    }

    /// Puts money into the goal's jar.
    public func add(_ id: EntityID, amountCents: Int) async throws -> Goal {
        try await client.post("/api/goals/\(id.rawValue)/add", key: "goal", body: ["amountCents": amountCents])
    }

    public func delete(_ id: EntityID) async throws {
        try await client.send(.delete, "/api/goals/\(id.rawValue)")
    }

    public struct NewGoal: Encodable, Sendable, Equatable {
        public var name: String
        public var emoji: String?
        public var targetCents: Int
        public var deadline: CalendarDay?

        public init(name: String, emoji: String? = nil, targetCents: Int, deadline: CalendarDay? = nil) {
            self.name = name
            self.emoji = emoji
            self.targetCents = targetCents
            self.deadline = deadline
        }
    }

    public struct GoalUpdate: Encodable, Sendable {
        public var name: String?
        public var emoji: String?
        public var targetCents: Int?
        public var deadline: CalendarDay?

        public init(name: String? = nil, emoji: String? = nil, targetCents: Int? = nil, deadline: CalendarDay? = nil) {
            self.name = name
            self.emoji = emoji
            self.targetCents = targetCents
            self.deadline = deadline
        }
    }
}
