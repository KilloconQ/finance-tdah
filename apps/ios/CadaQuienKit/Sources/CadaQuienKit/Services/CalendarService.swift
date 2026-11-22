import Foundation

public struct CalendarService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func events(from: CalendarDay, to: CalendarDay) async throws -> CalendarResponse {
        try await client.get(
            "/api/calendar", query: [URLQueryItem(name: "from", value: from.rawValue), URLQueryItem(name: "to", value: to.rawValue)])
    }
}
