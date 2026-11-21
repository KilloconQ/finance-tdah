import CadaQuienKit
import SwiftUI

/// The expense / income / transfer form, shared by "Registrar" and "Editar gasto".
struct ExpenseForm: View {
    @Bindable var model: ExpenseFormModel
    let onSaved: () -> Void
    @Environment(AppModel.self) private var app

    var body: some View {
        let accounts = app.store.accounts.value ?? []
        let envelopes = app.store.envelopes.value ?? []
        let available = ExpenseFormRules.availableAccounts(for: model.draft.kind, accounts: accounts)
        let chosen = accounts.first { $0.id == model.draft.accountId }
        let accountEnvelopes = envelopes.filter { $0.accountId == model.draft.accountId }

        ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                kindChips
                AmountField(text: $model.draft.amountText, title: "Cuánto")
                if model.draft.kind == .expense { categoryChips }
                FormField(title: "Nota", text: $model.draft.note, prompt: "Ej: Café con Lu")
                    .onChange(of: model.draft.note) { _, note in
                        if note.count > ExpenseFormRules.noteLimit { model.draft.note = String(note.prefix(ExpenseFormRules.noteLimit)) }
                    }
                if !available.isEmpty {
                    accountPicker(title: accountTitle, selection: $model.draft.accountId, accounts: available)
                    if let note = ExpenseFormRules.lockedNote(
                        kind: model.draft.kind, account: chosen, envelopes: envelopes, hidden: app.hidesBalances)
                    {
                        Text(note).font(.footnote).foregroundStyle(Palette.warn)
                    }
                }
                if model.draft.kind == .expense, !accountEnvelopes.isEmpty {
                    envelopePicker(accountEnvelopes)
                }
                if model.draft.kind == .transfer {
                    accountPicker(
                        title: "Hacia qué cuenta", selection: $model.draft.toAccountId,
                        accounts: accounts.filter { $0.id != model.draft.accountId })
                }
                footer(accounts: accounts)
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Palette.bg)
        .task {
            async let a: Void = app.store.accounts.loadIfNeeded()
            async let e: Void = app.store.envelopes.loadIfNeeded()
            _ = await (a, e)
        }
        .onChange(of: model.draft) { _, _ in model.normalize(accounts: accounts, envelopes: envelopes) }
        .onChange(of: accounts) { _, _ in model.normalize(accounts: accounts, envelopes: envelopes) }
        .onChange(of: envelopes) { _, _ in model.normalize(accounts: accounts, envelopes: envelopes) }
        .onAppear { model.normalize(accounts: accounts, envelopes: envelopes) }
    }

    private var accountTitle: String {
        switch model.draft.kind {
        case .expense: "De qué cuenta"
        case .income: "A qué cuenta"
        case .transfer: "Desde qué cuenta"
        }
    }

    private var kindChips: some View {
        FlowLayout(spacing: Layout.spacingSmall) {
            ForEach([(ExpenseKind.expense, "Gasto"), (.income, "Ingreso"), (.transfer, "Transferencia")], id: \.0) { kind, title in
                Chip(title: title, isSelected: model.draft.kind == kind) { model.draft.kind = kind }
            }
        }
    }

    private var categoryChips: some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            Text("En qué").font(.subheadline).foregroundStyle(Palette.inkMid)
            FlowLayout(spacing: Layout.spacingSmall) {
                ForEach(ExpenseCategory.all) { category in
                    Chip(title: "\(category.emoji) \(category.label)", isSelected: model.draft.category == category.id) {
                        model.draft.category = category.id
                    }
                }
            }
        }
    }

    private func accountPicker(title: String, selection: Binding<EntityID?>, accounts: [Account]) -> some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            Text(title).font(.subheadline).foregroundStyle(Palette.inkMid)
            Picker(title, selection: selection) {
                ForEach(accounts) { account in
                    Text(account.name).tag(Optional(account.id))
                }
            }
            .pickerStyle(.menu)
            .labelsHidden()
            .frame(maxWidth: .infinity, minHeight: Layout.minTap, alignment: .leading)
            .padding(.horizontal, Layout.spacing)
            .background(Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
            .overlay { RoundedRectangle(cornerRadius: Layout.radiusControl).stroke(Palette.line, lineWidth: Layout.hairline) }
        }
    }

    private func envelopePicker(_ envelopes: [Envelope]) -> some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            Text("De qué cajita (opcional)").font(.subheadline).foregroundStyle(Palette.inkMid)
            Picker("Cajita", selection: $model.draft.envelopeId) {
                Text("Ninguna").tag(EntityID?.none)
                ForEach(envelopes) { envelope in
                    Text("\(envelope.emoji) \(envelope.name) · \(Money.format(cents: envelope.balanceCents, hidden: app.hidesBalances))")
                        .tag(Optional(envelope.id))
                }
            }
            .pickerStyle(.menu)
            .labelsHidden()
            .frame(maxWidth: .infinity, minHeight: Layout.minTap, alignment: .leading)
            .padding(.horizontal, Layout.spacing)
            .background(Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
            .overlay { RoundedRectangle(cornerRadius: Layout.radiusControl).stroke(Palette.line, lineWidth: Layout.hairline) }
        }
    }

    private func footer(accounts: [Account]) -> some View {
        VStack(spacing: Layout.spacing) {
            if let missing = ExpenseFormRules.missingMessage(model.draft, accounts: accounts) {
                Text(missing).font(.footnote).foregroundStyle(Palette.inkMid).frame(maxWidth: .infinity, alignment: .leading)
            }
            if let message = model.errorMessage {
                InlineMessage(.error, message)
            }
            Button(saveTitle(app.connectivity.isOnline)) {
                Task { if await model.save(app: app) { onSaved() } }
            }
            .buttonStyle(.cqPrimary)
            .disabled(model.isSaving || !ExpenseFormRules.canSave(model.draft, accounts: accounts))
        }
    }

    private func saveTitle(_ isOnline: Bool) -> String {
        if model.isSaving { return isOnline ? "Guardando…" : "Esperando conexión…" }
        if model.isEditing { return "Guardar cambios" }
        switch model.draft.kind {
        case .expense: return "Guardar gasto"
        case .income: return "Guardar ingreso"
        case .transfer: return "Transferir"
        }
    }
}
