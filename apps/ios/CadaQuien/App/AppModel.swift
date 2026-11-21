import CadaQuienKit
import Foundation
import Observation

/// The signed-in session: who the user is, their profile, and the data their screens share.
@MainActor @Observable
final class AppModel {
    enum Phase: Equatable {
        case launching
        case signedOut
        /// Signed in but no profile yet: show the onboarding.
        case onboarding
        case ready
        /// The session could not be checked (offline, server down). The token is kept: this is not a sign-out.
        case failed(String)
    }

    private(set) var phase: Phase = .launching
    private(set) var user: AuthUser?
    private(set) var profile: UserProfile?
    private(set) var store: DataStore
    /// A link opened before the tabs exist (cold launch from the widget): the tabs pick it up once they appear.
    private(set) var pendingDeepLink: DeepLink?

    let environment: APIEnvironment
    let services: Services
    let connectivity = ConnectivityMonitor()
    let push: PushRegistrar

    @ObservationIgnored private let tokens: any TokenStore
    @ObservationIgnored private let unauthorized = UnauthorizedHandler()

    init(environment: APIEnvironment, tokens: any TokenStore) {
        self.environment = environment
        self.tokens = tokens
        let services = Services(client: APIClient(environment: environment, tokens: tokens))
        self.services = services
        push = PushRegistrar(service: PushService(client: APIClient(environment: environment, tokens: tokens)))
        store = DataStore(services: services, unauthorized: unauthorized)
        unauthorized.handle = { [weak self] in self?.sessionExpired() }
    }

    // MARK: Session

    /// Restores the session from the stored token, or lands on sign-in.
    func start() async {
        phase = .launching
        do {
            guard let user = try await services.auth.currentUser() else {
                phase = .signedOut
                return
            }
            self.user = user
            try await loadProfile()
            if phase == .ready { await push.resumeIfWanted() }
        } catch {
            phase = .failed((error as? LocalizedError)?.errorDescription ?? "No pudimos conectar con el servidor.")
        }
    }

    func signIn(email: String, password: String) async throws {
        try await services.auth.signIn(email: email, password: password)
        await start()
    }

    func signUp(email: String, password: String, name: String) async throws {
        try await services.auth.signUp(email: email, password: password, name: name)
        await start()
    }

    func signOut() async {
        // While the token still works: afterwards the server can't tell this phone belonged to this person.
        await push.unregisterBeforeSignOut()
        await services.auth.signOut()
        reset()
    }

    /// A request came back 401: the token is dead, so drop it without calling the server.
    func sessionExpired() {
        guard phase != .signedOut else { return }
        tokens.clear()
        reset()
    }

    private func reset() {
        user = nil
        profile = nil
        store = DataStore(services: services, unauthorized: unauthorized)
        phase = .signedOut
    }

    private func loadProfile() async throws {
        if let profile = try await services.profile.get(), profile.onboardingCompleted {
            self.profile = profile
            phase = .ready
        } else {
            phase = .onboarding
        }
    }

    // MARK: Profile

    func completeOnboarding(_ input: ProfileService.Onboarding) async throws {
        profile = try await services.profile.completeOnboarding(input)
        phase = .ready
    }

    func updateProfile(_ update: ProfileService.ProfileUpdate) async throws {
        profile = try await services.profile.update(update)
    }

    func deleteAccount() async throws {
        try await services.profile.deleteAccount()
        tokens.clear()
        reset()
    }

    var hidesBalances: Bool { profile?.showBalances == false }

    // MARK: Links

    func open(_ url: URL) {
        pendingDeepLink = DeepLink(url: url)
    }

    func open(_ link: DeepLink) {
        pendingDeepLink = link
    }

    func consumeDeepLink() {
        pendingDeepLink = nil
    }
}
