import AppIntents

/// What Siri and the Shortcuts app offer without any setup.
struct CadaQuienShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddExpenseIntent(),
            phrases: [
                "Anota un gasto en \(.applicationName)",
                "Registra un gasto en \(.applicationName)",
                "Anota un gasto de \(\.$category) en \(.applicationName)",
            ],
            shortTitle: "Anotar gasto",
            systemImageName: "plus.circle"
        )
    }
}
