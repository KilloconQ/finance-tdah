import Foundation
import Testing
@testable import CadaQuienKit

struct APIEnvironmentTests {
    @Test func usesTheConfiguredURL() {
        let env = APIEnvironment.resolve(infoValue: "https://finance.example.com")
        #expect(env.baseURL.absoluteString == "https://finance.example.com")
    }

    @Test(arguments: [nil, "", "not a url", "ftp://example.com", "https://"])
    func fallsBackToLocalhost(value: String?) {
        #expect(APIEnvironment.resolve(infoValue: value) == .localhost)
    }
}
