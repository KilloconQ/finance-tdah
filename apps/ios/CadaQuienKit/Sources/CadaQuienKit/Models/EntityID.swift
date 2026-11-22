/// An id issued by the API. Always lowercase: Swift's `UUID` encodes uppercase, and the API compares ids as text
/// (an expense in an envelope was rejected as "de otra cuenta" because `…A1B2…` != `…a1b2…`).
public struct EntityID: Hashable, Sendable, Codable, CustomStringConvertible, ExpressibleByStringLiteral {
    public let rawValue: String

    public init(_ rawValue: String) {
        self.rawValue = rawValue.lowercased()
    }

    public init(stringLiteral value: String) {
        self.init(value)
    }

    public init(from decoder: any Decoder) throws {
        self.init(try decoder.singleValueContainer().decode(String.self))
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }

    public var description: String { rawValue }
}
