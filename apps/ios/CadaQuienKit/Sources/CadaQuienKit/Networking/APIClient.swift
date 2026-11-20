import Foundation

/// Thin JSON client for the Cada Quien API: bearer auth, `{error}` mapping, ISO dates.
public struct APIClient: Sendable {
    public let environment: APIEnvironment
    let tokens: any TokenStore
    private let session: URLSession

    public init(environment: APIEnvironment, tokens: any TokenStore, session: URLSession = .shared) {
        self.environment = environment
        self.tokens = tokens
        self.session = session
    }

    // MARK: Typed helpers

    public func get<Response: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> Response {
        try decode(try await perform(.get, path, query: query).data)
    }

    public func post<Response: Decodable>(_ path: String, body: some Encodable) async throws -> Response {
        try decode(try await perform(.post, path, body: body).data)
    }

    public func patch<Response: Decodable>(_ path: String, body: some Encodable) async throws -> Response {
        try decode(try await perform(.patch, path, body: body).data)
    }

    public func put<Response: Decodable>(_ path: String, body: some Encodable) async throws -> Response {
        try decode(try await perform(.put, path, body: body).data)
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

    private func decode<Response: Decodable>(_ data: Data) throws -> Response {
        do {
            return try JSONCoding.makeDecoder().decode(Response.self, from: data)
        } catch {
            throw APIError.invalidResponse
        }
    }

    private static let offlineCodes: Set<URLError.Code> = [
        .notConnectedToInternet, .networkConnectionLost, .cannotConnectToHost, .cannotFindHost, .timedOut, .dnsLookupFailed,
    ]

    /// Our routes answer `{error}`; better-auth answers `{message}`.
    private static func message(in data: Data, status: Int) -> String {
        struct Body: Decodable {
            let error: String?
            let message: String?
        }
        let body = try? JSONDecoder().decode(Body.self, from: data)
        return body?.error ?? body?.message ?? "Algo salió mal (\(status))."
    }
}
