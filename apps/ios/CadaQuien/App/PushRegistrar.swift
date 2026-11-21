import CadaQuienKit
import Foundation
import Observation
import UIKit
import UserNotifications

/// Turns native notifications on and off for this phone, and keeps the server's list of devices in step.
///
/// The system hands the app a device token only after `registerForRemoteNotifications()`; `AppDelegate` passes it to
/// `didRegister`, which gives it to the server. The person's choice ("on") is kept on the device so it survives launches.
@MainActor @Observable
final class PushRegistrar {
    private(set) var authorization: UNAuthorizationStatus = .notDetermined
    /// The server knows this phone.
    private(set) var isRegistered = false
    private(set) var errorMessage: String?

    @ObservationIgnored private let service: PushService
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let center: UNUserNotificationCenter

    private static let wantedKey = "cadaquien.push-wanted"
    private static let tokenKey = "cadaquien.push-token"

    /// Xcode (debug) builds talk to Apple's sandbox; TestFlight and the App Store, to production.
    private var environment: PushService.Environment {
        #if DEBUG
        .sandbox
        #else
        .production
        #endif
    }

    init(
        service: PushService, defaults: UserDefaults = .standard, center: UNUserNotificationCenter = .current()
    ) {
        self.service = service
        self.defaults = defaults
        self.center = center
        isRegistered = defaults.bool(forKey: Self.wantedKey) && defaults.string(forKey: Self.tokenKey) != nil
    }

    private var token: String? { defaults.string(forKey: Self.tokenKey) }
    private var isWanted: Bool { defaults.bool(forKey: Self.wantedKey) }

    var isDenied: Bool { authorization == .denied }

    /// Reads the system permission. Call when a screen that shows the setting appears: it can change in Ajustes.
    func refresh() async {
        authorization = await center.notificationSettings().authorizationStatus
        if isDenied { isRegistered = false }
    }

    /// On launch, if the person had notifications on, ask the system for a token again: tokens can change.
    func resumeIfWanted() async {
        await refresh()
        guard isWanted, authorization == .authorized || authorization == .provisional else { return }
        UIApplication.shared.registerForRemoteNotifications()
    }

    func enable() async {
        errorMessage = nil
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            await refresh()
            guard granted else {
                errorMessage = "Las notificaciones están bloqueadas. Actívalas en Ajustes del iPhone."
                return
            }
            defaults.set(true, forKey: Self.wantedKey)
            UIApplication.shared.registerForRemoteNotifications()
        } catch {
            errorMessage = "No pudimos pedir permiso para las notificaciones."
        }
    }

    func disable() async {
        errorMessage = nil
        defaults.set(false, forKey: Self.wantedKey)
        if let token { try? await service.unregister(token: token) }
        UIApplication.shared.unregisterForRemoteNotifications()
        isRegistered = false
    }

    /// Called by `AppDelegate` when the system gives this phone a token.
    func didRegister(deviceToken data: Data) async {
        let hex = DeviceToken.hex(data)
        defaults.set(hex, forKey: Self.tokenKey)
        guard isWanted else { return }
        do {
            try await service.register(token: hex, environment: environment)
            isRegistered = true
            errorMessage = nil
        } catch {
            isRegistered = false
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "No pudimos activar las notificaciones."
        }
    }

    func didFail(_ error: Error) {
        isRegistered = false
        errorMessage = "Este dispositivo no pudo registrarse para notificaciones."
    }

    /// Signing out must stop this phone's notifications for that person; the next account asks again.
    func unregisterBeforeSignOut() async {
        if let token { try? await service.unregister(token: token) }
        defaults.set(false, forKey: Self.wantedKey)
        isRegistered = false
    }
}
