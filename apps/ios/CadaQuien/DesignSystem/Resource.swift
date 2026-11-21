import CadaQuienKit
import Foundation
import Observation

/// One piece of server data a screen shows: loads once, refreshes on demand, and keeps the last good value
/// on screen if a refresh fails.
@MainActor @Observable
final class Resource<Value: Sendable & Equatable> {
    private(set) var value: Value?
    private(set) var errorMessage: String?
    private(set) var isLoading = false

    private let fetch: @Sendable () async throws -> Value
    private let onUnauthorized: @MainActor () -> Void

    init(
        onUnauthorized: @escaping @MainActor () -> Void = {},
        fetch: @escaping @Sendable () async throws -> Value
    ) {
        self.fetch = fetch
        self.onUnauthorized = onUnauthorized
    }

    /// Loads the first time a screen appears; later appearances keep what is already there.
    func loadIfNeeded() async {
        guard value == nil, !isLoading else { return }
        await load()
    }

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            value = try await fetch()
            errorMessage = nil
        } catch is CancellationError {
            // The screen went away mid-request: nothing to report.
        } catch let error as APIError {
            if error == .unauthorized { onUnauthorized() }
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "Algo salió mal. Inténtalo otra vez."
        }
    }

    /// Replaces the value after a local change (e.g. the server's reply to a mutation), without a refetch.
    func set(_ newValue: Value) {
        value = newValue
        errorMessage = nil
    }
}
