import Foundation
import Testing
@testable import CadaQuienKit

struct JSONCodingTests {
    @Test(arguments: [
        ("2026-11-20T14:21:55.123Z", 1_795_184_515.123),
        ("2026-11-20T14:21:55Z", 1_795_184_515),
        ("2026-11-20T16:21:55.123+02:00", 1_795_184_515.123),
    ])
    func parsesISODatesWithAndWithoutFractionAndOffset(string: String, expected: Double) throws {
        let date = try #require(JSONCoding.parse(string))
        #expect(abs(date.timeIntervalSince1970 - expected) < 0.001)
    }

    @Test func rejectsGarbageDates() {
        #expect(JSONCoding.parse("yesterday") == nil)
        #expect(JSONCoding.parse("2026-11-20") == nil)
    }

    @Test func encodesDatesTheWayTheAPIValidates() throws {
        let date = try #require(JSONCoding.parse("2026-11-20T14:21:55.123Z"))
        let data = try JSONCoding.makeEncoder().encode(["at": date])
        #expect(String(decoding: data, as: UTF8.self) == #"{"at":"2026-11-20T14:21:55.123Z"}"#)
    }

    @Test func omitsNilFieldsSoPartialUpdatesLeaveThemAlone() throws {
        struct Patch: Encodable {
            var name: String?
            var emoji: String?
        }
        let data = try JSONCoding.makeEncoder().encode(Patch(name: "Viaje"))
        #expect(String(decoding: data, as: UTF8.self) == #"{"name":"Viaje"}"#)
    }
}
