import SwiftUI

/// Shows a `Resource`: a spinner the first time, the content once loaded, and a retryable error otherwise.
/// A failed refresh keeps the old content and shows the error above it.
struct ResourceView<Value: Sendable & Equatable, Content: View>: View {
    let resource: Resource<Value>
    @ViewBuilder let content: (Value) -> Content

    var body: some View {
        Group {
            if let value = resource.value {
                VStack(spacing: Layout.spacing) {
                    if let message = resource.errorMessage {
                        InlineMessage(.warning, message)
                            .padding(.horizontal, Layout.screenPadding)
                    }
                    content(value)
                }
            } else if let message = resource.errorMessage {
                ContentUnavailableView {
                    Label("No pudimos cargar", systemImage: "wifi.exclamationmark")
                } description: {
                    Text(message)
                } actions: {
                    Button("Reintentar") { Task { await resource.load() } }
                        .buttonStyle(.cqPrimary)
                        .frame(maxWidth: 240)
                }
            } else {
                ProgressView("Cargando")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task { await resource.loadIfNeeded() }
    }
}
