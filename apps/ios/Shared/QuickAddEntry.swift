import WidgetKit

/// What the widget shows at one moment.
struct QuickAddEntry: TimelineEntry {
    enum State: Equatable {
        /// Nobody is signed in on this phone.
        case signedOut
        /// The server couldn't be reached; the buttons still work.
        case unavailable
        case loaded(todayAvailableCents: Int, hidesBalances: Bool)
    }

    let date: Date
    let state: State

    static let placeholder = QuickAddEntry(date: .now, state: .loaded(todayAvailableCents: 35_500, hidesBalances: false))
}
