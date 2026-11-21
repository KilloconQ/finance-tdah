public enum Spanish {
    /// `1 día` / `3 días`.
    public static func days(_ count: Int) -> String {
        "\(count) \(count == 1 ? "día" : "días")"
    }
}
