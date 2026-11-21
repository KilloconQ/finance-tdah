import SwiftUI

/// A titled block of a list screen that loads on its own: skeleton, retryable error, or content.
/// A failed load is never shown as "empty", so nobody is pushed to create something that already exists.
struct ResourceSection<Value: Sendable & Equatable, Content: View>: View {
    let title: String
    /// What failed to load, for the error line: "tus cuentas".
    let subject: String
    let resource: Resource<Value>
    var onSeeAll: (() -> Void)?
    @ViewBuilder let content: (Value) -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            SectionHeader(title: title) {
                if let onSeeAll {
                    Button("Ver todo", action: onSeeAll)
                        .font(.subheadline)
                        .frame(minHeight: Layout.minTap)
                }
            }
            if let value = resource.value {
                content(value)
            } else if resource.errorMessage != nil {
                VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                    InlineMessage(.error, "No pudimos cargar \(subject).")
                    Button("Reintentar") { Task { await resource.load() } }
                        .buttonStyle(.cqGhost)
                }
            } else {
                RoundedRectangle(cornerRadius: Layout.radiusControl)
                    .fill(Palette.bgAlt)
                    .frame(height: 56)
                    .accessibilityHidden(true)
            }
        }
    }
}
