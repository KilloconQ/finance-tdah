public struct DashboardService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func home() async throws -> HomeSummary {
        try await client.get("/api/dashboard/home", key: "summary")
    }

    public func breakdown() async throws -> AccountsBreakdown {
        try await client.get("/api/dashboard/breakdown", key: "breakdown")
    }
}
