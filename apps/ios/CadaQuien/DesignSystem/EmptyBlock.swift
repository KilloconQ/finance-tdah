import SwiftUI

/// An empty list with one clear next step, in the app's card style.
struct EmptyBlock: View {
    let title: String
    let hint: String
    let actionTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: Layout.spacing) {
            Text(title).font(.headline).foregroundStyle(Palette.ink)
            Text(hint).font(.subheadline).foregroundStyle(Palette.inkMid)
            Button(actionTitle, action: action).buttonStyle(.cqPrimary)
        }
        .multilineTextAlignment(.center)
        .cardStyle()
    }
}
