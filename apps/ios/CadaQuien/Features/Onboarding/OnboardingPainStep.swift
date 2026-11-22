import SwiftUI

struct OnboardingPainStep: View {
    @Binding var draft: OnboardingDraft
    let next: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingLarge) {
            VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                Text("¿Qué te cuesta más\ncon el dinero?")
                    .font(.largeTitle.bold())
                    .foregroundStyle(Palette.ink)
                    .accessibilityAddTraits(.isHeader)
                Text("Sin juicios. Pueden ser varias.")
                    .foregroundStyle(Palette.inkMid)
            }
            ScrollView {
                VStack(spacing: Layout.spacingSmall) {
                    ForEach(OnboardingContent.painPoints) { point in
                        optionRow(point)
                    }
                }
            }
            Button("Siguiente", action: next)
                .buttonStyle(.cqPrimary)
        }
    }

    private func optionRow(_ point: OnboardingContent.PainPoint) -> some View {
        let isSelected = draft.pain.contains(point.id)
        return Button {
            if isSelected {
                draft.pain.removeAll { $0 == point.id }
            } else {
                draft.pain.append(point.id)
            }
        } label: {
            HStack(spacing: Layout.spacing) {
                Text(point.emoji).accessibilityHidden(true)
                Text(point.label).foregroundStyle(Palette.ink)
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark").foregroundStyle(Palette.sageStrong)
                }
            }
            .padding(Layout.spacing)
            .frame(minHeight: Layout.minTap)
            .background(isSelected ? Palette.sageBg : Palette.surface, in: .rect(cornerRadius: Layout.radiusControl))
            .overlay {
                RoundedRectangle(cornerRadius: Layout.radiusControl)
                    .stroke(isSelected ? Palette.sageMuted : Palette.line, lineWidth: Layout.hairline)
            }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
