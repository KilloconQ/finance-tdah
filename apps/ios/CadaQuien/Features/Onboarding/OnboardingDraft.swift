import Foundation

/// What the person has picked so far, kept on the device so leaving the app mid-way doesn't lose it.
struct OnboardingDraft: Codable, Equatable {
    var pain: [String] = []
    /// Index into `OnboardingContent.goalPresets`; nil means "después".
    var goalPresetIndex: Int? = 0

    static let key = "cadaquien.onboarding-draft"

    static func load(from defaults: UserDefaults = .standard) -> OnboardingDraft {
        guard let data = defaults.data(forKey: key), let draft = try? JSONDecoder().decode(OnboardingDraft.self, from: data)
        else { return OnboardingDraft() }
        return draft
    }

    func save(to defaults: UserDefaults = .standard) {
        defaults.set(try? JSONEncoder().encode(self), forKey: Self.key)
    }

    static func clear(in defaults: UserDefaults = .standard) {
        defaults.removeObject(forKey: key)
    }

    var goalPreset: OnboardingContent.GoalPreset? {
        guard let goalPresetIndex, OnboardingContent.goalPresets.indices.contains(goalPresetIndex) else { return nil }
        return OnboardingContent.goalPresets[goalPresetIndex]
    }
}
