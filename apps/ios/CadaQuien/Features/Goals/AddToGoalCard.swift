import CadaQuienKit
import SwiftUI

/// "Echar al frasco": $50, $100, $250 or another amount.
struct AddToGoalCard: View {
    let goal: Goal
    /// Called after a deposit; true when it just filled the jar.
    let onDeposited: (_ crossedFull: Bool) -> Void
    @Environment(AppModel.self) private var app
    @State private var selectedCents = 10_000
    @State private var isCustom = false
    @State private var customText = ""
    @State private var notice: String?
    @State private var errorMessage: String?
    @State private var isSaving = false

    private let presets = [5_000, 10_000, 25_000]

    private var amountCents: Int? {
        isCustom ? Money.parseToCents(customText) : selectedCents
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingLarge) {
            Text("Echar al frasco").font(.headline).foregroundStyle(Palette.ink)
            HStack(spacing: Layout.spacingSmall) {
                ForEach(presets, id: \.self) { cents in
                    Chip(title: Money.format(cents: cents).replacingOccurrences(of: ".00", with: ""), isSelected: !isCustom && selectedCents == cents) {
                        isCustom = false
                        selectedCents = cents
                    }
                }
                Chip(title: "Otra", isSelected: isCustom) { isCustom = true }
            }
            if isCustom {
                AmountField(text: $customText, title: "Otra cantidad")
            }
            if let errorMessage { InlineMessage(.error, errorMessage) }
            if let notice { InlineMessage(.success, notice) }
            Button(isSaving ? "Guardando…" : buttonTitle, action: add)
                .buttonStyle(.cqPrimary)
                .disabled(isSaving || (amountCents ?? 0) <= 0)
        }
        .cardStyle()
    }

    private var buttonTitle: String {
        guard let cents = amountCents, cents > 0 else { return "Echar al frasco" }
        return "Echar \(Money.format(cents: cents).replacingOccurrences(of: ".00", with: ""))"
    }

    private func add() {
        guard let cents = amountCents, cents > 0 else { return }
        isSaving = true
        errorMessage = nil
        let wasFull = goal.currentCents >= goal.targetCents
        Task {
            defer { isSaving = false }
            do {
                let updated = try await app.services.goals.add(goal.id, amountCents: cents)
                await app.store.refreshGoals()
                onDeposited(!wasFull && updated.currentCents >= updated.targetCents)
                notice = "\(Money.format(cents: cents, hidden: app.hidesBalances)) guardados al frasco"
                selectedCents = 0
                isCustom = false
                customText = ""
                try? await Task.sleep(for: .seconds(1.4))
                notice = nil
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos echar al frasco"
            }
        }
    }
}
