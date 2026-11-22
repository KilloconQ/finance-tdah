import AppIntents
import CadaQuienKit
import SwiftUI
import WidgetKit

/// One view per widget family: the home screen sizes, and the lock screen ones.
struct QuickAddWidgetView: View {
    let entry: QuickAddEntry
    /// Forces a family. The system sets it for a real widget; only the debug gallery passes it.
    var familyOverride: WidgetFamily?
    @Environment(\.widgetFamily) private var environmentFamily

    private var family: WidgetFamily { familyOverride ?? environmentFamily }

    private static let addURL = URL(string: "cadaquien://add")!

    var body: some View {
        switch family {
        case .systemMedium: medium
        case .accessoryRectangular: accessoryRectangular
        case .accessoryCircular: accessoryCircular
        default: small
        }
    }

    // MARK: Home screen

    private var small: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Hoy puedes gastar")
                .font(.caption)
                .foregroundStyle(Palette.inkMid)
            amountText.font(.title.bold()).minimumScaleFactor(0.6).lineLimit(1)
            Spacer(minLength: 0)
            Label("Anotar gasto", systemImage: "plus.circle.fill")
                .font(.footnote.bold())
                .foregroundStyle(Palette.sageStrong)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(Self.addURL)
    }

    private var medium: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Hoy puedes gastar")
                    .font(.caption)
                    .foregroundStyle(Palette.inkMid)
                amountText.font(.title2.bold()).minimumScaleFactor(0.6).lineLimit(1)
                Spacer(minLength: 0)
                Link(destination: Self.addURL) {
                    Label("Otro monto", systemImage: "plus.circle.fill")
                        .font(.footnote.bold())
                        .foregroundStyle(Palette.sageStrong)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 6) {
                ForEach(QuickExpense.presets) { preset in
                    Button(intent: AddPresetExpenseIntent(presetId: preset.id)) {
                        Text("\(preset.emoji) \(preset.title)")
                            .font(.subheadline.bold())
                            .frame(maxWidth: .infinity, minHeight: 32)
                            .foregroundStyle(Palette.sageStrong)
                            .background(Palette.sageBg, in: .capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: 120)
        }
    }

    @ViewBuilder private var amountText: some View {
        switch entry.state {
        case .signedOut:
            Text("Entra a la app").foregroundStyle(Palette.inkMid)
        case .unavailable:
            Text("—").foregroundStyle(Palette.inkMid)
        case .loaded(let cents, let hidden):
            Text(Money.format(cents: cents, hidden: hidden))
                .monospacedDigit()
                .foregroundStyle(Palette.ink)
        }
    }

    // MARK: Lock screen

    private var accessoryRectangular: some View {
        VStack(alignment: .leading) {
            Text("Hoy puedes gastar").font(.caption2)
            amountText.font(.headline)
            Label("Anotar gasto", systemImage: "plus").font(.caption2)
        }
        .widgetURL(Self.addURL)
    }

    private var accessoryCircular: some View {
        ZStack {
            AccessoryWidgetBackground()
            Image(systemName: "plus")
                .font(.title2.bold())
        }
        .widgetURL(Self.addURL)
        .accessibilityLabel("Anotar gasto")
    }
}
