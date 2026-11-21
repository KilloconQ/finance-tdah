import Foundation

/// Talks to better-auth (`/api/auth/*`). Sign-in and sign-up answer with the session token in the
/// `set-auth-token` header (bearer plugin); it goes to the token store and every later request carries it.
public struct AuthService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func signIn(email: String, password: String) async throws {
        do {
            let result = try await client.perform(.post, "/api/auth/sign-in/email", body: ["email": email, "password": password])
            try storeToken(from: result.response)
        } catch APIError.unauthorized {
            // A 401 while signing in means wrong credentials, not an expired session.
            throw APIError.server(status: 401, message: APIMessages.wrongCredentials)
        }
    }

    public func signUp(email: String, password: String, name: String) async throws {
        let result = try await client.perform(
            .post, "/api/auth/sign-up/email", body: ["email": email, "password": password, "name": name]
        )
        try storeToken(from: result.response)
    }

    /// Clears the local token even if the server can't be reached: the user asked to leave.
    public func signOut() async {
        _ = try? await client.perform(.post, "/api/auth/sign-out", body: [String: String]())
        client.tokens.clear()
    }

    /// The signed-in user, or nil when there is no session. A dead token is dropped.
    public func currentUser() async throws -> AuthUser? {
        guard client.tokens.token() != nil else { return nil }
        do {
            let session: SessionResponse? = try await client.get("/api/auth/get-session")
            if session == nil { client.tokens.clear() }
            return session?.user
        } catch APIError.unauthorized {
            client.tokens.clear()
            return nil
        }
    }

    /// `redirectTo` is where the emailed link lands; it must be an origin the API trusts.
    public func requestPasswordReset(email: String, redirectTo: String) async throws {
        _ = try await client.perform(
            .post, "/api/auth/request-password-reset", body: ["email": email, "redirectTo": redirectTo]
        )
    }

    public func resetPassword(newPassword: String, token: String) async throws {
        _ = try await client.perform(.post, "/api/auth/reset-password", body: ["newPassword": newPassword, "token": token])
    }

    private func storeToken(from response: HTTPURLResponse) throws {
        guard let token = response.value(forHTTPHeaderField: "set-auth-token"), !token.isEmpty else {
            throw APIError.invalidResponse
        }
        client.tokens.save(token)
    }

    private struct SessionResponse: Decodable {
        let user: AuthUser
    }
}
