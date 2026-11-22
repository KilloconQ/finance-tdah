import Foundation

/// The API speaks ISO 8601 with an offset (`2026-11-20T14:21:55.123Z`); some writers omit the milliseconds.
public enum JSONCoding {
    private static let withFraction = Date.ISO8601FormatStyle(timeZoneSeparator: .colon, includingFractionalSeconds: true)
    private static let withoutFraction = Date.ISO8601FormatStyle(timeZoneSeparator: .colon, includingFractionalSeconds: false)

    static func parse(_ string: String) -> Date? {
        (try? Date(string, strategy: withFraction)) ?? (try? Date(string, strategy: withoutFraction))
    }

    public static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let string = try decoder.singleValueContainer().decode(String.self)
            guard let date = parse(string) else {
                throw DecodingError.dataCorrupted(
                    .init(codingPath: decoder.codingPath, debugDescription: "Invalid ISO 8601 date: \(string)")
                )
            }
            return date
        }
        return decoder
    }

    public static func makeEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(date.formatted(withFraction))
        }
        return encoder
    }
}
