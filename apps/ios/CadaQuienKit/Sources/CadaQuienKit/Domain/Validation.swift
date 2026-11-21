import Foundation

/// Client-side form checks, with the same rules and Spanish copy as the web forms.
public enum Validation {
    public static let invalidEmailMessage = "Escribe un correo válido, por ejemplo nombre@correo.com."
    public static let shortPasswordMessage = "La contraseña tiene que tener al menos 8 caracteres."
    public static let minPasswordLength = 8

    /// `^\S+@\S+\.\S+$` on the trimmed value, like the web.
    public static func isValidEmail(_ value: String) -> Bool {
        value.trimmingCharacters(in: .whitespacesAndNewlines).range(of: #"^\S+@\S+\.\S+$"#, options: .regularExpression) != nil
    }

    public static func isValidPassword(_ value: String) -> Bool {
        value.count >= minPasswordLength
    }
}
