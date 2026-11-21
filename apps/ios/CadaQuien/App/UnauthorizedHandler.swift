/// Lets every `Resource` report an expired session without knowing about `AppModel`.
@MainActor
final class UnauthorizedHandler {
    var handle: (@MainActor () -> Void)?

    func fire() {
        handle?()
    }
}
