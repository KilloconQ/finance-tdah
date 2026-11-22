extension AccountType {
    public var label: String {
        switch self {
        case .debito: "Débito"
        case .credito: "Crédito"
        case .efectivo: "Efectivo"
        case .wallet: "Billetera"
        case .ahorro: "Ahorro"
        }
    }

    public var emoji: String {
        switch self {
        case .debito: "🏦"
        case .credito: "💳"
        case .efectivo: "💵"
        case .wallet: "📱"
        case .ahorro: "🐷"
        }
    }

    /// Bank and last four digits only make sense for cards.
    public var showsBankDetails: Bool {
        self == .debito || self == .credito
    }
}
