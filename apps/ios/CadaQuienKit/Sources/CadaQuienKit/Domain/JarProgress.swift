/// How full a goal's jar is. Mirrors `jarProgress` in `packages/shared/src/domain/jar.ts`.
public struct JarProgress: Equatable, Sendable {
    public let fraction: Double
    public let percent: Double
    public let isComplete: Bool
    public let overflowCents: Int

    public init(currentCents: Int, targetCents: Int) {
        guard targetCents > 0 else {
            fraction = 0
            percent = 0
            isComplete = false
            overflowCents = 0
            return
        }
        let safeCurrent = max(0, currentCents)
        fraction = min(1, Double(safeCurrent) / Double(targetCents))
        percent = fraction * 100
        isComplete = safeCurrent >= targetCents
        overflowCents = max(0, currentCents - targetCents)
    }
}
