/// The fixed choices of the onboarding, taken from the web app.
enum OnboardingContent {
    struct PainPoint: Identifiable, Hashable {
        let id: String
        let emoji: String
        let label: String
    }

    struct GoalPreset: Identifiable, Hashable {
        let name: String
        let emoji: String
        let targetCents: Int
        var id: String { name }
    }

    static let painPoints = [
        PainPoint(id: "impulso", emoji: "🌪", label: "Gasto de impulso"),
        PainPoint(id: "olvido", emoji: "🫥", label: "Olvido en qué gasté"),
        PainPoint(id: "subs", emoji: "🔁", label: "Suscripciones que ya no uso"),
        PainPoint(id: "saldo", emoji: "😵‍💫", label: "No sé cuánto tengo realmente"),
        PainPoint(id: "pago", emoji: "⏰", label: "Pago tarjetas tarde"),
    ]

    static let goalPresets = [
        GoalPreset(name: "Vacaciones a Oaxaca", emoji: "🌵", targetCents: 500_000),
        GoalPreset(name: "Laptop nueva", emoji: "💻", targetCents: 3_000_000),
        GoalPreset(name: "Cojín mensual", emoji: "🛟", targetCents: 200_000),
        GoalPreset(name: "Regalos", emoji: "🎁", targetCents: 150_000),
    ]
}
