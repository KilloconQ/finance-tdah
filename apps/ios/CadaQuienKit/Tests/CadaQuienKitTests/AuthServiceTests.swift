import Foundation
import Testing

@testable import CadaQuienKit

extension NetworkedTests {
  @Suite struct AuthServiceTests {
    private func makeService(tokens: InMemoryTokenStore) -> AuthService {
      AuthService(
        client: APIClient(
          environment: .localhost, tokens: tokens, session: StubURLProtocol.session()))
    }

    @Test func signInStoresTheTokenFromTheHeader() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(headers: ["set-auth-token": "abc.def"])
      let tokens = InMemoryTokenStore()
      try await makeService(tokens: tokens).signIn(email: "a@b.co", password: "correct-horse")

      #expect(tokens.token() == "abc.def")
      #expect(StubURLProtocol.lastRequest?.url?.path() == "/api/auth/sign-in/email")
      let body = try #require(StubURLProtocol.lastBody)
      #expect(
        try JSONDecoder().decode([String: String].self, from: body) == [
          "email": "a@b.co", "password": "correct-horse",
        ])
    }

    @Test func signInFailsWhenTheServerSendsNoToken() async {
      StubURLProtocol.handler = StubURLProtocol.reply()
      let tokens = InMemoryTokenStore()
      await #expect(throws: APIError.invalidResponse) {
        try await makeService(tokens: tokens).signIn(email: "a@b.co", password: "correct-horse")
      }
      #expect(tokens.token() == nil)
    }

    @Test func signInSurfacesTheServerMessage() async {
      StubURLProtocol.handler = StubURLProtocol.reply(
        401, json: #"{"message":"Invalid email or password"}"#)
      await #expect(throws: APIError.server(status: 401, message: "Correo o contraseña incorrectos.")) {
        try await makeService(tokens: InMemoryTokenStore()).signIn(email: "a@b.co", password: "x")
      }
    }

    @Test func signUpStoresTheTokenToo() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(headers: ["set-auth-token": "new-token"])
      let tokens = InMemoryTokenStore()
      try await makeService(tokens: tokens).signUp(
        email: "a@b.co", password: "correct-horse", name: "Ana")
      #expect(tokens.token() == "new-token")
    }

    @Test func currentUserReadsTheSession() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(
        json:
          #"{"session":{"id":"s"},"user":{"id":"u1","email":"a@b.co","name":"Ana","emailVerified":false}}"#
      )
      let user = try await makeService(tokens: InMemoryTokenStore(token: "t")).currentUser()
      #expect(user == AuthUser(id: "u1", email: "a@b.co", name: "Ana"))
    }

    @Test func currentUserWithoutATokenDoesNotHitTheNetwork() async throws {
      StubURLProtocol.lastRequest = nil
      StubURLProtocol.handler = StubURLProtocol.reply()
      let user = try await makeService(tokens: InMemoryTokenStore()).currentUser()
      #expect(user == nil)
      #expect(StubURLProtocol.lastRequest == nil)
    }

    @Test func currentUserDropsATokenTheServerRejects() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(401)
      let tokens = InMemoryTokenStore(token: "dead")
      #expect(try await makeService(tokens: tokens).currentUser() == nil)
      #expect(tokens.token() == nil)
    }

    @Test func currentUserDropsATokenWhenTheSessionIsNull() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(json: "null")
      let tokens = InMemoryTokenStore(token: "expired")
      #expect(try await makeService(tokens: tokens).currentUser() == nil)
      #expect(tokens.token() == nil)
    }

    @Test func currentUserKeepsTheTokenWhenOffline() async {
      StubURLProtocol.handler = { _ in throw URLError(.notConnectedToInternet) }
      let tokens = InMemoryTokenStore(token: "still-good")
      await #expect(throws: APIError.offline) {
        _ = try await makeService(tokens: tokens).currentUser()
      }
      #expect(tokens.token() == "still-good")
    }

    @Test func signOutClearsTheTokenEvenWhenTheServerIsUnreachable() async {
      StubURLProtocol.handler = { _ in throw URLError(.notConnectedToInternet) }
      let tokens = InMemoryTokenStore(token: "t")
      await makeService(tokens: tokens).signOut()
      #expect(tokens.token() == nil)
    }
  }
}
