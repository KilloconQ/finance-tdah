import CadaQuienKit
import SwiftUI

/// What the sheet is for: a new income, or one that already exists.
enum IncomeEditing: Identifiable {
    case new
    case edit(ScheduledIncome)

    var id: String {
        switch self {
        case .new: "new"
        case .edit(let income): income.id.rawValue
        }
    }

    var income: ScheduledIncome? {
        if case .edit(let income) = self { income } else { nil }
    }
}

/// "Nuevo ingreso" / "Editar ingreso".
struct IncomeSheet: View {
    @State private var model: IncomeFormModel
    @State private var isConfirmingDelete = false
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss

    init(editing: IncomeEditing) {
        _model = State(initialValue: IncomeFormModel(original: editing.income))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Layout.spacingSection) {
                    FormField(title: "Nombre", text: $model.draft.name, prompt: "Ej: Nómina")
                    AmountField(text: $model.draft.amountText, title: "Monto (opcional, en pesos)")
                    VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                        Text("Cada cuándo").font(.subheadline).foregroundStyle(Palette.inkMid)
                        FlowLayout(spacing: Layout.spacingSmall) {
                            ForEach(IncomeFrequency.allCases, id: \.self) { frequency in
                                Chip(title: frequency.label, isSelected: model.draft.frequency == frequency) {
                                    model.draft.frequency = frequency
                                }
                            }
                        }
                    }
                    DatePicker(
                        model.draft.frequency == .once ? "Fecha" : "Primer pago", selection: startsOn, displayedComponents: .date
                    )
                    .environment(\.locale, Locale(identifier: "es_MX"))
                    .frame(minHeight: Layout.minTap)
                    if let message = model.errorMessage { InlineMessage(.error, message) }
                    Button(model.isSaving ? "Guardando…" : (model.isEditing ? "Guardar cambios" : "Agregar ingreso")) {
                        Task { if await model.save(app: app) { dismiss() } }
                    }
                    .buttonStyle(.cqPrimary)
                    .disabled(model.isSaving || !model.draft.canSave)
                    if model.isEditing {
                        Button("Eliminar ingreso") { isConfirmingDelete = true }
                            .buttonStyle(.cqGhost)
                            .disabled(model.isSaving)
                    }
                }
                .padding(Layout.screenPadding)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Palette.bg)
            .navigationTitle(model.isEditing ? "Editar ingreso" : "Nuevo ingreso")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
            }
            .confirmationDialog("¿Eliminar este ingreso?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                Button("Eliminar", role: .destructive) {
                    Task { if await model.delete(app: app) { dismiss() } }
                }
            } message: {
                Text("Dejará de aparecer en tu calendario.")
            }
        }
    }

    /// The picker works with a `Date` at noon; the draft keeps a plain calendar day, so nothing shifts with time zones.
    private var startsOn: Binding<Date> {
        Binding(
            get: { model.draft.startsOn.date() ?? Date() },
            set: { model.draft.startsOn = CalendarDay($0) })
    }
}
