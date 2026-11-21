import SwiftUI

/// Placeholder shell until the tabs land.
struct MainTabs: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        VStack(spacing: Layout.spacingLarge) {
            Text("Hola, \(app.profile?.displayName ?? "")")
                .font(.title.bold())
            Button("Cerrar sesión") { Task { await app.signOut() } }
                .buttonStyle(.cqGhost)
                .frame(maxWidth: 240)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.bg)
    }
}
