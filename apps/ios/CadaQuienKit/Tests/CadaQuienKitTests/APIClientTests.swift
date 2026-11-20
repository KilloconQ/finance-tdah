import Foundation
import Testing

@testable import CadaQuienKit

extension NetworkedTests {
  @Suite struct APIClientTests {
    private let tokens = InMemoryTokenStore(token: "tok-123")

    private func makeClient() -> APIClient {
      APIClient(environment: .localhost, tokens: tokens, session: StubURLProtocol.session())
    }

    private struct Pong: Decodable, Equatable { let ok: Bool }

    @Test func sendsTheBearerTokenToTheRightURL() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(json: #"{"ok":true}"#)
      let pong: Pong = try await makeClient().get(
        "/api/ping", query: [URLQueryItem(name: "limit", value: "5")])

      #expect(pong == Pong(ok: true))
      let request = try #require(StubURLProtocol.lastRequest)
      #expect(request.url?.absoluteString == "http://localhost:3001/api/ping?limit=5")
      #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer tok-123")
    }

    @Test func theDefaultSessionNeverStoresOrSendsCookies() {
        let configuration = APIClient.defaultSession.configuration
        #expect(configuration.httpShouldSetCookies == false)
        #expect(configuration.httpCookieAcceptPolicy == .never)
        #expect(configuration.httpCookieStorage == nil)
    }

    @Test func omitsTheAuthorizationHeaderWithoutAToken() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(json: #"{"ok":true}"#)
      let client = APIClient(
        environment: .localhost, tokens: InMemoryTokenStore(), session: StubURLProtocol.session())
      let _: Pong = try await client.get("/api/ping")
      #expect(StubURLProtocol.lastRequest?.value(forHTTPHeaderField: "Authorization") == nil)
    }

    @Test func encodesTheBodyAsJSON() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(json: #"{"ok":true}"#)
      let _: Pong = try await makeClient().post("/api/ping", body: ["name": "Café"])

      #expect(StubURLProtocol.lastRequest?.httpMethod == "POST")
      #expect(
        StubURLProtocol.lastRequest?.value(forHTTPHeaderField: "Content-Type") == "application/json"
      )
      let body = try #require(StubURLProtocol.lastBody)
      #expect(try JSONDecoder().decode([String: String].self, from: body) == ["name": "Café"])
    }

    @Test func mapsA401ToUnauthorized() async {
      StubURLProtocol.handler = StubURLProtocol.reply(401, json: #"{"error":"No autenticado"}"#)
      await #expect(throws: APIError.unauthorized) {
        let _: Pong = try await makeClient().get("/api/ping")
      }
    }

    @Test func surfacesTheSpanishErrorMessage() async {
      StubURLProtocol.handler = StubURLProtocol.reply(
        422, json: #"{"error":"Esa cajita está bloqueada"}"#)
      await #expect(throws: APIError.server(status: 422, message: "Esa cajita está bloqueada")) {
        let _: Pong = try await makeClient().get("/api/ping")
      }
    }

    @Test func readsBetterAuthStyleErrors() async {
      StubURLProtocol.handler = StubURLProtocol.reply(
        403, json: #"{"message":"El registro es solo por invitación."}"#)
      await #expect(
        throws: APIError.server(status: 403, message: "El registro es solo por invitación.")
      ) {
        let _: Pong = try await makeClient().get("/api/ping")
      }
    }

    @Test func fallsBackToAGenericMessage() async {
      StubURLProtocol.handler = StubURLProtocol.reply(500, json: "<html>")
      await #expect(throws: APIError.server(status: 500, message: "Algo salió mal (500).")) {
        let _: Pong = try await makeClient().get("/api/ping")
      }
    }

    @Test func mapsConnectivityFailuresToOffline() async {
      StubURLProtocol.handler = { _ in throw URLError(.notConnectedToInternet) }
      await #expect(throws: APIError.offline) {
        let _: Pong = try await makeClient().get("/api/ping")
      }
    }

    @Test func rejectsAShapeTheContractDoesNotPromise() async {
      StubURLProtocol.handler = StubURLProtocol.reply(json: #"{"unexpected":1}"#)
      await #expect(throws: APIError.invalidResponse) {
        let _: Pong = try await makeClient().get("/api/ping")
      }
    }
  }
}
