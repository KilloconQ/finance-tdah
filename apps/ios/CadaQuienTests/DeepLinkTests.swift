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

    @Test func notificationsOpenTheScreenTheServerMeans() {
        #expect(DeepLink(webPath: "/add-expense") == .addExpense)
        #expect(DeepLink(webPath: "/subscriptions/ABC-123") == .subscription("abc-123"))
    }

    @Test(arguments: ["/", "", "/goals/1", "/subscriptions", "/subscriptions/", "/add-expense/extra", "/unknown"])
    func otherPathsJustOpenTheApp(path: String) {
        #expect(DeepLink(webPath: path) == nil)
    }
}
