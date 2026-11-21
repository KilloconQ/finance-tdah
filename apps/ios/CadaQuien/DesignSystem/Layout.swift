import SwiftUI

/// Spacing, radii and sizes shared by every screen, so the app feels uniform and is easy to retune.
enum Layout {
    static let radiusCard: CGFloat = 16
    static let radiusControl: CGFloat = 12
    /// Apple's minimum tap target.
    static let minTap: CGFloat = 44

    static let spacingTight: CGFloat = 4
    static let spacingSmall: CGFloat = 8
    static let spacing: CGFloat = 12
    static let spacingLarge: CGFloat = 16
    static let spacingSection: CGFloat = 24

    static let screenPadding: CGFloat = 16
    static let cardPadding: CGFloat = 16

    static let hairline: CGFloat = 1
}
