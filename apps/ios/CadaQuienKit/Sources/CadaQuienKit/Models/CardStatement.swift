public struct CardStatement: Codable, Sendable, Hashable {
    /// The local day the statement was calculated for, in the owner's time zone.
    public let today: CalendarDay
    public let cutoffDate: CalendarDay
    public let paymentDate: CalendarDay
    public let dueCents: Int
    public let openPeriodCents: Int
    public let nextCutoffDate: CalendarDay
}
