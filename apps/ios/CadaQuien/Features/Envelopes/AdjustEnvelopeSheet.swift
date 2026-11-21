import CadaQuienKit
import SwiftUI

/// Sets money aside in an envelope, or releases it back to the account.
struct AdjustEnvelopeSheet: View {
    enum Direction { case setAside, release }

    let accountId: EntityID
    let envelope: Envelope
    let direction: Direction
    let onDone: () -> Void
    @Environment(AppModel.self) private var app
    @State private var amount = ""
    @State private var errorMessage: String?
    @State private var isSaving = false

    private var account: Account? { app.store.accounts.value?.first { $0.id == accountId } }
    private var others: [Int] {
        (app.store.envelopes.value ?? []).filter { $0.accountId == accountId && $0.id != envelope.id }.map(\.balanceCents)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                Text("\(envelope.emoji) \(envelope.name)").font(.title2.bold()).foregroundStyle(Palette.ink)
                VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                    AmountField(text: $amount, title: direction == .setAside ? "Cuánto apartar" : "Cuánto liberar")
                    helper.font(.footnote).foregroundStyle(Palette.inkMid)
                }
                if let errorMessage { InlineMessage(.error, errorMessage) }
                Button(isSaving ? "Guardando…" : (direction == .setAside ? "Apartar" : "Liberar"), action: save)
                    .buttonStyle(.cqPrimary)
                    .disabled(isSaving || amount.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(Layout.screenPadding)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.bg)
        .navigationTitle(direction == .setAside ? "Apartar" : "Liberar")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancelar", action: onDone) } }
    }

    @ViewBuilder private var helper: some View {
        switch direction {
        case .setAside:
            if let account {
                MoneySentence("Sin apartar en la cuenta: ", .money(max(0, EnvelopeRules.unassigned(accountBalance: account.balanceCents, envelopeBalances: others + [envelope.balanceCents]))))
            }
        case .release:
            MoneySentence("En la cajita: ", .money(max(0, envelope.balanceCents)))
        }
    }

    private func save() {
        guard let account else { return }
        let cents: Int
        switch Money.parse(amount) {
        case .success(let value): cents = value
        case .failure(let error): errorMessage = error.errorDescription; return
        }
        let delta = direction == .setAside ? cents : -cents
        if let failure = EnvelopeRules.adjustmentError(
            accountType: account.type, accountBalance: account.balanceCents, otherEnvelopeBalances: others,
            envelopeBalance: envelope.balanceCents, delta: delta)
        {
            errorMessage = failure.message(hidden: app.hidesBalances)
            return
        }
        errorMessage = nil
        isSaving = true
        Task {
            defer { isSaving = false }
            do {
                _ = try await app.services.envelopes.adjust(envelope.id, deltaCents: delta)
                await app.store.refreshMoney()
                onDone()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos mover el dinero"
            }
        }
    }
}
