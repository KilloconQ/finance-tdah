import Foundation

public struct UserProfile: Codable, Sendable, Hashable {
    public let userId: String
    public let displayName: String
    public let pain: [String]
    public let inputPreference: InputPreference
    public let densityMode: DensityMode
    public let showBalances: Bool
    public let weeklyBudgetCents: Int
    public let dailyReminderEnabled: Bool
    public let dailyReminderHour: Int
    public let timeZone: String
    public let onboardingCompleted: Bool
    public let createdAt: Date
    public let updatedAt: Date

    // The web defaults these when an older API omits them; so do we.
    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        userId = try c.decode(String.self, forKey: .userId)
        displayName = try c.decode(String.self, forKey: .displayName)
        pain = try c.decode([String].self, forKey: .pain)
        inputPreference = try c.decode(InputPreference.self, forKey: .inputPreference)
        densityMode = try c.decode(DensityMode.self, forKey: .densityMode)
        showBalances = try c.decode(Bool.self, forKey: .showBalances)
        weeklyBudgetCents = try c.decode(Int.self, forKey: .weeklyBudgetCents)
        dailyReminderEnabled = try c.decodeIfPresent(Bool.self, forKey: .dailyReminderEnabled) ?? true
        dailyReminderHour = try c.decodeIfPresent(Int.self, forKey: .dailyReminderHour) ?? 21
        timeZone = try c.decodeIfPresent(String.self, forKey: .timeZone) ?? "America/Mexico_City"
        onboardingCompleted = try c.decode(Bool.self, forKey: .onboardingCompleted)
        createdAt = try c.decode(Date.self, forKey: .createdAt)
        updatedAt = try c.decode(Date.self, forKey: .updatedAt)
    }
}
