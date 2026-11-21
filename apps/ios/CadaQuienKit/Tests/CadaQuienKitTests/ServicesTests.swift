import Foundation
import Testing

@testable import CadaQuienKit

extension NetworkedTests {
  /// Paths, keys and bodies the services send and read; the real API checks them in `APIContractTests`.
  @Suite struct ServicesTests {
    private let id = EntityID("0B4D5C7E-1C0F-4B8E-9A0E-6F9D2C1A7E11")
    private let lower = "0b4d5c7e-1c0f-4b8e-9a0e-6f9d2c1a7e11"

    private func client() -> APIClient {
      APIClient(
        environment: .localhost, tokens: InMemoryTokenStore(token: "t"), session: StubURLProtocol.session())
    }

    private func sentJSON() throws -> [String: Any] {
      let body = try #require(StubURLProtocol.lastBody)
      return try #require(try JSONSerialization.jsonObject(with: body) as? [String: Any])
    }

    @Test func idsGoInThePathInLowercase() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(204)
      try await AccountsService(client: client()).delete(id)
      #expect(StubURLProtocol.lastRequest?.httpMethod == "DELETE")
      #expect(StubURLProtocol.lastRequest?.url?.path() == "/api/accounts/\(lower)")
    }

    @Test func aPatchOnlySendsTheFieldsYouSet() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(
        json: """
          {"account":{"id":"\(lower)","userId":"u","name":"Nuevo","type":"debito","institution":null,"last4":null,
          "cutoffDay":null,"paymentDay":null,"balanceCents":0,"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}}
          """)
      let account = try await AccountsService(client: client()).update(id, .init(name: "Nuevo"))
      #expect(account.name == "Nuevo")
      #expect(StubURLProtocol.lastRequest?.httpMethod == "PATCH")
      #expect(try sentJSON().keys.sorted() == ["name"])
    }

    @Test func clearableSendsAnExplicitNullOnlyWhenAsked() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(json: "{}")
      _ = try? await ExpensesService(client: client()).update(id, .init(envelopeId: .clear))
      let json = try sentJSON()
      #expect(json.keys.sorted() == ["envelopeId"])
      #expect(json["envelopeId"] is NSNull)

      _ = try? await ExpensesService(client: client()).update(id, .init(envelopeId: .set(id)))
      #expect(try sentJSON()["envelopeId"] as? String == id.rawValue)
    }

    @Test func newExpenseOmitsWhatYouDidNotSet() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(201, json: "{}")
      _ = try? await ExpensesService(client: client()).create(.init(amountCents: 1500, category: "comida", description: "Tacos"))
      let json = try sentJSON()
      #expect(json.keys.sorted() == ["amountCents", "category", "description", "kind"])
      #expect(json["kind"] as? String == "expense")
    }

    @Test func listsReadTheirNamedKey() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(json: #"{"goals":[]}"#)
      #expect(try await GoalsService(client: client()).list().isEmpty)
    }

    @Test func aRenamedKeyIsAnErrorNotAnEmptyList() async {
      StubURLProtocol.handler = StubURLProtocol.reply(json: #"{"items":[]}"#)
      await #expect(throws: APIError.invalidResponse) {
        _ = try await GoalsService(client: client()).list()
      }
    }

    @Test func noActiveChallengeIsNilNotAnError() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(json: #"{"challenge":null}"#)
      #expect(try await ChallengesService(client: client()).active() == nil)
    }

    @Test func noProfileYetIsNil() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(json: #"{"profile":null}"#)
      #expect(try await ProfileService(client: client()).get() == nil)
    }

    @Test func acceptingAnInvitationReturnsTheGroupId() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(json: #"{"groupId":"\#(lower)"}"#)
      #expect(try await InvitationsService(client: client()).accept(id) == id)
      #expect(StubURLProtocol.lastRequest?.url?.path() == "/api/invitations/\(lower)/accept")
    }

    @Test func equalSplitSendsParticipantsAndNoSplits() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(201, json: "{}")
      let input = GroupsService.SharedExpenseInput(
        paidBy: "u1", description: "Super", amountCents: 9000, date: CalendarDay(year: 2026, month: 11, day: 20),
        participantIds: ["u1", "u2"])
      _ = try? await GroupsService(client: client()).addExpense(to: id, input)
      let json = try sentJSON()
      #expect(json["splits"] == nil)
      #expect(json["participantIds"] as? [String] == ["u1", "u2"])
      #expect(json["date"] as? String == "2026-11-20")
    }
  }
}

extension NetworkedTests {
  @Suite struct PushServiceTests {
    private func service() -> PushService {
      PushService(
        client: APIClient(environment: .localhost, tokens: InMemoryTokenStore(token: "t"), session: StubURLProtocol.session()))
    }

    private func sentJSON() throws -> [String: Any] {
      let body = try #require(StubURLProtocol.lastBody)
      return try #require(try JSONSerialization.jsonObject(with: body) as? [String: Any])
    }

    @Test func registersTheTokenWithItsEnvironment() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(201, json: #"{"device":{}}"#)
      try await service().register(token: "ab12", environment: .sandbox)
      #expect(StubURLProtocol.lastRequest?.httpMethod == "POST")
      #expect(StubURLProtocol.lastRequest?.url?.path() == "/api/push/device")
      let json = try sentJSON()
      #expect(json["token"] as? String == "ab12")
      #expect(json["environment"] as? String == "sandbox")
    }

    @Test func unregisteringSendsTheTokenInTheBody() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(json: #"{"ok":true}"#)
      try await service().unregister(token: "ab12")
      #expect(StubURLProtocol.lastRequest?.httpMethod == "DELETE")
      #expect(try sentJSON()["token"] as? String == "ab12")
    }

    @Test func unregisteringADeviceTheServerDoesNotKnowIsFine() async throws {
      StubURLProtocol.handler = StubURLProtocol.reply(404, json: #"{"error":"Dispositivo no encontrado"}"#)
      try await service().unregister(token: "ab12")
    }

    @Test func aServerWithoutNotificationsSaysSo() async {
      StubURLProtocol.handler = StubURLProtocol.reply(503, json: #"{"error":"Las notificaciones del iPhone no están configuradas en el servidor."}"#)
      await #expect(throws: APIError.server(status: 503, message: "Las notificaciones del iPhone no están configuradas en el servidor.")) {
        try await service().register(token: "ab12", environment: .production)
      }
    }
  }
}

struct DeviceTokenTests {
  @Test func tokensAreLowercaseHex() {
    #expect(DeviceToken.hex(Data([0x00, 0xAB, 0x0F, 0xFF])) == "00ab0fff")
    #expect(DeviceToken.hex(Data()) == "")
    #expect(DeviceToken.hex(Data(repeating: 0xAB, count: 32)).count == 64)
  }

  @Test func reminderHoursReadLikeTheWeb() {
    #expect(ReminderHour.label(0) == "12:00 am")
    #expect(ReminderHour.label(1) == "1:00 am")
    #expect(ReminderHour.label(12) == "12:00 pm")
    #expect(ReminderHour.label(21) == "9:00 pm")
    #expect(ReminderHour.label(23) == "11:00 pm")
    #expect(ReminderHour.all.count == 24)
  }
}
