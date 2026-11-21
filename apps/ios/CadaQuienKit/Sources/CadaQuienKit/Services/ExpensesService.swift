import Foundation

public struct ExpensesService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func list() async throws -> [Expense] {
        try await client.get("/api/expenses", key: "expenses")
    }

    public func create(_ input: NewExpense) async throws -> Expense {
        try await client.post("/api/expenses", key: "expense", body: input)
    }

    public func update(_ id: EntityID, _ input: ExpenseUpdate) async throws -> Expense {
        try await client.patch("/api/expenses/\(id.rawValue)", key: "expense", body: input)
    }

    public func delete(_ id: EntityID) async throws {
        try await client.send(.delete, "/api/expenses/\(id.rawValue)")
    }

    public struct NewExpense: Encodable, Sendable, Equatable {
        public var kind: ExpenseKind
        public var amountCents: Int
        public var category: String
        public var description: String
        public var accountId: EntityID?
        public var toAccountId: EntityID?
        public var envelopeId: EntityID?
        public var occurredAt: Date?

        public init(
            kind: ExpenseKind = .expense, amountCents: Int, category: String, description: String,
            accountId: EntityID? = nil, toAccountId: EntityID? = nil, envelopeId: EntityID? = nil, occurredAt: Date? = nil
        ) {
            self.kind = kind
            self.amountCents = amountCents
            self.category = category
            self.description = description
            self.accountId = accountId
            self.toAccountId = toAccountId
            self.envelopeId = envelopeId
            self.occurredAt = occurredAt
        }
    }

    /// Only the fields you set are sent. `envelopeId: .clear` takes the expense out of its envelope.
    public struct ExpenseUpdate: Encodable, Sendable {
        public var kind: ExpenseKind?
        public var amountCents: Int?
        public var category: String?
        public var description: String?
        public var accountId: EntityID?
        public var toAccountId: EntityID?
        public var envelopeId: Clearable<EntityID>?
        public var occurredAt: Date?

        public init(
            kind: ExpenseKind? = nil, amountCents: Int? = nil, category: String? = nil, description: String? = nil,
            accountId: EntityID? = nil, toAccountId: EntityID? = nil, envelopeId: Clearable<EntityID>? = nil, occurredAt: Date? = nil
        ) {
            self.kind = kind
            self.amountCents = amountCents
            self.category = category
            self.description = description
            self.accountId = accountId
            self.toAccountId = toAccountId
            self.envelopeId = envelopeId
            self.occurredAt = occurredAt
        }
    }
}
