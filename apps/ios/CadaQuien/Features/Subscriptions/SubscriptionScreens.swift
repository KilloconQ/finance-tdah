import CadaQuienKit
import SwiftUI

/// "Nueva suscripción".
struct NewSubscriptionScreen: View {
    @State private var model = SubscriptionFormModel(original: nil)
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        SubscriptionForm(model: model) { dismiss() }
            .navigationTitle("Nueva suscripción")
            .navigationBarTitleDisplayMode(.inline)
    }
}

/// "Editar suscripción".
struct EditSubscriptionScreen: View {
    let subscriptionId: EntityID
    @Environment(AppModel.self) private var app

    var body: some View {
        ResourceView(resource: app.store.subscriptions) { subscriptions in
            if let subscription = subscriptions.first(where: { $0.id == subscriptionId }) {
                EditSubscriptionForm(subscription: subscription)
            } else {
                ContentUnavailableView(
                    "No encontramos esa suscripción", systemImage: "questionmark.folder",
                    description: Text("Puede que la hayas cancelado o que el enlace esté roto."))
            }
        }
        .navigationTitle("Editar suscripción")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct EditSubscriptionForm: View {
    @State private var model: SubscriptionFormModel
    @Environment(\.dismiss) private var dismiss

    init(subscription: Subscription) {
        _model = State(initialValue: SubscriptionFormModel(original: subscription))
    }

    var body: some View {
        SubscriptionForm(model: model) { dismiss() }
    }
}
