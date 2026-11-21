import Foundation

/// Calm Spanish copy for API failures. Mirrors `apps/web/src/lib/auth-errors.ts`.
enum APIMessages {
    static let wrongCredentials = "Correo o contraseña incorrectos."
    static let rateLimited = "Demasiados intentos seguidos. Espera un minuto y prueba de nuevo."
    static let serverTrouble = "Algo salió mal de nuestro lado. Intenta de nuevo en un momento."

    static let byCode: [String: String] = [
        "INVALID_EMAIL_OR_PASSWORD": wrongCredentials,
        "INVALID_PASSWORD": wrongCredentials,
        "USER_NOT_FOUND": wrongCredentials,
        "USER_ALREADY_EXISTS": "Ya existe una cuenta con ese correo. Inicia sesión o usa otro.",
        "PASSWORD_TOO_SHORT": "La contraseña tiene que tener al menos 8 caracteres.",
        "PASSWORD_TOO_LONG": "La contraseña es demasiado larga.",
        "INVALID_TOKEN": "El enlace venció o ya se usó. Pide uno nuevo.",
        "PASSWORD_RESET_UNAVAILABLE":
            "El restablecimiento por correo no está configurado. Contacta a quien administra la app.",
    ]

    private static let english: [(pattern: String, spanish: String)] = [
        ("user already exists", byCode["USER_ALREADY_EXISTS"]!),
        ("invalid email or password", wrongCredentials),
        ("internal server error|something went wrong", serverTrouble),
    ]

    /// Maps a known English message to Spanish; anything else passes through (our own errors are already Spanish).
    static func translate(_ message: String) -> String {
        for entry in english where message.range(of: entry.pattern, options: [.regularExpression, .caseInsensitive]) != nil {
            return entry.spanish
        }
        return message
    }
}
