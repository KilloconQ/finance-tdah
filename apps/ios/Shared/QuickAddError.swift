import AppIntents

/// What Siri says when logging an expense doesn't work. Messages are already in calm Spanish.
enum QuickAddError: Error, CustomLocalizedStringResourceConvertible {
    case notSignedIn
    case message(String)

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .notSignedIn: "Abre Cada Quien e inicia sesión para poder anotar gastos."
        case .message(let text): "\(text)"
        }
    }
}
