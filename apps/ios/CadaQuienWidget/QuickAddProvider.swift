import CadaQuienKit
import WidgetKit

struct QuickAddProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickAddEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping @Sendable (QuickAddEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        Task { completion(await Self.currentEntry()) }
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<QuickAddEntry>) -> Void) {
        Task {
            let entry = await Self.currentEntry()
            // The app and the intents ask for an earlier reload after every expense; this is the fallback.
            completion(Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(30 * 60))))
        }
    }

    private static func currentEntry() async -> QuickAddEntry {
        guard SharedClient.isSignedIn else { return QuickAddEntry(date: .now, state: .signedOut) }
        let client = SharedClient.make()
        do {
            async let summary = DashboardService(client: client).home()
            async let profile = ProfileService(client: client).get()
            let (home, user) = try await (summary, profile)
            return QuickAddEntry(
                date: .now,
                state: .loaded(todayAvailableCents: home.todayAvailableCents, hidesBalances: user?.showBalances == false))
        } catch APIError.unauthorized {
            SharedClient.tokens().clear()
            return QuickAddEntry(date: .now, state: .signedOut)
        } catch {
            return QuickAddEntry(date: .now, state: .unavailable)
        }
    }
}
