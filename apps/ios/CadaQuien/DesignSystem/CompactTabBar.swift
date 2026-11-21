import SwiftUI

/// The compact tab bar: on iOS 26 the bar shrinks to a small pill while you scroll down and comes back when you scroll up,
/// like Instagram's. Earlier iOS versions have no such bar, so they keep the normal one.
private struct CompactTabBar: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26, *) {
            content.tabBarMinimizeBehavior(.onScrollDown)
        } else {
            content
        }
    }
}

extension View {
    func compactTabBar() -> some View {
        modifier(CompactTabBar())
    }
}
