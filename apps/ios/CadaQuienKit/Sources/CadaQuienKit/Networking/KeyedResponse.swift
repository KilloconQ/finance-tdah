import Foundation

/// Reads one named key out of a response like `{"accounts": [...]}`. A renamed key fails loudly
/// instead of decoding the wrong thing.
struct KeyedResponse<Value: Decodable>: Decodable {
    static var keyInfo: CodingUserInfoKey { CodingUserInfoKey(rawValue: "cadaquien.responseKey")! }

    let value: Value

    init(from decoder: any Decoder) throws {
        guard let key = decoder.userInfo[Self.keyInfo] as? String else { throw APIError.invalidResponse }
        let container = try decoder.container(keyedBy: DynamicKey.self)
        value = try container.decode(Value.self, forKey: DynamicKey(key))
    }

    private struct DynamicKey: CodingKey {
        let stringValue: String
        var intValue: Int? { nil }
        init(_ string: String) { stringValue = string }
        init?(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { nil }
    }
}
