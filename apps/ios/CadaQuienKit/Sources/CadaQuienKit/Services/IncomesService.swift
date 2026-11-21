import Foundation

public struct IncomesService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func list() async throws -> [ScheduledIncome] {
        try await client.get("/api/incomes", key: "incomes")
    }

    public func create(_ input: NewIncome) async throws -> ScheduledIncome {
        try await client.post("/api/incomes", key: "income", body: input)
    }

    public func update(_ id: EntityID, _ input: IncomeUpdate) async throws -> ScheduledIncome {
        try await client.patch("/api/incomes/\(id.rawValue)", key: "income", body: input)
    }

    public func delete(_ id: EntityID) async throws {
        try await client.send(.delete, "/api/incomes/\(id.rawValue)")
    }

    public struct NewIncome: Encodable, Sendable, Equatable {
        public var name: String
        public var amountCents: Int?
        public var frequency: IncomeFrequency
        public var startsOn: CalendarDay

        public init(name: String, amountCents: Int? = nil, frequency: IncomeFrequency, startsOn: CalendarDay) {
            self.name = name
            self.amountCents = amountCents
            self.frequency = frequency
            self.startsOn = startsOn
        }
    }

    public struct IncomeUpdate: Encodable, Sendable {
        public var name: String?
        /// `.clear` sends a real null, which removes the amount.
        public var amountCents: Clearable<Int>?
        public var frequency: IncomeFrequency?
        public var startsOn: CalendarDay?

        public init(name: String? = nil, amountCents: Clearable<Int>? = nil, frequency: IncomeFrequency? = nil, startsOn: CalendarDay? = nil) {
            self.name = name
            self.amountCents = amountCents
            self.frequency = frequency
            self.startsOn = startsOn
        }
    }
}
