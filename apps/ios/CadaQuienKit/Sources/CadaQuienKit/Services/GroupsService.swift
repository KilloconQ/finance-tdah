import Foundation

public struct GroupsService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func list() async throws -> [ExpenseGroup] {
        try await client.get("/api/groups", key: "groups")
    }

    public func create(name: String) async throws -> ExpenseGroup {
        try await client.post("/api/groups", key: "group", body: ["name": name])
    }

    public func detail(_ id: EntityID) async throws -> GroupDetail {
        try await client.get("/api/groups/\(id.rawValue)")
    }

    /// Invites by email; the invitee accepts or declines from their own app.
    public func invite(to groupId: EntityID, email: String) async throws {
        try await client.send(.post, "/api/groups/\(groupId.rawValue)/invitations", body: ["email": email])
    }

    public func leave(_ groupId: EntityID) async throws {
        try await client.send(.delete, "/api/groups/\(groupId.rawValue)/members/me")
    }

    public func addExpense(to groupId: EntityID, _ input: SharedExpenseInput) async throws -> SharedExpense {
        try await client.post("/api/groups/\(groupId.rawValue)/expenses", key: "expense", body: input)
    }

    public func updateExpense(in groupId: EntityID, _ expenseId: EntityID, _ input: SharedExpenseInput) async throws -> SharedExpense {
        try await client.put("/api/groups/\(groupId.rawValue)/expenses/\(expenseId.rawValue)", key: "expense", body: input)
    }

    public func deleteExpense(in groupId: EntityID, _ expenseId: EntityID) async throws {
        try await client.send(.delete, "/api/groups/\(groupId.rawValue)/expenses/\(expenseId.rawValue)")
    }

    public func settle(in groupId: EntityID, _ input: SettlementInput) async throws -> Settlement {
        try await client.post("/api/groups/\(groupId.rawValue)/settlements", key: "settlement", body: input)
    }

    /// Omit `splits` to divide equally among `participantIds`; send `splits` for custom amounts that add up to the total.
    public struct SharedExpenseInput: Encodable, Sendable {
        public var paidBy: String
        public var description: String
        public var amountCents: Int
        public var date: CalendarDay
        public var participantIds: [String]?
        public var splits: [ExpenseShare]?

        public init(
            paidBy: String, description: String, amountCents: Int, date: CalendarDay,
            participantIds: [String]? = nil, splits: [ExpenseShare]? = nil
        ) {
            self.paidBy = paidBy
            self.description = description
            self.amountCents = amountCents
            self.date = date
            self.participantIds = participantIds
            self.splits = splits
        }
    }

    public struct SettlementInput: Encodable, Sendable {
        public var fromUserId: String
        public var toUserId: String
        public var amountCents: Int
        public var date: CalendarDay

        public init(fromUserId: String, toUserId: String, amountCents: Int, date: CalendarDay) {
            self.fromUserId = fromUserId
            self.toUserId = toUserId
            self.amountCents = amountCents
            self.date = date
        }
    }
}
