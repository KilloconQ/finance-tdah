import CadaQuienKit
import SwiftUI

/// Shown only once the challenge request succeeded, so a failure never offers to start a challenge when one is running.
struct ChallengeLinkCard: View {
    let resource: Resource<Challenge?>
    @Environment(Navigator.self) private var navigator

    var body: some View {
        if let loaded = resource.value {
            Button { navigator.todayPath.append(.challenge) } label: {
                HStack(spacing: Layout.spacing) {
                    Image(systemName: "flame").foregroundStyle(Palette.warn).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                        if let challenge = loaded {
                            Text(challenge.name).font(.subheadline.bold()).foregroundStyle(Palette.ink)
                            Text("Día \(challenge.doneDays) de \(challenge.days)")
                                .font(.footnote)
                                .foregroundStyle(Palette.inkMid)
                            ProgressView(value: Double(challenge.doneDays), total: Double(max(1, challenge.days)))
                                .tint(Palette.sage)
                        } else {
                            Text("Empieza un reto").font(.subheadline.bold()).foregroundStyle(Palette.ink)
                            Text("Un reto corto te ayuda a gastar menos.")
                                .font(.footnote)
                                .foregroundStyle(Palette.inkMid)
                        }
                    }
                    Spacer()
                    Image(systemName: "chevron.right").foregroundStyle(Palette.inkSoft).accessibilityHidden(true)
                }
                .cardStyle()
            }
            .buttonStyle(.plain)
        }
    }
}
