import Foundation

public struct SubscriptionsService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func list() async throws -> [Subscription] {
        try await client.get("/api/subscriptions", key: "subscriptions")
    }

    public func create(_ input: NewSubscription) async throws -> Subscription {
        try await client.post("/api/subscriptions", key: "subscription", body: input)
    }

    public func update(_ id: EntityID, _ input: SubscriptionUpdate) async throws -> Subscription {
        try await client.patch("/api/subscriptions/\(id.rawValue)", key: "subscription", body: input)
    }

    public func cancel(_ id: EntityID) async throws -> Subscription {
        try await client.post("/api/subscriptions/\(id.rawValue)/cancel", key: "subscription")
    }

    public func pause(_ id: EntityID) async throws -> Subscription {
        try await client.post("/api/subscriptions/\(id.rawValue)/pause", key: "subscription")
    }

    public struct NewSubscription: Encodable, Sendable {
        public var name: String
        public var category: String
        public var amountCents: Int
        public var cadence: SubscriptionCadence?
        public var nextChargeAt: CalendarDay
        public var lastOpenedAt: CalendarDay?

        public init(
            name: String, category: String, amountCents: Int, cadence: SubscriptionCadence? = nil,
            nextChargeAt: CalendarDay, lastOpenedAt: CalendarDay? = nil
        ) {
            self.name = name
            self.category = category
            self.amountCents = amountCents
            self.cadence = cadence
            self.nextChargeAt = nextChargeAt
            self.lastOpenedAt = lastOpenedAt
        }
    }

    public struct SubscriptionUpdate: Encodable, Sendable {
        public var name: String?
        public var category: String?
        public var amountCents: Int?
        public var cadence: SubscriptionCadence?
        public var nextChargeAt: CalendarDay?
        public var lastOpenedAt: CalendarDay?

        public init(
            name: String? = nil, category: String? = nil, amountCents: Int? = nil,
            cadence: SubscriptionCadence? = nil, nextChargeAt: CalendarDay? = nil, lastOpenedAt: CalendarDay? = nil
        ) {
            self.name = name
            self.category = category
            self.amountCents = amountCents
            self.cadence = cadence
            self.nextChargeAt = nextChargeAt
            self.lastOpenedAt = lastOpenedAt
        }
    }
}
