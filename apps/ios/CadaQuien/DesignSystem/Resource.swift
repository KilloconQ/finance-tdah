import CadaQuienKit
import Foundation
import Observation

/// One piece of server data a screen shows: loads once, refreshes on demand, and keeps the last good value
/// on screen if a refresh fails.
///
/// The request belongs to the resource, not to the view that asked for it: SwiftUI cancels a view's `.task` whenever
/// the view is replaced or navigated away, and that must neither fail the request nor leave the screen spinning.
/// Callers that arrive while a request is running simply wait for that same request.
@MainActor @Observable
final class Resource<Value: Sendable & Equatable> {
    private(set) var value: Value?
    private(set) var errorMessage: String?
    private(set) var isLoading = false

    @ObservationIgnored private var inflight: Task<Void, Never>?
    @ObservationIgnored private let fetch: @Sendable () async throws -> Value
    @ObservationIgnored private let onUnauthorized: @MainActor () -> Void

    init(
        onUnauthorized: @escaping @MainActor () -> Void = {},
        fetch: @escaping @Sendable () async throws -> Value
    ) {
        self.fetch = fetch
        self.onUnauthorized = onUnauthorized
    }

    /// Loads the first time a screen appears; later appearances keep what is already there.
    func loadIfNeeded() async {
        guard value == nil else { return }
        await load()
    }

    /// After a mutation: refresh what a screen already shows, and leave unvisited screens to load when they appear.
    func reloadIfLoaded() async {
        guard value != nil else { return }
        await load()
    }

    func load() async {
        if let inflight {
            await inflight.value
            return
        }
        let task = Task { await perform() }
        inflight = task
        await task.value
    }

    private func perform() async {
        isLoading = true
        defer {
            isLoading = false
            inflight = nil
        }
        do {
            value = try await fetch()
            errorMessage = nil
        } catch is CancellationError {
            // Nothing to report: the request was abandoned, not refused.
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
