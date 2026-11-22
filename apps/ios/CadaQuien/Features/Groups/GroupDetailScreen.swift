import CadaQuienKit
import SwiftUI

/// One group: your balance, who owes whom, the expenses and the members.
struct GroupDetailScreen: View {
    let groupId: EntityID
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var sheet: GroupSheet?
    @State private var pendingSettle: GroupDebt?
    @State private var pendingDelete: SharedExpense?
    @State private var isConfirmingLeave = false
    @State private var errorMessage: String?

    enum GroupSheet: Identifiable {
        case expense(SharedExpense?)
        case invite

        var id: String {
            switch self {
            case .expense(let expense): "expense-\(expense?.id.rawValue ?? "new")"
            case .invite: "invite"
            }
        }
    }

    var body: some View {
        ResourceView(resource: app.store.groupDetail(groupId)) { detail in
            content(detail)
        }
        .background(Palette.bg)
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await app.store.groupDetail(groupId).load() }
        .sheet(item: $sheet) { sheet in
            switch sheet {
            case .expense(let expense):
                if let group = app.store.groupDetail(groupId).value?.group {
                    GroupExpenseSheet(group: group, me: app.user?.id ?? "", editing: expense) { self.sheet = nil }
                }
            case .invite:
                InviteMemberSheet(groupId: groupId) { self.sheet = nil }
                    .presentationDetents([.medium])
            }
        }
    }

    private var me: String { app.user?.id ?? "" }

    private func content(_ detail: GroupDetail) -> some View {
        let names = Dictionary(uniqueKeysWithValues: detail.group.members.map { ($0.userId, $0.name) })
        return ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                if let errorMessage { InlineMessage(.error, errorMessage) }
                balanceCard(detail.group)
                debts(detail, names: names)
                expenses(detail, names: names)
                members(detail.group)
            }
            .padding(Layout.screenPadding)
            .padding(.bottom, Layout.minTap * 1.5)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .navigationTitle(detail.group.name)
        .safeAreaInset(edge: .bottom) {
            Button("Agregar gasto", systemImage: "plus") { sheet = .expense(nil) }
                .buttonStyle(.cqPrimary)
                .padding(.horizontal, Layout.screenPadding)
                .padding(.bottom, Layout.spacingSmall)
                .frame(maxWidth: 640)
        }
        .confirmationDialog(
            "Saldar deuda", isPresented: settleBinding, titleVisibility: .visible, presenting: pendingSettle
        ) { debt in
            Button("Saldar") { settle(debt) }
            Button("Cancelar", role: .cancel) {}
        } message: { debt in
            Text("¿Registrar el pago de \(Money.format(cents: debt.amountCents)) de \(names[debt.from] ?? "Alguien") a \(names[debt.to] ?? "Alguien")?")
        }
        .confirmationDialog(
            "Borrar gasto", isPresented: deleteBinding, titleVisibility: .visible, presenting: pendingDelete
        ) { expense in
            Button("Borrar", role: .destructive) { delete(expense) }
            Button("Cancelar", role: .cancel) {}
        } message: { _ in
            Text("¿Borrar este gasto? Los saldos se recalculan y no se puede deshacer.")
        }
        .confirmationDialog("Salir del grupo", isPresented: $isConfirmingLeave, titleVisibility: .visible) {
            Button("Salir", role: .destructive, action: leave)
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("¿Salir de este grupo? Solo puedes salir si no tienes deudas pendientes.")
        }
    }

    // MARK: Sections

    private func balanceCard(_ group: ExpenseGroup) -> some View {
        VStack(alignment: .leading, spacing: Layout.spacingTight) {
            Text(GroupRules.balanceTitle(group.myBalanceCents)).font(.subheadline).foregroundStyle(Palette.inkMid)
            MoneyText(cents: abs(group.myBalanceCents))
                .font(.system(.largeTitle, weight: .semibold))
                .foregroundStyle(group.myBalanceCents < 0 ? Palette.danger : Palette.ink)
        }
        .cardStyle()
    }

    private func debts(_ detail: GroupDetail, names: [String: String]) -> some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            SectionHeader("Quién le debe a quién")
            if detail.balances.debts.isEmpty {
                Text("Están a mano 🎉").foregroundStyle(Palette.inkMid)
            }
            ForEach(Array(detail.balances.debts.enumerated()), id: \.offset) { _, debt in
                HStack(spacing: Layout.spacing) {
                    AvatarView(name: names[GroupRules.otherParty(debt, me: me)] ?? "?")
                    VStack(alignment: .leading, spacing: Layout.spacingTight) {
                        Text(GroupRules.debtLabel(debt, me: me, names: names)).foregroundStyle(Palette.ink)
                        MoneyText(cents: debt.amountCents).font(.footnote).foregroundStyle(Palette.inkMid)
                    }
                    Spacer()
                    Button("Saldar") { pendingSettle = debt }
                        .font(.subheadline)
                        .padding(.horizontal, Layout.spacingLarge)
                        .frame(minHeight: Layout.minTap)
                        .background(Palette.sageBg, in: .capsule)
                }
                .cardStyle()
            }
        }
    }

    private func expenses(_ detail: GroupDetail, names: [String: String]) -> some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            SectionHeader("Gastos · \(detail.expenses.count)")
            if detail.expenses.isEmpty {
                Text("Todavía no hay gastos.").foregroundStyle(Palette.inkMid)
            }
            ForEach(detail.expenses) { expense in
                HStack(spacing: Layout.spacing) {
                    VStack(alignment: .leading, spacing: Layout.spacingTight) {
                        Text(expense.description).foregroundStyle(Palette.ink)
                        Text(GroupRules.payerLabel(expense, me: me, names: names)).font(.footnote).foregroundStyle(Palette.inkMid)
                    }
                    Spacer()
                    MoneyText(cents: expense.amountCents).foregroundStyle(Palette.ink)
                    if GroupRules.canEdit(expense, me: me) {
                        Menu("Opciones", systemImage: "ellipsis.circle") {
                            Button("Editar gasto", systemImage: "pencil") { sheet = .expense(expense) }
                            Button("Borrar gasto", systemImage: "trash", role: .destructive) { pendingDelete = expense }
                        }
                        .labelStyle(.iconOnly)
                        .frame(minWidth: Layout.minTap, minHeight: Layout.minTap)
                    }
                }
                .cardStyle()
            }
        }
    }

    private func members(_ group: ExpenseGroup) -> some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            SectionHeader("Miembros · \(group.members.count)")
            ForEach(group.members) { member in
                HStack(spacing: Layout.spacing) {
                    AvatarView(name: member.name)
                    VStack(alignment: .leading, spacing: Layout.spacingTight) {
                        Text(member.userId == me ? "\(member.name) (tú)" : member.name).foregroundStyle(Palette.ink)
                        Text(member.email).font(.footnote).foregroundStyle(Palette.inkMid)
                    }
                    Spacer()
                }
                .cardStyle()
            }
            Button("Invitar miembro", systemImage: "person.badge.plus") { sheet = .invite }
                .buttonStyle(.cqGhost)
            Button("Salir del grupo") { isConfirmingLeave = true }
                .buttonStyle(.cqDanger)
        }
    }

    // MARK: Actions

    private var settleBinding: Binding<Bool> {
        Binding(get: { pendingSettle != nil }, set: { if !$0 { pendingSettle = nil } })
    }

    private var deleteBinding: Binding<Bool> {
        Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
    }

    private func settle(_ debt: GroupDebt) {
        errorMessage = nil
        Task {
            do {
                _ = try await app.services.groups.settle(
                    in: groupId,
                    .init(fromUserId: debt.from, toUserId: debt.to, amountCents: debt.amountCents, date: CalendarDay(Date())))
                await app.store.refreshGroup(groupId)
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos registrar el pago"
            }
        }
    }

    private func delete(_ expense: SharedExpense) {
        errorMessage = nil
        Task {
            do {
                try await app.services.groups.deleteExpense(in: groupId, expense.id)
                await app.store.refreshGroup(groupId)
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos borrar el gasto"
            }
        }
    }

    private func leave() {
        errorMessage = nil
        Task {
            do {
                try await app.services.groups.leave(groupId)
                await app.store.groups.load()
                dismiss()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos sacarte del grupo"
            }
        }
    }
}
