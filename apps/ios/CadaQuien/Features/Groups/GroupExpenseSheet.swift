import CadaQuienKit
import SwiftUI

/// Adds or edits a shared expense: who paid, who shares it, and equal or custom amounts.
struct GroupExpenseSheet: View {
    let group: ExpenseGroup
    /// nil when adding.
    let editing: SharedExpense?
    let onDone: () -> Void
    @Environment(AppModel.self) private var app
    @State private var draft: SharedExpenseDraft
    @State private var errorMessage: String?
    @State private var isSaving = false

    init(group: ExpenseGroup, me: String, editing: SharedExpense?, onDone: @escaping () -> Void) {
        self.group = group
        self.editing = editing
        self.onDone = onDone
        _draft = State(initialValue: editing.map(SharedExpenseDraft.init) ?? SharedExpenseDraft(me: me, members: group.members))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Layout.spacingSection) {
                    FormField(title: "Descripción", text: $draft.description)
                    AmountField(text: $draft.amountText, title: "Monto (en pesos)")
                    payerPicker
                    participants
                    if let errorMessage { InlineMessage(.error, errorMessage) }
                    Button(isSaving ? "Guardando…" : (editing == nil ? "Agregar gasto" : "Guardar cambios"), action: save)
                        .buttonStyle(.cqPrimary)
                        .disabled(isSaving || !draft.canSave)
                }
                .padding(Layout.screenPadding)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Palette.bg)
            .navigationTitle(editing == nil ? "Nuevo gasto" : "Editar gasto")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancelar", action: onDone) } }
        }
    }

    private func name(_ member: GroupMember) -> String {
        member.userId == app.user?.id ? "Tú" : (member.name.isEmpty ? "Alguien" : member.name)
    }

    private var payerPicker: some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            Text("Pagó").font(.subheadline).foregroundStyle(Palette.inkMid)
            Picker("Pagó", selection: $draft.paidBy) {
                ForEach(group.members) { member in Text(name(member)).tag(member.userId) }
            }
            .pickerStyle(.menu)
            .labelsHidden()
            .frame(maxWidth: .infinity, minHeight: Layout.minTap, alignment: .leading)
            .padding(.horizontal, Layout.spacing)
            .background(Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
            .overlay { RoundedRectangle(cornerRadius: Layout.radiusControl).stroke(Palette.line, lineWidth: Layout.hairline) }
        }
    }

    private var participants: some View {
        VStack(alignment: .leading, spacing: Layout.spacing) {
            Text("Se divide entre").font(.subheadline).foregroundStyle(Palette.inkMid)
            ForEach(group.members) { member in
                HStack(spacing: Layout.spacing) {
                    Toggle(name(member), isOn: participantBinding(member.userId))
                    if draft.isCustom, draft.participants.contains(member.userId) {
                        TextField("Parte de \(name(member))", text: shareBinding(member.userId), prompt: Text("0"))
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .monospacedDigit()
                            .frame(maxWidth: 110, minHeight: Layout.minTap)
                            .padding(.horizontal, Layout.spacingSmall)
                            .background(Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
                            .overlay { RoundedRectangle(cornerRadius: Layout.radiusControl).stroke(Palette.line, lineWidth: Layout.hairline) }
                    }
                }
                .frame(minHeight: Layout.minTap)
            }
            Toggle("Montos personalizados", isOn: $draft.isCustom)
                .frame(minHeight: Layout.minTap)
        }
        .cardStyle()
    }

    private func participantBinding(_ id: String) -> Binding<Bool> {
        Binding(
            get: { draft.participants.contains(id) },
            set: { isOn in
                if isOn { draft.participants.insert(id) } else { draft.participants.remove(id) }
            })
    }

    private func shareBinding(_ id: String) -> Binding<String> {
        Binding(get: { draft.customAmounts[id] ?? "" }, set: { draft.customAmounts[id] = $0 })
    }

    private func save() {
        let day = editing?.date ?? CalendarDay(Date())
        let request: GroupsService.SharedExpenseInput
        switch draft.request(date: day, members: group.members) {
        case .success(let value): request = value
        case .failure(let failure): errorMessage = failure.message; return
        }
        errorMessage = nil
        isSaving = true
        Task {
            defer { isSaving = false }
            do {
                if let editing {
                    _ = try await app.services.groups.updateExpense(in: group.id, editing.id, request)
                } else {
                    _ = try await app.services.groups.addExpense(to: group.id, request)
                }
                await app.store.refreshGroup(group.id)
                onDone()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos guardar el gasto"
            }
        }
    }
}
