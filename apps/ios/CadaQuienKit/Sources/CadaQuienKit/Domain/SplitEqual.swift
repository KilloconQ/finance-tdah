public enum SplitEqual {
    /// Divides `amountCents` among `count` people with no cent lost: the first `remainder` people pay one cent more.
    /// Mirrors the server, which does this itself when the client sends only `participantIds`.
    public static func shares(amountCents: Int, count: Int) -> [Int] {
        guard count > 0 else { return [] }
        let base = amountCents / count
        let remainder = amountCents - base * count
        return (0..<count).map { $0 < remainder ? base + 1 : base }
    }
}
