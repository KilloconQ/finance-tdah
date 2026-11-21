import CadaQuienKit
import SwiftUI

/// "Modo pánico": a calm full-screen stop, with three small things to do instead of spending.
struct PanicView: View {
    @Environment(AppModel.self) private var app
    @Environment(Navigator.self) private var navigator

    var body: some View {
        ScrollView {
            VStack(spacing: Layout.spacingSection) {
                HStack {
                    Spacer()
                    Button("Salir", systemImage: "xmark") { close() }
                        .labelStyle(.iconOnly)
                        .frame(minWidth: Layout.minTap, minHeight: Layout.minTap)
                }
                Text("🌬").font(.system(size: 64)).accessibilityHidden(true)
                VStack(spacing: Layout.spacingSmall) {
                    Text("Respira.\nNo pasa nada grave.")
                        .font(.largeTitle.bold())
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Palette.ink)
                    subtitle
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Palette.inkMid)
                }
                VStack(spacing: Layout.spacing) {
                    action("📺", "Ver suscripciones que no usas", "cancela lo que ya no aporta") {
                        go(.subscriptions, in: .money)
                    }
                    action("✍️", "Registrar solo lo esencial", "anota lo que sí necesitas hoy") {
                        close()
                        navigator.isAddingExpense = true
                    }
                    action("🎯", "Empezar un reto de ahorro", "un límite pequeño para esta semana") {
                        go(.challenge, in: .today)
                    }
                }
                Button("Ver mis movimientos") {
                    close()
                    navigator.tab = .movements
                }
                .font(.subheadline)
                .underline()
                .frame(minHeight: Layout.minTap)
                Button("Salir", action: close)
                    .buttonStyle(.cqGhost)
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
        .background(Palette.bg)
        .accessibilityLabel("Modo pánico")
        .task { await app.store.summary.loadIfNeeded() }
    }

    @ViewBuilder private var subtitle: some View {
        if let summary = app.store.summary.value {
            let overspend = max(0, summary.weekSpentCents - summary.weekTargetCents)
            if overspend > 0 {
                VStack(spacing: 0) {
                    MoneySentence("Te excediste por ", .money(overspend), " esta semana.")
                    Text("Esto es lo que sí podemos hacer.")
                }
            } else {
                Text("Vas dentro de tu presupuesto esta semana.\nAun así, aquí tienes formas de cuidarlo.")
            }
        } else {
            Text("Veamos qué podemos hacer ahora mismo.")
        }
    }

    private func action(_ emoji: String, _ title: String, _ detail: String, perform: @escaping () -> Void) -> some View {
        Button(action: perform) {
            HStack(spacing: Layout.spacing) {
                Text(emoji).font(.title2).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: Layout.spacingTight) {
                    Text(title).font(.body.bold()).foregroundStyle(Palette.ink)
                    Text(detail).font(.footnote).foregroundStyle(Palette.inkMid)
                }
                .multilineTextAlignment(.leading)
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(Palette.inkSoft).accessibilityHidden(true)
            }
            .cardStyle()
        }
        .buttonStyle(.plain)
    }

    private func close() {
        navigator.isShowingPanic = false
    }

    private func go(_ route: Route, in tab: MainTab) {
        close()
        navigator.open(route, in: tab)
    }
}
