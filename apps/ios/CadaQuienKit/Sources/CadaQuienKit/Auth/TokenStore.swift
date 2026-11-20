/// Where the session token lives. The app and the widget share one through the Keychain access group.
public protocol TokenStore: Sendable {
    func token() -> String?
    func save(_ token: String)
    func clear()
}
