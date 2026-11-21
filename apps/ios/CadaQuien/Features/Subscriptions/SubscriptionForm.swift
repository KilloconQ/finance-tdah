import CadaQuienKit
import SwiftUI

struct SubscriptionForm: View {
    @Bindable var model: SubscriptionFormModel
    let onSaved: () -> Void
    @Environment(AppModel.self) private var app

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                FormField(title: "Nombre", text: $model.draft.name, prompt: "Ej: Netflix")
                FormField(title: "Categoría", text: $model.draft.category, prompt: "Ej: Entretenimiento")
                AmountField(text: $model.draft.amountText, title: "Monto (en pesos)")
                VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                    Text("Frecuencia").font(.subheadline).foregroundStyle(Palette.inkMid)
                    HStack(spacing: Layout.spacingSmall) {
                        Chip(title: "Mensual", isSelected: model.draft.cadence == .monthly) { model.draft.cadence = .monthly }
                        Chip(title: "Anual", isSelected: model.draft.cadence == .yearly) { model.draft.cadence = .yearly }
                    }
                }
                DatePicker("Próximo cobro", selection: nextChargeDate, displayedComponents: .date)
                    .environment(\.locale, Locale(identifier: "es_MX"))
                    .frame(minHeight: Layout.minTap)
                if !model.draft.canSave {
                    Text("Completa nombre, categoría, monto y fecha del próximo cobro.")
                        .font(.footnote)
                        .foregroundStyle(Palette.inkMid)
                }
                if let message = model.errorMessage { InlineMessage(.error, message) }
                Button(model.isSaving ? "Guardando…" : (model.isEditing ? "Guardar cambios" : "Agregar suscripción")) {
                    Task { if await model.save(app: app) { onSaved() } }
                }
                .buttonStyle(.cqPrimary)
                .disabled(model.isSaving || !model.draft.canSave)
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.bg)
    }

    /// The picker works with a `Date` at noon; the draft keeps a plain calendar day, so nothing shifts with time zones.
    private var nextChargeDate: Binding<Date> {
        Binding(
            get: { model.draft.nextCharge.date() ?? Date() },
            set: { model.draft.nextCharge = CalendarDay($0) })
    }
}
