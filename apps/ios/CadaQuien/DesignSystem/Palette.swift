import SwiftUI

/// Color tokens from `DESIGN.md`, backed by the asset catalog so light and dark come for free.
/// Sage is the only selection color; there is no pure black or pure white anywhere.
enum Palette {
    static let bg = Color(.bg)
    static let bgAlt = Color(.bgAlt)
    static let surface = Color(.surface)
    static let line = Color(.line)
    static let lineSoft = Color(.lineSoft)

    static let ink = Color(.ink)
    static let inkMid = Color(.inkMid)
    static let inkSoft = Color(.inkSoft)
    static let inkGhost = Color(.inkGhost)

    static let sage = Color(.sage)
    static let sageStrong = Color(.sageStrong)
    static let sageBg = Color(.sageBg)
    static let sageMuted = Color(.sageMuted)

    static let warn = Color(.warn)
    static let warnBg = Color(.warnBg)
    static let danger = Color(.danger)
    static let dangerBg = Color(.dangerBg)
    static let good = Color(.good)
    static let goodBg = Color(.goodBg)
}
