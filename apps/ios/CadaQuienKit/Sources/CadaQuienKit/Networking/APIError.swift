import Foundation

public enum APIError: Error, Equatable, Sendable {
    /// 401: there is no session, or it expired.
    case unauthorized
    /// The API answered with an error; `message` is the Spanish text it sent.
    case server(status: Int, message: String)
    /// The device could not reach the API.
    case offline
    /// The response was not what the API contract promises.
    case invalidResponse
}

extension APIError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .unauthorized: "Tu sesión venció. Entra de nuevo."
        case .server(_, let message): message
        case .offline: "No hay conexión. Revisa tu internet e inténtalo otra vez."
        case .invalidResponse: "La respuesta del servidor no tiene el formato esperado."
        }
    }
}
