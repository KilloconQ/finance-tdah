// swift-tools-version: 6.0
import PackageDescription

// Shared by the app and the widget: API client, models and session storage.
// Plain Foundation so `swift test` runs it without a simulator.
let package = Package(
    name: "CadaQuienKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "CadaQuienKit", targets: ["CadaQuienKit"])],
    targets: [
        .target(name: "CadaQuienKit"),
        .testTarget(name: "CadaQuienKitTests", dependencies: ["CadaQuienKit"]),
    ]
)
