import CadaQuienKit
import SwiftUI

/// "Reto de la semana": one small habit at a time.
struct ChallengeView: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        ResourceView(resource: app.store.challenge) { challenge in
            ScrollView {
                Group {
                    if let challenge {
                        ActiveChallengeView(challenge: challenge)
                    } else {
                        NewChallengeForm()
                    }
                }
                .padding(Layout.screenPadding)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .background(Palette.bg)
        .navigationTitle("Reto de la semana")
        .navigationBarTitleDisplayMode(.inline)
    }
}
