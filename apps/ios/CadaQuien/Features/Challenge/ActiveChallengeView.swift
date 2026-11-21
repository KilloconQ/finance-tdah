import CadaQuienKit
import SwiftUI

struct ActiveChallengeView: View {
    let challenge: Challenge
    @Environment(AppModel.self) private var app
    @State private var errorMessage: String?
    @State private var isWorking = false

    private var checkedToday: Bool {
        challenge.lastCheckedAt == CalendarDay(Date())
    }

    private var savedCents: Int {
        guard challenge.days > 0 else { return 0 }
        return Int((Double(challenge.expectedSavingsCents) / Double(challenge.days) * Double(challenge.doneDays)).rounded())
    }

    var body: some View {
        VStack(spacing: Layout.spacingSection) {
            VStack(spacing: Layout.spacingSmall) {
                Text("\(challenge.doneDays) / \(Spanish.days(challenge.days))")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkSoft)
                    .monospacedDigit()
                Text("☕").font(.system(size: 56)).accessibilityHidden(true)
                Text(challenge.name).font(.title.bold()).foregroundStyle(Palette.ink).multilineTextAlignment(.center)
                Text(challenge.description).foregroundStyle(Palette.inkMid).multilineTextAlignment(.center)
            }
            VStack(alignment: .leading, spacing: Layout.spacing) {
                Text("Día \(challenge.doneDays) de \(challenge.days)").font(.headline).foregroundStyle(Palette.ink)
                StepDots(count: challenge.days, filled: challenge.doneDays)
                MoneySentence("Llevas \(Spanish.days(challenge.doneDays)) · vas ahorrando ", .money(savedCents))
                .font(.subheadline)
                .foregroundStyle(Palette.inkMid)
            }
            .cardStyle()
            if let errorMessage {
                InlineMessage(.error, errorMessage)
            }
            HStack(spacing: Layout.spacing) {
                Button(isWorking ? "…" : "Reiniciar") { run(reset: true) }
                    .buttonStyle(.cqGhost)
                Button(checkedToday ? "Ya marcaste hoy ✓" : (isWorking ? "…" : "Sigo en el reto 💪")) { run(reset: false) }
                    .buttonStyle(.cqPrimary)
                    .disabled(checkedToday)
            }
            .disabled(isWorking)
        }
    }

    private func run(reset: Bool) {
        isWorking = true
        errorMessage = nil
        Task {
            defer { isWorking = false }
            do {
                _ = reset
                    ? try await app.services.challenges.reset(challenge.id)
                    : try await app.services.challenges.check(challenge.id)
            } catch {
                errorMessage =
                    (error as? LocalizedError)?.errorDescription
                    ?? (reset ? "No pudimos saltar el reto" : "No pudimos marcar el día")
            }
            // Refresh even after a failure: a 409 means it was already checked, and the refetch locks the button.
            await app.store.challenge.load()
        }
    }
}
