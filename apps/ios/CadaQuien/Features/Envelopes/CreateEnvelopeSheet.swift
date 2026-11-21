import CadaQuienKit
import SwiftUI

struct CreateEnvelopeSheet: View {
    let accountId: EntityID
    let onDone: () -> Void
    @Environment(AppModel.self) private var app
    @State private var name = ""
    @State private var emoji = "📦"
    @State private var amount = ""
    @State private var errorMessage: String?
    @State private var isSaving = false

    private var account: Account? { app.store.accounts.value?.first { $0.id == accountId } }
    private var siblings: [Int] { (app.store.envelopes.value ?? []).filter { $0.accountId == accountId }.map(\.balanceCents) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                FormField(title: "Para qué es", text: $name, prompt: "Ej: Renta, Súper, Viaje")
                EmojiPicker(options: EnvelopeEmoji.options, selection: $emoji)
                VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                    AmountField(text: $amount, title: "Cuánto apartar (opcional)")
                    if let account {
                        MoneySentence("Sin apartar en la cuenta: ", .money(max(0, EnvelopeRules.unassigned(accountBalance: account.balanceCents, envelopeBalances: siblings))))
                        .font(.footnote)
                        .foregroundStyle(Palette.inkMid)
                    }
                }
                if let errorMessage { InlineMessage(.error, errorMessage) }
                Button(isSaving ? "Creando…" : "Crear cajita", action: save)
                    .buttonStyle(.cqPrimary)
                    .disabled(isSaving || name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(Layout.screenPadding)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.bg)
        .navigationTitle("Nueva cajita")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancelar", action: onDone) } }
    }

    private func save() {
        var cents = 0
        if !amount.trimmingCharacters(in: .whitespaces).isEmpty {
            switch Money.parse(amount) {
            case .success(let value): cents = value
            case .failure(let error): errorMessage = error.errorDescription; return
            }
        }
        if cents > 0, let account,
            let failure = EnvelopeRules.adjustmentError(
                accountType: account.type, accountBalance: account.balanceCents, otherEnvelopeBalances: siblings,
                envelopeBalance: 0, delta: cents)
        {
            errorMessage = failure.message(hidden: app.hidesBalances)
            return
        }
        errorMessage = nil
        isSaving = true
        Task {
            defer { isSaving = false }
            do {
                _ = try await app.services.envelopes.create(
                    .init(accountId: accountId, name: String(name.trimmingCharacters(in: .whitespaces).prefix(60)), emoji: emoji, amountCents: cents))
                await app.store.refreshMoney()
                onDone()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos crear la cajita"
            }
        }
    }
}
