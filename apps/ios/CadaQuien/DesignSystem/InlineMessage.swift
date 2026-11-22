import SwiftUI

/// A calm in-flow message: an error under a form, a notice above a list.
struct InlineMessage: View {
    enum Kind {
        case error, warning, success

        var color: Color {
            switch self {
            case .error: Palette.danger
            case .warning: Palette.warn
            case .success: Palette.good
            }
        }

        var background: Color {
            switch self {
            case .error: Palette.dangerBg
            case .warning: Palette.warnBg
            case .success: Palette.goodBg
            }
        }

        var systemImage: String {
            switch self {
            case .error: "exclamationmark.circle"
            case .warning: "exclamationmark.triangle"
            case .success: "checkmark.circle"
            }
        }
    }

    let kind: Kind
    let text: String

    init(_ kind: Kind, _ text: String) {
        self.kind = kind
        self.text = text
    }

    var body: some View {
        // The icon repeats what the color says, so the message also reads without color.
        Label(text, systemImage: kind.systemImage)
            .font(.subheadline)
            .foregroundStyle(kind.color)
            .padding(Layout.spacing)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(kind.background, in: .rect(cornerRadius: Layout.radiusControl))
    }
}

#Preview {
    VStack {
        InlineMessage(.error, "Correo o contraseña incorrectos.")
        InlineMessage(.warning, "Sin conexión")
        InlineMessage(.success, "Listo")
    }
    .padding()
}
