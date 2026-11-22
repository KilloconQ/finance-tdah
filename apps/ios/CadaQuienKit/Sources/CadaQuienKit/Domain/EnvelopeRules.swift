/// Envelope ("cajita") rules. Mirrors `packages/shared/src/domain/envelope.ts`: the API enforces them and the app
/// shows the same numbers before the user submits.
///
/// An envelope earmarks part of one account's balance; no money moves. What is set aside is the sum of the envelopes'
/// positive balances: an overspent envelope doesn't free money, its overspend already came out of the account.
public enum EnvelopeRules {
    public static func allocated(_ envelopeBalances: [Int]) -> Int {
        envelopeBalances.reduce(0) { $0 + max(0, $1) }
    }

    /// Money in the account not set aside in any envelope. Negative = over-allocated.
    public static func unassigned(accountBalance: Int, envelopeBalances: [Int]) -> Int {
        accountBalance - allocated(envelopeBalances)
    }

    /// A credit card's balance is debt, not money the user can set aside.
    public static func supportsEnvelopes(_ type: AccountType) -> Bool {
        type != .credito
    }

    /// Money locked in envelopes across all accounts. Per account it can't exceed what the account holds.
    public static func lockedCents(accounts: [Account], envelopes: [Envelope]) -> Int {
        accounts.reduce(0) { sum, account in
            let balances = envelopes.filter { $0.accountId == account.id }.map(\.balanceCents)
            return sum + min(allocated(balances), max(0, account.balanceCents))
        }
    }

    public enum AdjustmentError: Equatable, Sendable {
        case creditAccount
        case exceedsUnassigned(availableCents: Int)
        case exceedsEnvelope(availableCents: Int)

        /// Spanish copy, with the amounts formatted (or masked when balances are hidden).
        public func message(hidden: Bool = false) -> String {
            switch self {
            case .creditAccount:
                return "Las tarjetas de crédito no llevan cajitas."
            case .exceedsEnvelope(let available):
                return available > 0
                    ? "La cajita solo tiene \(Money.format(cents: available, hidden: hidden))."
                    : "La cajita no tiene dinero para liberar."
            case .exceedsUnassigned(let available):
                return available > 0
                    ? "Solo quedan \(Money.format(cents: available, hidden: hidden)) sin apartar."
                    : "Ya apartaste todo lo que tiene esta cuenta."
            }
        }
    }

    /// Whether moving `delta` into (positive) or out of (negative) an envelope is allowed. Setting money aside can't
    /// exceed what the account holds; releasing can't take the envelope below zero.
    public static func adjustmentError(
        accountType: AccountType, accountBalance: Int, otherEnvelopeBalances: [Int], envelopeBalance: Int, delta: Int
    ) -> AdjustmentError? {
        guard supportsEnvelopes(accountType) else { return .creditAccount }
        let after = envelopeBalance + delta
        if delta < 0 {
            return after < 0 ? .exceedsEnvelope(availableCents: max(0, envelopeBalance)) : nil
        }
        let others = allocated(otherEnvelopeBalances)
        let allocatedAfter = others + max(0, after)
        let allocatedBefore = others + max(0, envelopeBalance)
        // Only a move that grows the allocation needs room: covering an overspent envelope back to zero sets nothing aside.
        if allocatedAfter > allocatedBefore, allocatedAfter > accountBalance {
            return .exceedsUnassigned(availableCents: max(0, accountBalance - allocatedBefore))
        }
        return nil
    }
}
