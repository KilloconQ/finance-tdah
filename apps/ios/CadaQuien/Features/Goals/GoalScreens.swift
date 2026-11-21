import CadaQuienKit
import SwiftUI

/// "Nuevo frasco".
struct NewGoalScreen: View {
    @State private var model = GoalFormModel(original: nil)
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        GoalForm(model: model) { dismiss() }
            .navigationTitle("Nuevo frasco")
            .navigationBarTitleDisplayMode(.inline)
    }
}

/// "Editar frasco".
struct EditGoalScreen: View {
    let goalId: EntityID
    @Environment(AppModel.self) private var app

    var body: some View {
        ResourceView(resource: app.store.goals) { goals in
            if let goal = goals.first(where: { $0.id == goalId }) {
                EditGoalForm(goal: goal)
            } else {
                ContentUnavailableView(
                    "No encontramos ese frasco", systemImage: "questionmark.folder",
                    description: Text("Puede que lo hayas eliminado o que el enlace esté roto."))
            }
        }
        .navigationTitle("Editar frasco")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct EditGoalForm: View {
    @State private var model: GoalFormModel
    @Environment(\.dismiss) private var dismiss

    init(goal: Goal) {
        _model = State(initialValue: GoalFormModel(original: goal))
    }

    var body: some View {
        GoalForm(model: model) { dismiss() }
    }
}
