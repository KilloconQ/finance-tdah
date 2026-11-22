import CadaQuienKit
import SwiftUI

/// "Frasco": the jar, putting money in, editing and deleting (which archives it).
struct GoalDetailScreen: View {
    let goalId: EntityID
    @Environment(AppModel.self) private var app
    @Environment(Navigator.self) private var navigator
    @Environment(\.dismiss) private var dismiss
    @State private var isConfirmingDelete = false
    @State private var isDeleting = false
    @State private var notice: String?
    @State private var errorMessage: String?
    @State private var celebrate = 0

    var body: some View {
        ResourceView(resource: app.store.goals) { goals in
            if let goal = goals.first(where: { $0.id == goalId }) {
                content(goal)
            } else {
                ContentUnavailableView {
                    Label("No encontramos ese frasco", systemImage: "questionmark.folder")
                } description: {
                    Text("Puede que lo hayas archivado o que el enlace esté roto.")
                } actions: {
                    Button("Volver a frascos") { dismiss() }.buttonStyle(.cqGhost).frame(maxWidth: 240)
                }
            }
        }
        .background(Palette.bg)
        .navigationTitle("Frasco")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Editar", systemImage: "pencil") { navigator.moneyPath.append(.editGoal(goalId)) }
            }
        }
        .sensoryFeedback(.success, trigger: celebrate)
    }

    private func content(_ goal: Goal) -> some View {
        let progress = JarProgress(currentCents: goal.currentCents, targetCents: goal.targetCents)
        return ScrollView {
            VStack(spacing: Layout.spacingSection) {
                VStack(spacing: Layout.spacingSmall) {
                    Text("\(goal.emoji) \(goal.name)").font(.title2.bold()).foregroundStyle(Palette.ink)
                    if let deadline = goal.deadline {
                        Text(DayFormat.short(deadline)).font(.subheadline).foregroundStyle(Palette.inkMid)
                    }
                }
                JarView(fraction: progress.fraction, emoji: goal.emoji)
                    .frame(width: 180, height: 240)
                MoneySentence(.money(goal.currentCents), " / ", .money(goal.targetCents))
                .font(.title3)
                .foregroundStyle(Palette.inkMid)

                AddToGoalCard(goal: goal) { crossedFull in
                    if crossedFull { celebrate += 1 }
                }

                if let notice { InlineMessage(.success, notice) }
                if let errorMessage { InlineMessage(.error, errorMessage) }

                Button(isDeleting ? "Borrando…" : "Borrar frasco") { isConfirmingDelete = true }
                    .buttonStyle(.cqDanger)
                    .disabled(isDeleting)
                    .confirmationDialog("¿Estás seguro?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                        Button("Confirmar", role: .destructive) { delete(goal) }
                        Button("Cancelar", role: .cancel) {}
                    } message: {
                        Text("Esta acción no se puede deshacer.")
                    }
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 560)
            .frame(maxWidth: .infinity)
        }
    }

    private func delete(_ goal: Goal) {
        isDeleting = true
        errorMessage = nil
        Task {
            defer { isDeleting = false }
            do {
                try await app.services.goals.delete(goal.id)
                await app.store.refreshGoals()
                notice = "Frasco borrado"
                try? await Task.sleep(for: .seconds(1.2))
                dismiss()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos borrar el frasco"
            }
        }
    }
}
