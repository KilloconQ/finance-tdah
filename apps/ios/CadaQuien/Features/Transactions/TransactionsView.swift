import CadaQuienKit
import SwiftUI

/// "Movimientos": everything you have logged, grouped by day.
struct TransactionsView: View {
    @Environment(AppModel.self) private var app
    @Environment(Navigator.self) private var navigator
    @State private var pendingDelete: Expense?
    @State private var errorMessage: String?
    @State private var notice: String?

    var body: some View {
        ResourceView(resource: app.store.expenses) { expenses in
            if expenses.isEmpty {
                ContentUnavailableView {
                    Label("Aún no registraste nada", systemImage: "tray")
                } description: {
                    Text("Cada gasto que anotes aparecerá aquí, agrupado por día.")
                } actions: {
                    Button("Registrar movimiento") { navigator.isAddingExpense = true }
                        .buttonStyle(.cqPrimary)
                        .frame(maxWidth: 280)
                }
            } else {
                list(DayGrouping.group(expenses))
            }
        }
        .background(Palette.bg)
        .navigationTitle("Movimientos")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Registrar movimiento", systemImage: "plus") { navigator.isAddingExpense = true }
            }
        }
        .refreshable { await app.store.expenses.load() }
        .confirmationDialog(
            "¿Borrar este movimiento?", isPresented: isConfirmingDelete, titleVisibility: .visible, presenting: pendingDelete
        ) { expense in
            Button("Borrar", role: .destructive) { delete(expense) }
            Button("Cancelar", role: .cancel) {}
        } message: { _ in
            Text("Esta acción no se puede deshacer.")
        }
    }

    private var isConfirmingDelete: Binding<Bool> {
        Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
    }

    private func list(_ groups: [DayGroup]) -> some View {
        List {
            if let notice {
                InlineMessage(.success, notice)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
            }
            if let errorMessage {
                InlineMessage(.error, errorMessage)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
            }
            ForEach(groups) { group in
                Section {
                    ForEach(group.expenses) { expense in
                        NavigationLink(value: Route.editExpense(expense.id)) {
                            ExpenseRow(expense: expense)
                        }
                        .listRowBackground(Palette.surface)
                        .swipeActions(edge: .trailing) {
                            Button("Borrar", systemImage: "trash", role: .destructive) { pendingDelete = expense }
                        }
                    }
                } header: {
                    Text(Self.dayTitle(group.day))
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Palette.inkMid)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
    }

    private func delete(_ expense: Expense) {
        errorMessage = nil
        Task {
            do {
                try await app.services.expenses.delete(expense.id)
                await app.store.refreshMoney()
                notice = "Gasto borrado"
                try? await Task.sleep(for: .seconds(1.4))
                notice = nil
            } catch {
                errorMessage = "No se pudo borrar el gasto. Intenta de nuevo."
            }
        }
    }

    /// "jueves, 20 nov", in Mexican Spanish.
    static func dayTitle(_ day: CalendarDay) -> String {
        guard let date = day.date() else { return day.rawValue }
        var style = Date.FormatStyle.dateTime.weekday(.wide).day().month(.abbreviated)
        style.locale = Locale(identifier: "es_MX")
        return date.formatted(style)
    }
}
