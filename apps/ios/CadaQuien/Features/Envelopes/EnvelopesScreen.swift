import CadaQuienKit
import SwiftUI

/// "Cajitas": money set aside inside one account. No money moves; it is only locked until released.
struct EnvelopesScreen: View {
    let accountId: EntityID
    @Environment(AppModel.self) private var app
    @State private var sheet: EnvelopeSheet?
    @State private var pendingDelete: Envelope?
    @State private var errorMessage: String?

    var body: some View {
        ResourceView(resource: app.store.accounts) { accounts in
            if let account = accounts.first(where: { $0.id == accountId }) {
                if EnvelopeRules.supportsEnvelopes(account.type) {
                    content(account: account)
                } else {
                    ContentUnavailableView(
                        "Las tarjetas de crédito no llevan cajitas", systemImage: "creditcard",
                        description: Text("Su saldo es deuda: no hay dinero que apartar."))
                }
            } else {
                ContentUnavailableView("No encontramos esa cuenta", systemImage: "questionmark.folder")
            }
        }
        .background(Palette.bg)
        .navigationTitle("Cajitas")
        .navigationBarTitleDisplayMode(.inline)
        .task { await app.store.envelopes.loadIfNeeded() }
        .sheet(item: $sheet) { sheet in
            NavigationStack { sheetContent(sheet) }
                .presentationDetents([.large])
        }
        .confirmationDialog(
            "¿Borrar esta cajita?", isPresented: isConfirmingDelete, titleVisibility: .visible, presenting: pendingDelete
        ) { envelope in
            Button("Sí, borrar", role: .destructive) { delete(envelope) }
            Button("Cancelar", role: .cancel) {}
        } message: { _ in
            Text("El dinero no se mueve: vuelve a quedar sin apartar en la cuenta.")
        }
    }

    private var isConfirmingDelete: Binding<Bool> {
        Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
    }

    private func content(account: Account) -> some View {
        let envelopes = (app.store.envelopes.value ?? []).filter { $0.accountId == accountId }
        let balances = envelopes.map(\.balanceCents)
        let allocated = EnvelopeRules.allocated(balances)
        let unassigned = EnvelopeRules.unassigned(accountBalance: account.balanceCents, envelopeBalances: balances)

        return ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                summary(account: account, allocated: allocated, unassigned: unassigned)
                if let errorMessage { InlineMessage(.error, errorMessage) }
                SectionHeader(title: "Tus cajitas") {
                    Button("Nueva cajita", systemImage: "plus") { sheet = .create }
                        .font(.subheadline)
                        .frame(minHeight: Layout.minTap)
                }
                if envelopes.isEmpty {
                    EmptyBlock(
                        title: "Aún no tienes cajitas",
                        hint: "Aparta dinero de esta cuenta para algo: la renta, el súper, un viaje. Queda bloqueado hasta que lo liberes.",
                        actionTitle: "Nueva cajita"
                    ) { sheet = .create }
                } else {
                    ForEach(envelopes) { envelope in
                        EnvelopeRow(
                            envelope: envelope,
                            onSetAside: { sheet = .set(aside: envelope) },
                            onRelease: { sheet = .release(from: envelope) },
                            onRename: { sheet = .rename(envelope) },
                            onDelete: { pendingDelete = envelope })
                    }
                }
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
    }

    private func summary(account: Account, allocated: Int, unassigned: Int) -> some View {
        VStack(alignment: .leading, spacing: Layout.spacing) {
            Text(account.name).font(.headline).foregroundStyle(Palette.ink)
            HStack(alignment: .top, spacing: Layout.spacing) {
                stat("En la cuenta", cents: account.balanceCents, color: Palette.ink)
                stat("Bloqueado", cents: allocated, color: Palette.warn)
                stat("Disponible", cents: unassigned, color: unassigned < 0 ? Palette.danger : Palette.good)
            }
            if unassigned < 0 {
                HStack(spacing: 0) {
                    Text("Apartaste más de lo que tiene la cuenta. Libera ")
                    MoneyText(cents: -unassigned)
                    Text(" de alguna cajita.")
                }
                .font(.footnote)
                .foregroundStyle(Palette.danger)
            }
        }
        .cardStyle()
    }

    private func stat(_ title: String, cents: Int, color: Color) -> some View {
        VStack(alignment: .leading, spacing: Layout.spacingTight) {
            Text(title).font(.footnote).foregroundStyle(Palette.inkMid)
            MoneyText(cents: cents).font(.subheadline.bold()).foregroundStyle(color).minimumScaleFactor(0.7).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private func sheetContent(_ sheet: EnvelopeSheet) -> some View {
        switch sheet {
        case .create: CreateEnvelopeSheet(accountId: accountId) { self.sheet = nil }
        case .set(let envelope): AdjustEnvelopeSheet(accountId: accountId, envelope: envelope, direction: .setAside) { self.sheet = nil }
        case .release(let envelope): AdjustEnvelopeSheet(accountId: accountId, envelope: envelope, direction: .release) { self.sheet = nil }
        case .rename(let envelope): RenameEnvelopeSheet(envelope: envelope) { self.sheet = nil }
        }
    }

    private func delete(_ envelope: Envelope) {
        errorMessage = nil
        Task {
            do {
                try await app.services.envelopes.delete(envelope.id)
                await app.store.refreshMoney()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos borrar la cajita"
            }
        }
    }
}
