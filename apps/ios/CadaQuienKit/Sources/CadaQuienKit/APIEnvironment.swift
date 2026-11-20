import Foundation

/// Where the API lives. The app reads it from the `APIBaseURL` Info.plist key (set by the `API_BASE_URL` build setting).
public struct APIEnvironment: Sendable, Equatable {
    public let baseURL: URL

    public init(baseURL: URL) {
        self.baseURL = baseURL
    }

    /// Dev API started by `pnpm dev` (the simulator shares the Mac's localhost).
    public static let localhost = APIEnvironment(baseURL: URL(string: "http://localhost:3001")!)

    /// Falls back to localhost when the value is missing, unparsable, or not http(s).
    public static func resolve(infoValue: String?) -> APIEnvironment {
        guard
            let infoValue,
            let url = URL(string: infoValue.trimmingCharacters(in: .whitespaces)),
            let scheme = url.scheme?.lowercased(),
            scheme == "http" || scheme == "https",
            url.host() != nil
        else { return .localhost }
        return APIEnvironment(baseURL: url)
    }

    public static func fromBundle(_ bundle: Bundle = .main) -> APIEnvironment {
        resolve(infoValue: bundle.object(forInfoDictionaryKey: "APIBaseURL") as? String)
    }
}
