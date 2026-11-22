import CadaQuienKit

/// The forms that open over the envelopes screen.
enum EnvelopeSheet: Identifiable {
    case create
    case set(aside: Envelope)
    case release(from: Envelope)
    case rename(Envelope)

    var id: String {
        switch self {
        case .create: "create"
        case .set(let envelope): "set-\(envelope.id)"
        case .release(let envelope): "release-\(envelope.id)"
        case .rename(let envelope): "rename-\(envelope.id)"
        }
    }
}

enum EnvelopeEmoji {
    static let options = ["📦", "🛒", "🏠", "🚗", "🎉", "💊", "📺", "✈️", "🎁", "🐷"]
}
