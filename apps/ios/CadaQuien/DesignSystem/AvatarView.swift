import CadaQuienKit
import SwiftUI

/// A letter on a soft tint that is the same every time for the same name.
struct AvatarView: View {
    let name: String
    var size: CGFloat = 40

    var body: some View {
        Text(Avatar.initial(name))
            .font(.body.bold())
            .foregroundStyle(Palette.ink)
            .frame(width: size, height: size)
            .background(Color(hue: Avatar.hue(name), saturation: 0.22, brightness: 0.92).opacity(0.7), in: .circle)
            .accessibilityHidden(true)
    }
}
