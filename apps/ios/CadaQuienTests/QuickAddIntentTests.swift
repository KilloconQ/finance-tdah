import CadaQuienKit
import Foundation
import Testing

@testable import CadaQuien

/// Runs the Siri/Shortcuts intent and the widget's preset button against the real API, using the same shared
/// Keychain token the widget reads. Opt-in: start the API (see APIContractTests) and run with
/// `TEST_RUNNER_CADAQUIEN_INTENT_TEST=1 xcodebuild test ...`.
@Suite(.enabled(if: ProcessInfo.processInfo.environment["CADAQUIEN_INTENT_TEST"] != nil), .serialized)
struct QuickAddIntentTests {
    private let client = SharedClient.make()

    private func signIn() async throws {
        SharedClient.tokens().clear()
        try await AuthService(client: client).signIn(email: "ios-contract@test.local", password: "correct-horse-battery")
        #expect(SharedClient.isSignedIn)
    }

    @Test func theSiriIntentLogsAnExpenseWithTheSharedToken() async throws {
        try await signIn()
        let service = ExpensesService(client: SharedClient.make())

        var intent = AddExpenseIntent()
        intent.amount = 87.5
        intent.category = .cafe
        intent.note = "Prueba de intent"
        _ = try await intent.perform()

        let created = try await service.list().first { $0.description == "Prueba de intent" }
        let expense = try #require(created)
        #expect(expense.amountCents == 8_750)
        #expect(expense.category == "café")
        #expect(expense.accountId == nil)
        try await service.delete(expense.id)
    }

    @Test func theWidgetsPresetButtonLogsItsExpense() async throws {
        try await signIn()
        let service = ExpensesService(client: SharedClient.make())
        let before = try await service.list().count

        _ = try await AddPresetExpenseIntent(presetId: "comida-120").perform()

        let after = try await service.list()
        #expect(after.count == before + 1)
        let expense = try #require(after.first { $0.category == "comida" && $0.amountCents == 12_000 && $0.description == "Comida" })
        try await service.delete(expense.id)
    }

    @Test func withoutASessionTheIntentAsksToSignIn() async throws {
        SharedClient.tokens().clear()
        var intent = AddExpenseIntent()
        intent.amount = 10
        await #expect(throws: QuickAddError.self) { _ = try await intent.perform() }
    }

    @Test func anUnknownPresetFailsCleanly() async throws {
        try await signIn()
        await #expect(throws: QuickAddError.self) { _ = try await AddPresetExpenseIntent(presetId: "no-existe").perform() }
    }
}
