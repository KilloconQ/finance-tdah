import CadaQuienKit
import Foundation

/// The API client for code that runs outside the app's UI: the widget and Siri/Shortcuts intents.
/// The session token lives in the Keychain access group both the app and the widget declare, so signing in once
/// in the app is enough.
enum SharedClient {
    static func tokens() -> any TokenStore {
        KeychainTokenStore()
    }

    static func make() -> APIClient {
        APIClient(environment: .fromBundle(), tokens: tokens())
    }

    static var isSignedIn: Bool {
        tokens().token() != nil
    }
}
