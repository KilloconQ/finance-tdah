import Network
import Observation
import SwiftUI

/// Whether the phone has a network path right now. Drives the offline banner.
@MainActor @Observable
final class ConnectivityMonitor {
    private(set) var isOnline = true
    @ObservationIgnored private let monitor = NWPathMonitor()

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let online = path.status == .satisfied
            Task { @MainActor in self?.isOnline = online }
        }
        monitor.start(queue: DispatchQueue(label: "connectivity"))
    }

    deinit {
        monitor.cancel()
    }
}

struct OfflineBanner: View {
    let connectivity: ConnectivityMonitor

    var body: some View {
        if !connectivity.isOnline {
            InlineMessage(.warning, "Sin conexión. Lo que ves puede no estar al día.")
                .padding(.horizontal, Layout.screenPadding)
                .transition(.opacity)
        }
    }
}
