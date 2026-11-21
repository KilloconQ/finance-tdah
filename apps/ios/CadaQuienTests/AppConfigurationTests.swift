import CadaQuienKit
import Foundation
import Testing

@testable import CadaQuien

struct AppConfigurationTests {
    @Test func appBundleCarriesTheAPIBaseURL() {
        let value = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String
        #expect(value?.hasPrefix("http") == true)
        #expect(APIEnvironment.fromBundle().baseURL.absoluteString == value)
    }
}
