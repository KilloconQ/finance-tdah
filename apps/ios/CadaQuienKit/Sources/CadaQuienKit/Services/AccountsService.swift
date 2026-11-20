import Foundation

public struct AccountsService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func list() async throws -> [Account] {
        try await client.get("/api/accounts", key: "accounts")
    }

    public func create(_ input: NewAccount) async throws -> Account {
        try await client.post("/api/accounts", key: "account", body: input)
    }

    public func update(_ id: EntityID, _ input: AccountUpdate) async throws -> Account {
        try await client.patch("/api/accounts/\(id.rawValue)", key: "account", body: input)
    }

    public func delete(_ id: EntityID) async throws {
        try await client.send(.delete, "/api/accounts/\(id.rawValue)")
    }

    public func statement(_ id: EntityID) async throws -> CardStatement {
        try await client.get("/api/accounts/\(id.rawValue)/statement", key: "statement")
    }

    public struct NewAccount: Encodable, Sendable {
        public var name: String
        public var type: AccountType
        public var balanceCents: Int?
        public var institution: String?
        public var last4: String?
        public var cutoffDay: Int?
        public var paymentDay: Int?

        public init(
            name: String, type: AccountType, balanceCents: Int? = nil, institution: String? = nil,
            last4: String? = nil, cutoffDay: Int? = nil, paymentDay: Int? = nil
        ) {
            self.name = name
            self.type = type
            self.balanceCents = balanceCents
            self.institution = institution
            self.last4 = last4
            self.cutoffDay = cutoffDay
            self.paymentDay = paymentDay
        }
    }

    /// Only the fields you set are sent; the rest of the account stays as it is.
    public struct AccountUpdate: Encodable, Sendable {
        public var name: String?
        public var type: AccountType?
        public var balanceCents: Int?
        public var institution: String?
        public var last4: String?
        public var cutoffDay: Clearable<Int>?
        public var paymentDay: Clearable<Int>?

        public init(
            name: String? = nil, type: AccountType? = nil, balanceCents: Int? = nil, institution: String? = nil,
            last4: String? = nil, cutoffDay: Clearable<Int>? = nil, paymentDay: Clearable<Int>? = nil
        ) {
            self.name = name
            self.type = type
            self.balanceCents = balanceCents
            self.institution = institution
            self.last4 = last4
            self.cutoffDay = cutoffDay
            self.paymentDay = paymentDay
        }
    }
}
