import Foundation

/// Thin JSON client for the Cada Quien API: bearer auth, `{error}` mapping, ISO dates.
public struct APIClient: Sendable {
    public let environment: APIEnvironment
    let tokens: any TokenStore
    private let session: URLSession

    /// Bearer-only: no cookie is stored or sent. better-auth also sets a session cookie on sign-in, and
    /// with one present it demands an `Origin` header on every POST, which breaks sign-out and the next sign-in.
    public static let defaultSession: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.httpShouldSetCookies = false
        configuration.httpCookieAcceptPolicy = .never
        configuration.httpCookieStorage = nil
        return URLSession(configuration: configuration)
    }()

    public init(environment: APIEnvironment, tokens: any TokenStore, session: URLSession = APIClient.defaultSession) {
        self.environment = environment
        self.tokens = tokens
        self.session = session
    }

    // MARK: Typed helpers

    /// `key` names the top-level field to read (`{"accounts": [...]}` -> "accounts"); nil decodes the whole body.
    public func get<Response: Decodable>(_ path: String, key: String? = nil, query: [URLQueryItem] = []) async throws -> Response {
        try decode(try await perform(.get, path, query: query).data, key: key)
    }

    public func post<Response: Decodable>(_ path: String, key: String? = nil, body: some Encodable) async throws -> Response {
        try decode(try await perform(.post, path, body: body).data, key: key)
    }

    public func post<Response: Decodable>(_ path: String, key: String? = nil) async throws -> Response {
        try decode(try await perform(.post, path, body: Optional<Never>.none).data, key: key)
    }

    public func patch<Response: Decodable>(_ path: String, key: String? = nil, body: some Encodable) async throws -> Response {
        try decode(try await perform(.patch, path, body: body).data, key: key)
    }

    public func put<Response: Decodable>(_ path: String, key: String? = nil, body: some Encodable) async throws -> Response {
        try decode(try await perform(.put, path, body: body).data, key: key)
    }

    /// For endpoints that answer `{ok: true}` and carry no data worth reading.
    public func send(_ method: Method, _ path: String, body: (some Encodable)? = Optional<Never>.none) async throws {
        _ = try await perform(method.http, path, body: body)
    }

    public enum Method: Sendable {
        case post, put, patch, delete
        var http: HTTPMethod {
            switch self {
            case .post: .post
            case .put: .put
            case .patch: .patch
            case .delete: .delete
            }
        }
    }

    // MARK: Core

    func perform(
        _ method: HTTPMethod,
        _ path: String,
        query: [URLQueryItem] = [],
        body: (some Encodable)? = Optional<Never>.none
    ) async throws -> (data: Data, response: HTTPURLResponse) {
        var components = URLComponents(url: environment.baseURL.appending(path: path), resolvingAgainstBaseURL: false)
        if !query.isEmpty { components?.queryItems = query }
        guard let url = components?.url else { throw APIError.invalidResponse }

        var request = URLRequest(url: url, timeoutInterval: 20)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        // The API keeps onboarding per platform.
        request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        if let token = tokens.token() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONCoding.makeEncoder().encode(body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError where error.code == .cancelled {
            // The caller went away (a screen closed mid-request): that is not a failure to report.
            throw CancellationError()
        } catch let error as URLError where Self.offlineCodes.contains(error.code) {
            throw APIError.offline
        }
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }

        switch http.statusCode {
        case 200..<300: return (data, http)
        case 401: throw APIError.unauthorized
        default: throw APIError.server(status: http.statusCode, message: Self.message(in: data, status: http.statusCode))
        }
    }

    private func decode<Response: Decodable>(_ data: Data, key: String?) throws -> Response {
        do {
            let decoder = JSONCoding.makeDecoder()
            guard let key else { return try decoder.decode(Response.self, from: data) }
            decoder.userInfo[KeyedResponse<Response>.keyInfo] = key
            return try decoder.decode(KeyedResponse<Response>.self, from: data).value
        } catch {
            throw APIError.invalidResponse
        }
    }

    private static let offlineCodes: Set<URLError.Code> = [
        .notConnectedToInternet, .networkConnectionLost, .cannotConnectToHost, .cannotFindHost, .timedOut, .dnsLookupFailed,
    ]

    /// Our routes answer `{error}` (already Spanish); better-auth answers `{code, message}` in English, so those are
    /// translated. Mirrors `apps/web/src/lib/auth-errors.ts`.
    static func message(in data: Data, status: Int) -> String {
        struct Body: Decodable {
            let error: String?
            let message: String?
            let code: String?
        }
        let body = try? JSONDecoder().decode(Body.self, from: data)
        if status == 429 { return APIMessages.rateLimited }
        if let code = body?.code, let known = APIMessages.byCode[code] { return known }
        if let error = body?.error { return error }
        if let message = body?.message { return APIMessages.translate(message) }
        if status >= 500 { return APIMessages.serverTrouble }
        return "Algo salió mal (\(status))."
    }
}
