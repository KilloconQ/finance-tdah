import Foundation

/// Display and parsing of money. Mirrors `apps/web/src/lib/format.ts` and `packages/shared/src/domain/money.ts`
/// so a figure reads the same on the web and on the phone.
public enum Money {
    public static let hiddenMask = "••••"

    /// `$1,234.50`, always two decimals, a bare `$`. Negatives read `-$50.00`.
    public static func format(cents: Int, hidden: Bool = false) -> String {
        hidden ? hiddenMask : (cents < 0 ? "-" : "") + unsigned(cents)
    }

    /// `+$50.00` / `−$50.00` (a real minus) / `$0.00`.
    public static func delta(cents: Int, hidden: Bool = false) -> String {
        guard !hidden else { return hiddenMask }
        let sign = cents > 0 ? "+" : cents < 0 ? "−" : ""
        return sign + unsigned(cents)
    }

    private static func unsigned(_ cents: Int) -> String {
        let absolute = abs(cents)
        let whole = String(absolute / 100)
        var grouped = ""
        for (index, character) in whole.reversed().enumerated() {
            if index > 0, index % 3 == 0 { grouped.append(",") }
            grouped.append(character)
        }
        let fraction = String(format: "%02d", absolute % 100)
        return "$\(String(grouped.reversed())).\(fraction)"
    }

    /// What an amount field shows when editing: `1500` -> `15`, `1550` -> `15.5`, `1505` -> `15.05`.
    public static func editableText(cents: Int) -> String {
        let whole = cents / 100
        let fraction = cents % 100
        if fraction == 0 { return String(whole) }
        return fraction % 10 == 0 ? "\(whole).\(fraction / 10)" : "\(whole).\(String(format: "%02d", fraction))"
    }

    public static func units(fromCents cents: Int) -> Double {
        Double(cents) / 100
    }

    public static func cents(fromUnits units: Double) -> Int {
        Int((units * 100).rounded())
    }

    // MARK: Parsing what a person types

    public enum ParseError: Error, Equatable, LocalizedError {
        case invalid, tooManyDecimals, scientific

        public var errorDescription: String? {
            switch self {
            case .invalid: "El monto no es válido"
            case .tooManyDecimals: "El monto admite máximo 2 decimales"
            case .scientific: "No uses notación científica; escribe el monto completo"
            }
        }
    }

    /// Parses a typed amount into cents. Accepts a comma or a dot as the decimal separator:
    /// `"12,50"` -> 1250, `"1,250.50"` -> 125050, `"1.234,50"` -> 123450, `"1,250"` -> 125000.
    /// When both separators appear the last one is the decimal. A lone separator is thousands only if it is a comma
    /// followed by exactly 3 digits. More than 2 decimals and scientific notation are rejected.
    public static func parse(_ raw: String) -> Result<Int, ParseError> {
        var text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.hasPrefix("$") { text.removeFirst() }
        text = text.filter { !$0.isWhitespace }

        if let first = text.first, first.isNumber, text.lowercased().range(of: #"e[+-]?\d"#, options: .regularExpression) != nil {
            return .failure(.scientific)
        }
        guard !text.isEmpty, text.allSatisfy({ $0.isASCII && ($0.isNumber || $0 == "." || $0 == ",") }),
              text.contains(where: \.isNumber)
        else { return .failure(.invalid) }

        let characters = Array(text)
        let lastDot = characters.lastIndex(of: ".")
        let lastComma = characters.lastIndex(of: ",")
        let last = [lastDot, lastComma].compactMap { $0 }.max()

        var decimalIndex: Int?
        if lastDot != nil, lastComma != nil {
            decimalIndex = last
        } else if let last {
            let separator = characters[last]
            let after = characters.count - last - 1
            let count = characters.filter { $0 == separator }.count
            if count > 1 {
                decimalIndex = nil
            } else if separator == ",", after == 3, last >= 1, last <= 3 {
                decimalIndex = nil
            } else {
                decimalIndex = last
            }
        }

        let integerPart = decimalIndex.map { String(characters[..<$0]) } ?? text
        let decimalPart = decimalIndex.map { String(characters[($0 + 1)...]) } ?? ""

        if decimalPart.count > 2 {
            return .failure(decimalPart.allSatisfy(\.isNumber) ? .tooManyDecimals : .invalid)
        }
        if !decimalPart.isEmpty, !decimalPart.allSatisfy(\.isNumber) { return .failure(.invalid) }

        // Separators left in the integer part are thousands: groups of exactly 3 digits, all the same separator.
        let groupedPattern = #"^\d{1,3}([.,]\d{3})+$"#
        if integerPart.range(of: groupedPattern, options: .regularExpression) == nil,
           !integerPart.allSatisfy(\.isNumber)
        {
            return .failure(.invalid)
        }
        let groups = integerPart.split(omittingEmptySubsequences: false, whereSeparator: { $0 == "." || $0 == "," })
        if groups.count > 1, Set(integerPart.filter { !$0.isNumber }).count > 1 { return .failure(.invalid) }

        let digits = groups.joined() + "." + (decimalPart.isEmpty ? "0" : decimalPart)
        guard let units = Double(digits), units.isFinite, units > 0 else { return .failure(.invalid) }
        return .success(cents(fromUnits: units))
    }

    /// `nil` on any failure; use `parse` when the reason matters.
    public static func parseToCents(_ raw: String) -> Int? {
        if case .success(let cents) = parse(raw) { return cents }
        return nil
    }
}
