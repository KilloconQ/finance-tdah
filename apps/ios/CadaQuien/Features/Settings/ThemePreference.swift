import SwiftUI

/// Light, dark, or follow the phone. Stored on the device only.
enum ThemePreference: String, CaseIterable, Identifiable {
    case system, light, dark

    static let storageKey = "cadaquien.theme"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: "Sistema"
        case .light: "Claro"
        case .dark: "Oscuro"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}
