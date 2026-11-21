import Foundation
import Testing

@testable import CadaQuien

struct DeepLinkTests {
    @Test func theWidgetOpensTheAddSheet() {
        #expect(DeepLink(url: URL(string: "cadaquien://add")!) == .addExpense)
        #expect(DeepLink(url: URL(string: "CADAQUIEN://ADD")!) == .addExpense)
        #expect(DeepLink(url: URL(string: "cadaquien://panic")!) == .panic)
    }

    @Test(arguments: ["https://example.com/add", "cadaquien://unknown", "cadaquien://", "otraapp://add"])
    func ignoresAnythingElse(link: String) {
        #expect(DeepLink(url: URL(string: link)!) == nil)
    }
}
