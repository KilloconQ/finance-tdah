import Foundation
import Testing

@testable import CadaQuienKit

struct EntityIDTests {
  @Test func encodesLowercaseBecauseTheAPICompareIdsAsText() throws {
    let data = try JSONEncoder().encode(["id": EntityID("0B4D5C7E-1C0F-4B8E-9A0E-6F9D2C1A7E11")])
    #expect(String(decoding: data, as: UTF8.self) == #"{"id":"0b4d5c7e-1c0f-4b8e-9a0e-6f9d2c1a7e11"}"#)
  }

  @Test func decodesTheSameIdWhateverTheCase() throws {
    let lower = try JSONDecoder().decode(EntityID.self, from: Data(#""abc-1""#.utf8))
    let upper = try JSONDecoder().decode(EntityID.self, from: Data(#""ABC-1""#.utf8))
    #expect(lower == upper)
  }

  @Test func staysLowercaseInsideARequestBody() throws {
    let input = EnvelopesService.NewEnvelope(accountId: "ABC-DEF", name: "Comida")
    let json = try JSONSerialization.jsonObject(with: JSONCoding.makeEncoder().encode(input)) as? [String: Any]
    #expect(json?["accountId"] as? String == "abc-def")
  }
}
