/// A PATCH field that can be set or explicitly cleared. Use it as `Clearable<T>?`: nil leaves the stored value alone
/// (the key is omitted), `.clear` sends `null`, `.set` sends the value.
public enum Clearable<Value: Encodable & Sendable>: Encodable, Sendable {
    case set(Value)
    case clear

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .set(let value): try container.encode(value)
        case .clear: try container.encodeNil()
        }
    }
}
