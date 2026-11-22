import CadaQuienKit
import Foundation
import WidgetKit

/// Sends one quick expense and makes the widget notice.
enum QuickAdd {
    static func send(_ request: ExpensesService.NewExpense) async throws {
        guard SharedClient.isSignedIn else { throw QuickAddError.notSignedIn }
        do {
            _ = try await ExpensesService(client: SharedClient.make()).create(request)
        } catch APIError.unauthorized {
            SharedClient.tokens().clear()
            throw QuickAddError.notSignedIn
        } catch {
            throw QuickAddError.message((error as? LocalizedError)?.errorDescription ?? "No pudimos anotar el gasto.")
        }
        WidgetCenter.shared.reloadAllTimelines()
    }
}
