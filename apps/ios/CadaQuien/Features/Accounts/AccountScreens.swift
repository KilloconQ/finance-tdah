import CadaQuienKit
import SwiftUI

/// "Nueva cuenta".
struct NewAccountScreen: View {
    @State private var model = AccountFormModel(original: nil)
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        AccountForm(model: model) { dismiss() }
            .navigationTitle("Nueva cuenta")
            .navigationBarTitleDisplayMode(.inline)
    }
}

/// "Editar cuenta".
struct EditAccountScreen: View {
    let accountId: EntityID
    @Environment(AppModel.self) private var app

    var body: some View {
        ResourceView(resource: app.store.accounts) { accounts in
            if let account = accounts.first(where: { $0.id == accountId }) {
                EditAccountForm(account: account)
            } else {
                ContentUnavailableView(
                    "No encontramos esa cuenta", systemImage: "questionmark.folder",
                    description: Text("Puede que la hayas eliminado o que el enlace esté roto."))
            }
        }
        .navigationTitle("Editar cuenta")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct EditAccountForm: View {
    @State private var model: AccountFormModel
    @Environment(\.dismiss) private var dismiss

    init(account: Account) {
        _model = State(initialValue: AccountFormModel(original: account))
    }

    var body: some View {
        AccountForm(model: model) { dismiss() }
    }
}
