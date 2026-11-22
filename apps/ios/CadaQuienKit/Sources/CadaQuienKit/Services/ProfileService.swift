import Foundation

public struct ProfileService: Sendable {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    /// nil until the user finishes onboarding.
    public func get() async throws -> UserProfile? {
        try await client.get("/api/profile", key: "profile")
    }

    public func completeOnboarding(_ input: Onboarding) async throws -> UserProfile {
        try await client.post("/api/profile/onboarding", key: "profile", body: input)
    }

    public func update(_ input: ProfileUpdate) async throws -> UserProfile {
        try await client.patch("/api/profile", key: "profile", body: input)
    }

    /// Deletes the account and everything in it. Irreversible.
    public func deleteAccount() async throws {
        try await client.send(.post, "/api/profile/delete")
    }

    public struct Onboarding: Encodable, Sendable {
        public var displayName: String
        public var pain: [String]
        public var inputPreference: InputPreference
        public var firstGoal: FirstGoal?

        public init(displayName: String, pain: [String] = [], inputPreference: InputPreference = .widget, firstGoal: FirstGoal? = nil) {
            self.displayName = displayName
            self.pain = pain
            self.inputPreference = inputPreference
            self.firstGoal = firstGoal
        }

        public struct FirstGoal: Encodable, Sendable {
            public var name: String
            public var emoji: String
            public var targetCents: Int

            public init(name: String, emoji: String, targetCents: Int) {
                self.name = name
                self.emoji = emoji
                self.targetCents = targetCents
            }
        }
    }

    /// Only the fields you set are sent, so a PATCH never resets the ones you didn't touch.
    public struct ProfileUpdate: Encodable, Sendable {
        public var displayName: String?
        public var inputPreference: InputPreference?
        public var densityMode: DensityMode?
        public var showBalances: Bool?
        public var weeklyBudgetCents: Int?
        public var dailyReminderEnabled: Bool?
        public var dailyReminderHour: Int?
        public var timeZone: String?

        public init(
            displayName: String? = nil, inputPreference: InputPreference? = nil, densityMode: DensityMode? = nil,
            showBalances: Bool? = nil, weeklyBudgetCents: Int? = nil, dailyReminderEnabled: Bool? = nil,
            dailyReminderHour: Int? = nil, timeZone: String? = nil
        ) {
            self.displayName = displayName
            self.inputPreference = inputPreference
            self.densityMode = densityMode
            self.showBalances = showBalances
            self.weeklyBudgetCents = weeklyBudgetCents
            self.dailyReminderEnabled = dailyReminderEnabled
            self.dailyReminderHour = dailyReminderHour
            self.timeZone = timeZone
        }
    }
}
