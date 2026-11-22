import CadaQuienKit
import SwiftUI

struct GoalForm: View {
    @Bindable var model: GoalFormModel
    let onSaved: () -> Void
    @Environment(AppModel.self) private var app

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                    AmountField(text: $model.draft.targetText, title: "¿Cuánto necesitas?")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: Layout.spacingSmall) {
                            ForEach(GoalDraft.presetTargetsCents, id: \.self) { cents in
                                let text = Money.editableText(cents: cents)
                                Chip(title: Money.format(cents: cents).replacingOccurrences(of: ".00", with: ""), isSelected: model.draft.targetText == text) {
                                    model.draft.targetText = text
                                }
                            }
                        }
                    }
                }
                FormField(title: "Nombre", text: $model.draft.name, prompt: "Ej: Vacaciones a Oaxaca")
                    .onChange(of: model.draft.name) { _, name in
                        if name.count > 80 { model.draft.name = String(name.prefix(80)) }
                    }
                EmojiPicker(options: GoalDraft.emojiOptions, selection: $model.draft.emoji)
                if !model.draft.canSave {
                    Text("Completa el nombre y cuánto necesitas.").font(.footnote).foregroundStyle(Palette.inkMid)
                }
                if let message = model.errorMessage { InlineMessage(.error, message) }
                Button(model.isSaving ? "Guardando…" : (model.isEditing ? "Guardar cambios" : "Crear frasco")) {
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
}
