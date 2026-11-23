import Foundation
import Testing

@testable import CadaQuienKit

@Suite struct BillingStatusTests {
  private func decode(_ json: String) throws -> BillingStatus {
    try JSONCoding.makeDecoder().decode(BillingStatus.self, from: Data(json.utf8))
  }

  @Test func devNeverShowsAPaywall() throws {
    let status = try decode(#"{"required":false,"hasAccess":true,"access":"free"}"#)
    #expect(status.needsPaywall == false)
  }

  @Test func anAllowlistedUserNeverPays() throws {
    let status = try decode(#"{"required":true,"hasAccess":true,"access":"allowlist"}"#)
    #expect(status.needsPaywall == false)
  }

  @Test func anUnsubscribedUserSeesThePaywallWhenBillingIsOn() throws {
    let status = try decode(#"{"required":true,"hasAccess":false,"access":"none"}"#)
    #expect(status.needsPaywall)
  }
}
