public struct GroupMember: Codable, Sendable, Hashable, Identifiable {
    public let userId: String
    public let name: String
    public let email: String

    public var id: String { userId }
}
