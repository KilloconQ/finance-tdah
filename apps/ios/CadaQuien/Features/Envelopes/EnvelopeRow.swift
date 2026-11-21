import CadaQuienKit
import SwiftUI

struct EnvelopeRow: View {
    let envelope: Envelope
    let onSetAside: () -> Void
    let onRelease: () -> Void
    let onRename: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacing) {
            HStack(spacing: Layout.spacing) {
                Text(envelope.emoji).font(.title2).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: Layout.spacingTight) {
                    Text(envelope.name).font(.body.bold()).foregroundStyle(Palette.ink)
                    if envelope.balanceCents < 0 {
                        MoneySentence("te pasaste por ", .money(-envelope.balanceCents))
                        .font(.footnote)
                        .foregroundStyle(Palette.danger)
                    }
                }
                Spacer()
                MoneyText(cents: envelope.balanceCents)
                    .font(.body.bold())
                    .foregroundStyle(envelope.balanceCents < 0 ? Palette.danger : Palette.ink)
            }
            HStack(spacing: Layout.spacingSmall) {
                Button("Apartar", action: onSetAside).buttonStyle(.cqGhost)
                Button("Liberar", action: onRelease).buttonStyle(.cqGhost).disabled(envelope.balanceCents <= 0)
                Menu("Más", systemImage: "ellipsis.circle") {
                    Button("Renombrar", systemImage: "pencil", action: onRename)
                    Button("Borrar", systemImage: "trash", role: .destructive, action: onDelete)
                }
                .labelStyle(.iconOnly)
                .frame(minWidth: Layout.minTap, minHeight: Layout.minTap)
            }
        }
        .cardStyle()
    }
}
