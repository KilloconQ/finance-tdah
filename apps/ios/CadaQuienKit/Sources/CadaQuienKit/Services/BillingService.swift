import Foundation

public struct BillingService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func status() async throws -> BillingStatus {
        try await client.get("/api/billing/status")
    }
}
