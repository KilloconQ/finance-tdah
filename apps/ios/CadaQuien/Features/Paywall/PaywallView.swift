import RevenueCat
import SwiftUI

/// Shown only when the server says billing is on and this user hasn't paid. Dev/local servers never send people here,
/// so RevenueCat is not even configured there.
struct PaywallView: View {
    @Environment(AppModel.self) private var app
    @State private var packages: [Package] = []
    @State private var loading = true
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Text("Sigue con Cada Quien")
                .font(.title.weight(.medium))
                .foregroundStyle(Palette.ink)
            Text("Elige un plan para seguir usando la app.")
                .foregroundStyle(Palette.inkMid)
                .multilineTextAlignment(.center)

            if loading {
                ProgressView().padding(.top, 24)
            } else {
                ForEach(packages, id: \.identifier) { package in
                    Button("\(package.storeProduct.localizedTitle) · \(package.localizedPriceString)") {
                        Task { await buy(package) }
                    }
                    .buttonStyle(.cqPrimary)
                    .disabled(busy)
                }
                if packages.isEmpty && error == nil {
                    Text("No hay planes disponibles por ahora.").foregroundStyle(Palette.inkMid)
                }
            }

            if let error { InlineMessage(.error, error) }

            Button("Restaurar compras") { Task { await restore() } }
                .buttonStyle(.plain)
                .foregroundStyle(Palette.inkMid)
                .disabled(busy)
            Button("Salir") { Task { await app.signOut() } }
                .buttonStyle(.plain)
                .foregroundStyle(Palette.inkMid)
            Spacer()
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.bg)
        .task { await load() }
    }

    private func load() async {
        guard let user = app.user, let key = Bundle.main.object(forInfoDictionaryKey: "RevenueCatAPIKey") as? String, !key.isEmpty else {
            error = "El cobro no está configurado todavía."
            loading = false
            return
        }
        // The app user id is OUR user id: that is what the server's webhook maps back to an account.
        if Purchases.isConfigured {
            _ = try? await Purchases.shared.logIn(user.id)
        } else {
            Purchases.configure(withAPIKey: key, appUserID: user.id)
        }
        do {
            packages = try await Purchases.shared.offerings().current?.availablePackages ?? []
        } catch {
            self.error = "No pudimos cargar los planes."
        }
        loading = false
    }

    private func buy(_ package: Package) async {
        await run {
            let result = try await Purchases.shared.purchase(package: package)
            if result.userCancelled { return }
            try await waitForAccess()
        }
    }

    private func restore() async {
        await run {
            _ = try await Purchases.shared.restorePurchases()
            try await waitForAccess()
        }
    }

    private func run(_ work: () async throws -> Void) async {
        busy = true
        error = nil
        do { try await work() } catch { self.error = "No pudimos completar el pago." }
        busy = false
    }

    /// The server learns about the purchase through RevenueCat's webhook, a few seconds later.
    private func waitForAccess() async throws {
        for _ in 0..<10 {
            try await app.refreshAccess()
            if app.phase == .ready { return }
            try await Task.sleep(for: .seconds(1.5))
        }
        error = "Tu pago está en proceso. Vuelve a abrir la app en un minuto."
    }
}
