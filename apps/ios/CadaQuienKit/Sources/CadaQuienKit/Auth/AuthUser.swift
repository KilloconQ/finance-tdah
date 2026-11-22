public struct AuthUser: Codable, Sendable, Hashable, Identifiable {
    public let id: String
    public let email: String
    public let name: String
}
