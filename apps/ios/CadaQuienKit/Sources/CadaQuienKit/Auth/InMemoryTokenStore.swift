import os

/// Token storage for tests and previews.
public final class InMemoryTokenStore: TokenStore {
    private let value = OSAllocatedUnfairLock<String?>(initialState: nil)

    public init(token: String? = nil) {
        value.withLock { $0 = token }
    }

    public func token() -> String? { value.withLock { $0 } }
    public func save(_ token: String) { value.withLock { $0 = token } }
    public func clear() { value.withLock { $0 = nil } }
}
