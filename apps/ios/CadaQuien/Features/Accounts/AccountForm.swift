import CadaQuienKit
import SwiftUI

struct AccountForm: View {
    @Bindable var model: AccountFormModel
    let onSaved: () -> Void
    @Environment(AppModel.self) private var app

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                FormField(title: "Nombre", text: $model.draft.name, prompt: "Ej: BBVA Débito")
                    .onChange(of: model.draft.name) { _, name in
                        if name.count > 60 { model.draft.name = String(name.prefix(60)) }
                    }
                if model.draft.name.isEmpty {
                    Text("Ponle un nombre a la cuenta.").font(.footnote).foregroundStyle(Palette.inkSoft)
                }
                typeChips
                AmountField(text: $model.draft.balanceText, title: model.draft.type == .credito ? "¿Cuánto debes?" : "Saldo actual")
                if model.draft.type.showsBankDetails {
                    FormField(title: "Banco (opcional)", text: $model.draft.institution, prompt: "BBVA")
                    FormField(title: "Últimos 4", text: $model.draft.last4, prompt: "4521")
                        .keyboardType(.numberPad)
                        .onChange(of: model.draft.last4) { _, value in
                            let digits = String(value.filter(\.isNumber).prefix(4))
                            if digits != value { model.draft.last4 = digits }
                        }
                }
                if model.draft.type == .credito {
                    HStack(spacing: Layout.spacing) {
                        FormField(title: "Día de corte", text: $model.draft.cutoffText, prompt: "10")
                            .keyboardType(.numberPad)
                        FormField(title: "Día de pago", text: $model.draft.paymentText, prompt: "25")
                            .keyboardType(.numberPad)
                    }
                }
                if let original = model.original, original.type == .credito, original.cutoffDay != nil, original.paymentDay != nil {
                    CardStatementView(accountId: original.id)
                }
                if let message = model.errorMessage {
                    InlineMessage(.error, message)
                }
                Button(model.isSaving ? "Guardando…" : (model.isEditing ? "Guardar cambios" : "Agregar cuenta")) {
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

    private var typeChips: some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            Text("Tipo").font(.subheadline).foregroundStyle(Palette.inkMid)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: Layout.spacingSmall)], alignment: .leading, spacing: Layout.spacingSmall) {
                ForEach(AccountType.allCases, id: \.self) { type in
                    Chip(title: "\(type.emoji) \(type.label)", isSelected: model.draft.type == type) { model.draft.type = type }
                }
            }
        }
    }
}
