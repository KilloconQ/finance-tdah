import UIKit
import UserNotifications

/// SwiftUI has no hook for the system's notification callbacks, so a small delegate receives them and hands them to
/// the app model.
@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate, @preconcurrency UNUserNotificationCenterDelegate {
    private(set) var app: AppModel?
    /// A notification tapped before the model is attached (cold launch from a notification) waits here.
    private var pendingLink: DeepLink?

    func application(
        _ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func attach(_ app: AppModel) {
        self.app = app
        if let pendingLink {
            app.open(pendingLink)
            self.pendingLink = nil
        }
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { await app?.push.didRegister(deviceToken: deviceToken) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        app?.push.didFail(error)
    }

    /// A notification arriving while the app is open still shows as a banner: the person asked for these.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter, willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    /// Tapping a notification opens the screen it is about.
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        guard let path = response.notification.request.content.userInfo["url"] as? String, let link = DeepLink(webPath: path)
        else { return }
        if let app { app.open(link) } else { pendingLink = link }
    }
}
