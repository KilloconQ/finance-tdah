import SwiftUI
import WidgetKit

/// Placeholder: the real quick-add widget (App Intents) arrives in its own task.
struct QuickAddWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "QuickAddWidget", provider: QuickAddProvider()) { _ in
            Label("Anotar gasto", systemImage: "plus.circle.fill")
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Anotar gasto")
        .description("Registra un gasto sin abrir la app.")
        .supportedFamilies([.systemSmall])
    }
}

struct QuickAddEntry: TimelineEntry {
    let date: Date
}

struct QuickAddProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickAddEntry {
        QuickAddEntry(date: .now)
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickAddEntry) -> Void) {
        completion(QuickAddEntry(date: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickAddEntry>) -> Void) {
        completion(Timeline(entries: [QuickAddEntry(date: .now)], policy: .never))
    }
}
