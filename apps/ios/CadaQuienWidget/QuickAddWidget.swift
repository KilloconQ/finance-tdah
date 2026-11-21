import SwiftUI
import WidgetKit

/// Shows what you can spend today and logs an expense in one tap, without opening the app.
struct QuickAddWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "QuickAddWidget", provider: QuickAddProvider()) { entry in
            QuickAddWidgetView(entry: entry)
                .containerBackground(Palette.bg, for: .widget)
        }
        .configurationDisplayName("Anotar gasto")
        .description("Mira cuánto puedes gastar hoy y anota un gasto con un toque.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}
