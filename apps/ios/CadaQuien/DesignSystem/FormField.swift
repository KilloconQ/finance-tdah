import SwiftUI

/// A labeled text input in the app's style. Use `isSecure` for passwords.
struct FormField: View {
    let title: String
    @Binding var text: String
    var prompt: String = ""
    var isSecure = false
    var helper: String?
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(Palette.inkMid)
            Group {
                if isSecure {
                    SecureField(title, text: $text, prompt: Text(prompt))
                } else {
                    TextField(title, text: $text, prompt: Text(prompt))
                }
            }
            .font(.body)
            .focused($isFocused)
            .padding(.horizontal, Layout.spacing)
            .frame(minHeight: Layout.minTap)
            .background(Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
            .overlay {
                RoundedRectangle(cornerRadius: Layout.radiusControl)
                    .stroke(isFocused ? Palette.sage : Palette.line, lineWidth: Layout.hairline)
            }
            if let helper {
                Text(helper)
                    .font(.footnote)
                    .foregroundStyle(Palette.inkSoft)
            }
        }
    }
}
