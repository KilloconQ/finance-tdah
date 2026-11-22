/// What a subscription costs over different spans. Mirrors `packages/shared/src/domain/subscription.ts`.
public enum SubscriptionCost {
    public static func yearly(amountCents: Int, cadence: SubscriptionCadence) -> Int {
        cadence == .yearly ? amountCents : amountCents * 12
    }

    public static func monthly(amountCents: Int, cadence: SubscriptionCadence) -> Int {
        cadence == .yearly ? Int((Double(amountCents) / 12).rounded()) : amountCents
    }

    /// Monthly plans are priced by 30-day months and yearly plans by 365-day years.
    public static func over(days: Int, amountCents: Int, cadence: SubscriptionCadence) -> Int {
        let period: Double = cadence == .yearly ? 365 : 30
        return Int(((Double(days) / period) * Double(amountCents)).rounded())
    }
}
