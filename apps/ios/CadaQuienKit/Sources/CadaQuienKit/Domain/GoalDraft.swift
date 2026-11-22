import Foundation

/// The new/edit jar form. New jars start prefilled like the web so a first jar is two taps away.
public struct GoalDraft: Equatable, Sendable {
    public static let emojiOptions = ["🌵", "🛟", "💻", "🎁", "🌿", "✈️"]
    public static let presetTargetsCents = [100_000, 300_000, 500_000, 1_000_000, 2_000_000]

    public var name = "Nuevo frasco"
    public var emoji = "🌿"
    public var targetText = "5000"

    public init() {}

    public init(_ goal: Goal) {
        name = goal.name
        emoji = goal.emoji
        targetText = Money.editableText(cents: goal.targetCents)
    }

    public struct Failure: Error, Equatable, LocalizedError {
        public let message: String
        init(_ message: String) { self.message = message }
        public var errorDescription: String? { message }
    }

    public var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !targetText.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func targetCents() throws -> Int {
        switch Money.parse(targetText) {
        case .success(let cents):
            guard cents <= 2_147_483_647 else { throw Failure("El monto es demasiado grande") }
            return cents
        case .failure(let error):
            let specific = error == .tooManyDecimals || error == .scientific
            throw Failure(specific ? (error.errorDescription ?? "") : "La meta debe ser mayor a $0")
        }
    }

    private var cleanName: String {
        String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(80))
    }

    public func newGoal() -> Result<GoalsService.NewGoal, Failure> {
        Result { GoalsService.NewGoal(name: cleanName, emoji: emoji, targetCents: try targetCents()) }
            .mapError { $0 as? Failure ?? Failure("No pudimos crear el frasco") }
    }

    public func update() -> Result<GoalsService.GoalUpdate, Failure> {
        Result { GoalsService.GoalUpdate(name: cleanName, emoji: emoji, targetCents: try targetCents()) }
            .mapError { $0 as? Failure ?? Failure("No pudimos actualizar el frasco") }
    }
}
