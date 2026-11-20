import Foundation
import Security

/// Keeps the session token in the Keychain. Pass the shared access group so the widget can read it too.
public struct KeychainTokenStore: TokenStore {
    private let service: String
    private let accessGroup: String?

    public init(service: String = "app.cadaquien.session", accessGroup: String? = nil) {
        self.service = service
        self.accessGroup = accessGroup
    }

    private var identity: [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "token",
        ]
        if let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
        return query
    }

    public func token() -> String? {
        var query = identity
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    public func save(_ token: String) {
        clear()
        var query = identity
        query[kSecValueData as String] = Data(token.utf8)
        // Readable after the first unlock so the widget works with the phone locked.
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(query as CFDictionary, nil)
    }

    public func clear() {
        SecItemDelete(identity as CFDictionary)
    }
}
