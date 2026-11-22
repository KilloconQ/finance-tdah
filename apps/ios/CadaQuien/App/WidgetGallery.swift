#if DEBUG
import SwiftUI
import WidgetKit

/// Debug builds only (`-cq-route widgets`): the widget at its real sizes, to check it without a home screen.
struct WidgetGallery: View {
    private let states: [(String, QuickAddEntry)] = [
        ("Con datos", .placeholder),
        ("Saldos ocultos", QuickAddEntry(date: .now, state: .loaded(todayAvailableCents: 35_500, hidesBalances: true))),
        ("Sin sesión", QuickAddEntry(date: .now, state: .signedOut)),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                ForEach(states, id: \.0) { title, entry in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(title).font(.headline)
                        card(entry, .systemSmall, size: CGSize(width: 158, height: 158))
                        card(entry, .systemMedium, size: CGSize(width: 338, height: 158))
                        HStack(spacing: 12) {
                            card(entry, .accessoryRectangular, size: CGSize(width: 160, height: 72), lockScreen: true)
                            card(entry, .accessoryCircular, size: CGSize(width: 72, height: 72), lockScreen: true)
                        }
                    }
                }
            }
            .padding()
        }
        .background(Palette.bgAlt)
        .navigationTitle("Widgets")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func card(_ entry: QuickAddEntry, _ family: WidgetFamily, size: CGSize, lockScreen: Bool = false) -> some View {
        QuickAddWidgetView(entry: entry, familyOverride: family)
            .padding(lockScreen ? 8 : 14)
            .frame(width: size.width, height: size.height, alignment: .topLeading)
            .background(lockScreen ? Color.black.opacity(0.75) : Palette.bg, in: .rect(cornerRadius: 22))
            .environment(\.colorScheme, lockScreen ? .dark : .light)
    }
}
#endif
