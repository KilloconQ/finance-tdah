import CadaQuienKit
import SwiftUI

/// A money input that accepts what people actually type ("12,50", "1,250.50") and explains what is wrong.
struct AmountField: View {
    @Binding var text: String
    var title = "Monto"
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(Palette.inkMid)
            HStack(alignment: .firstTextBaseline, spacing: Layout.spacingTight) {
                Text("$")
                    .font(.largeTitle)
                    .foregroundStyle(Palette.inkSoft)
                    .accessibilityHidden(true)
                TextField(title, text: $text, prompt: Text("0.00"))
                    .font(.largeTitle.bold())
                    .monospacedDigit()
                    .keyboardType(.decimalPad)
                    .focused($isFocused)
                    .onChange(of: text) { _, new in
                        let grouped = Money.grouped(new)
                        if grouped != new { text = grouped }
                    }
                    .accessibilityLabel(title)
            }
            .padding(Layout.cardPadding)
            .background(Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
            .overlay {
                RoundedRectangle(cornerRadius: Layout.radiusControl)
                    .stroke(isFocused ? Palette.sage : Palette.line, lineWidth: Layout.hairline)
            }
            if let message = errorMessage {
                Label(message, systemImage: "exclamationmark.circle")
                    .font(.footnote)
                    .foregroundStyle(Palette.danger)
            }
        }
    }

    private var errorMessage: String? {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        if case .failure(let error) = Money.parse(text) { return error.errorDescription }
        return nil
    }
}

#Preview {
    @Previewable @State var text = "12,50"
    AmountField(text: $text).padding()
}
