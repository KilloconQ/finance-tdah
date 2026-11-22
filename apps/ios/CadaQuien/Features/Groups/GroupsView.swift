import CadaQuienKit
import SwiftUI

/// "Grupos": shared expenses and who owes whom.
struct GroupsView: View {
    @Environment(AppModel.self) private var app
    @Environment(Navigator.self) private var navigator
    @State private var isCreating = false
    @State private var answeringId: EntityID?
    @State private var errorMessage: String?

    var body: some View {
        let store = app.store
        ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                if let invitations = store.invitations.value, !invitations.isEmpty {
                    invitationsSection(invitations)
                }
                if let errorMessage { InlineMessage(.error, errorMessage) }
                if let groups = store.groups.value, !groups.isEmpty {
                    totals(groups)
                }
                ResourceSection(title: "Mis grupos", subject: "tus grupos", resource: store.groups) { groups in
                    if groups.isEmpty {
                        if answeringId == nil {
                            EmptyBlock(
                                title: "Aún no tienes grupos",
                                hint: "Crea uno para dividir gastos y saber quién le debe a quién.",
                                actionTitle: "Crear grupo"
                            ) { isCreating = true }
                        }
                    } else {
                        ForEach(groups) { group in groupRow(group) }
                    }
                }
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Palette.bg)
        .navigationTitle("Grupos")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Nuevo grupo", systemImage: "plus") { isCreating = true }
            }
        }
        .refreshable { await reload() }
        .task { await load() }
        .sheet(isPresented: $isCreating) {
            CreateGroupSheet { isCreating = false }
                .presentationDetents([.medium])
        }
    }

    private func totals(_ groups: [ExpenseGroup]) -> some View {
        let totals = GroupRules.totals(groups)
        return HStack(spacing: Layout.spacing) {
            VStack(alignment: .leading, spacing: Layout.spacingTight) {
                Text("Te deben").font(.footnote).foregroundStyle(Palette.inkMid)
                MoneyText(cents: totals.owedToYou).font(.title3.bold()).foregroundStyle(Palette.sageStrong)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .leading, spacing: Layout.spacingTight) {
                Text("Debes").font(.footnote).foregroundStyle(Palette.inkMid)
                MoneyText(cents: totals.youOwe).font(.title3.bold()).foregroundStyle(Palette.danger)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .cardStyle()
    }

    private func groupRow(_ group: ExpenseGroup) -> some View {
        NavigationRow(route: .group(group.id)) {
            HStack(spacing: Layout.spacing) {
                AvatarView(name: group.name)
                VStack(alignment: .leading, spacing: Layout.spacingTight) {
                    Text(group.name).foregroundStyle(Palette.ink)
                    Text(group.members.count == 1 ? "1 miembro" : "\(group.members.count) miembros")
                        .font(.footnote)
                        .foregroundStyle(Palette.inkMid)
                }
            }
        } trailing: {
            if group.myBalanceCents == 0 {
                Text("A mano").font(.footnote).foregroundStyle(Palette.inkMid)
            } else {
                VStack(alignment: .trailing, spacing: Layout.spacingTight) {
                    MoneyText(cents: abs(group.myBalanceCents))
                        .foregroundStyle(group.myBalanceCents > 0 ? Palette.sageStrong : Palette.danger)
                    Text(group.myBalanceCents > 0 ? "te deben" : "debes")
                        .font(.footnote)
                        .foregroundStyle(Palette.inkMid)
                }
            }
        }
    }

    private func invitationsSection(_ invitations: [GroupInvitation]) -> some View {
        VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            SectionHeader("Invitaciones")
            ForEach(invitations) { invitation in
                VStack(alignment: .leading, spacing: Layout.spacing) {
                    VStack(alignment: .leading, spacing: Layout.spacingTight) {
                        Text(invitation.groupName).font(.body.bold()).foregroundStyle(Palette.ink)
                        Text("\(invitation.invitedByName) te invitó").font(.footnote).foregroundStyle(Palette.inkMid)
                    }
                    HStack(spacing: Layout.spacingSmall) {
                        Button("Declinar") { answer(invitation, accept: false) }.buttonStyle(.cqGhost)
                        Button("Aceptar") { answer(invitation, accept: true) }.buttonStyle(.cqPrimary)
                    }
                    .disabled(answeringId != nil)
                }
                .cardStyle()
            }
        }
    }

    private func answer(_ invitation: GroupInvitation, accept: Bool) {
        answeringId = invitation.id
        errorMessage = nil
        Task {
            defer { answeringId = nil }
            do {
                if accept { _ = try await app.services.invitations.accept(invitation.id) } else {
                    try await app.services.invitations.decline(invitation.id)
                }
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos responder la invitación"
            }
            await app.store.invitations.load()
            await app.store.groups.load()
        }
    }

    private func load() async {
        let store = app.store
        async let g: Void = store.groups.loadIfNeeded()
        async let i: Void = store.invitations.loadIfNeeded()
        _ = await (g, i)
    }

    private func reload() async {
        let store = app.store
        async let g: Void = store.groups.load()
        async let i: Void = store.invitations.load()
        _ = await (g, i)
    }
}
