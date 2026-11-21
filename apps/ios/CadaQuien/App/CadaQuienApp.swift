import CadaQuienKit
import SwiftUI

@main
struct CadaQuienApp: App {
    @State private var app: AppModel
    @AppStorage(ThemePreference.storageKey) private var theme = ThemePreference.system

    init() {
        let tokens = KeychainTokenStore()
        #if DEBUG
        DebugLaunch.apply(to: tokens)
        #endif
        _app = State(initialValue: AppModel(environment: .fromBundle(), tokens: tokens))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(app)
                .environment(\.hideBalances, app.hidesBalances)
                .tint(Palette.sage)
                .preferredColorScheme(theme.colorScheme)
                .onOpenURL { app.open($0) }
        }
    }
}
