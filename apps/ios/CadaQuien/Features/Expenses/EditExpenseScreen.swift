import CadaQuienKit
import SwiftUI

/// "Editar gasto": pushed from Movimientos.
struct EditExpenseScreen: View {
    let expenseId: EntityID
    @Environment(AppModel.self) private var app

    var body: some View {
        ResourceView(resource: app.store.expenses) { expenses in
            if let expense = expenses.first(where: { $0.id == expenseId }) {
                EditExpenseForm(expense: expense)
            } else {
                ContentUnavailableView(
                    "No encontramos ese movimiento", systemImage: "questionmark.folder",
                    description: Text("Puede que lo hayas borrado o que el enlace esté roto."))
            }
        }
        .navigationTitle("Editar gasto")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct EditExpenseForm: View {
    @State private var model: ExpenseFormModel
    @Environment(\.dismiss) private var dismiss

    init(expense: Expense) {
        _model = State(initialValue: ExpenseFormModel(mode: .edit(expense)))
    }

    var body: some View {
        ExpenseForm(model: model) { dismiss() }
    }
}
