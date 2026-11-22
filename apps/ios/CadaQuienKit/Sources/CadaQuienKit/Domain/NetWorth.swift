/// Mirrors `packages/shared/src/domain/net-worth.ts`. Goals ("jars") are not an input: a jar is mental accounting
/// over money already in an account, so adding it again would double count.
public struct NetWorth: Equatable, Sendable {
    public let liquidCents: Int
    public let debtCents: Int
    public var netWorthCents: Int { liquidCents - debtCents }

    public init(accounts: [Account]) {
        var liquid = 0
        var debt = 0
        for account in accounts {
            if account.balanceCents >= 0 { liquid += account.balanceCents } else { debt += -account.balanceCents }
        }
        liquidCents = liquid
        debtCents = debt
    }
}

public enum AccountBalance {
    /// A person types a plain positive amount; credit cards hold debt, so theirs is stored negative.
    public static func signed(type: AccountType, magnitudeCents: Int) -> Int {
        let magnitude = abs(magnitudeCents)
        // Never -0 for a zero-balance card.
        return type == .credito && magnitude != 0 ? -magnitude : magnitude
    }
}
