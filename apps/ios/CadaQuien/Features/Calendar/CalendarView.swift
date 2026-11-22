import CadaQuienKit
import SwiftUI

/// "Calendario": when each card is due, when subscriptions charge, and the income she registers.
struct CalendarView: View {
    @Environment(AppModel.self) private var app
    @State private var month = CalendarMonth(CalendarDay(Date()))
    @State private var selected: CalendarDay?
    @State private var editing: IncomeEditing?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Layout.spacingSection) {
                monthHeader
                ResourceView(resource: app.store.calendarMonth(month)) { response in
                    MonthContent(month: month, response: response, selected: $selected)
                }
                .id(month)
                .frame(minHeight: 120)
                incomes
            }
            .padding(Layout.screenPadding)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Palette.bg)
        .navigationTitle("Calendario")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Nuevo ingreso", systemImage: "plus") { editing = .new }
            }
        }
        .refreshable { await app.store.refreshCalendar() }
        .sheet(item: $editing) { IncomeSheet(editing: $0) }
    }

    private var monthHeader: some View {
        HStack {
            Button("Mes anterior", systemImage: "chevron.left") { move(-1) }
            Spacer()
            Text(month.title).font(.headline).foregroundStyle(Palette.ink).accessibilityAddTraits(.isHeader)
            Spacer()
            Button("Mes siguiente", systemImage: "chevron.right") { move(1) }
        }
        .labelStyle(.iconOnly)
        .frame(minHeight: Layout.minTap)
    }

    private func move(_ delta: Int) {
        month = month.shifted(by: delta)
        selected = nil
    }

    private var incomes: some View {
        ResourceSection(title: "Tus ingresos", subject: "tus ingresos", resource: app.store.incomes) { incomes in
            if incomes.isEmpty {
                ContentUnavailableView {
                    Label("Aún no registras ingresos", systemImage: "calendar.badge.plus")
                } description: {
                    Text("Agrega tu nómina o tus cobros para verlos en el calendario.")
                } actions: {
                    Button("Agregar ingreso") { editing = .new }
                        .buttonStyle(.cqPrimary)
                        .frame(maxWidth: 280)
                }
            } else {
                VStack(spacing: Layout.spacingSmall) {
                    ForEach(incomes) { income in
                        Button { editing = .edit(income) } label: {
                            HStack(spacing: Layout.spacing) {
                                VStack(alignment: .leading, spacing: Layout.spacingTight) {
                                    Text(income.name).foregroundStyle(Palette.ink)
                                    Text(income.frequency.label).font(.footnote).foregroundStyle(Palette.inkMid)
                                }
                                Spacer()
                                if let cents = income.amountCents { MoneyText(cents: cents).foregroundStyle(Palette.ink) }
                            }
                            .frame(minHeight: Layout.minTap)
                            .cardStyle()
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .task { await app.store.incomes.loadIfNeeded() }
    }
}

/// The grid of one month and the events of the day picked in it.
private struct MonthContent: View {
    let month: CalendarMonth
    let response: CalendarResponse
    @Binding var selected: CalendarDay?

    private var byDay: [CalendarDay: [CalendarEvent]] {
        Dictionary(grouping: response.events, by: \.date)
    }

    /// The tapped day, else today when it is in this month, else the 1st.
    private var day: CalendarDay {
        if let selected, CalendarMonth(selected) == month { return selected }
        return CalendarMonth(response.today) == month ? response.today : month.first
    }

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 7)

    var body: some View {
        VStack(alignment: .leading, spacing: Layout.spacingSection) {
            VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                LazyVGrid(columns: columns, spacing: 0) {
                    ForEach(["L", "M", "M", "J", "V", "S", "D"].enumerated().map { "w\($0.offset)=\($0.element)" }, id: \.self) { tag in
                        Text(tag.split(separator: "=").last.map(String.init) ?? "").font(.caption.weight(.medium)).foregroundStyle(Palette.inkSoft).accessibilityHidden(true)
                    }
                    ForEach((0..<month.leadingBlanks).map { "b\($0)" }, id: \.self) { _ in Color.clear.frame(height: 1) }
                    ForEach(month.days(), id: \.self) { date in
                        DayCell(
                            date: date, kinds: kinds(on: date), isToday: date == response.today, isSelected: date == day
                        ) { selected = date }
                    }
                }
                .cardStyle()
                legend
            }
            dayEvents
        }
    }

    private func kinds(on date: CalendarDay) -> [CalendarEvent.Kind] {
        var seen: [CalendarEvent.Kind] = []
        for event in byDay[date] ?? [] where !seen.contains(event.kind) { seen.append(event.kind) }
        return seen
    }

    private var legend: some View {
        HStack(spacing: Layout.spacingLarge) {
            ForEach([CalendarEvent.Kind.cardPayment, .subscription, .income], id: \.self) { kind in
                HStack(spacing: Layout.spacingSmall) {
                    Circle().fill(kind.color).frame(width: 8, height: 8)
                    Text(kind.label).font(.footnote).foregroundStyle(Palette.inkMid)
                }
            }
        }
        .accessibilityHidden(true)
    }

    private var dayEvents: some View {
        let events = byDay[day] ?? []
        return VStack(alignment: .leading, spacing: Layout.spacingSmall) {
            SectionHeader(DayFormat.long(day).prefix(1).uppercased() + DayFormat.long(day).dropFirst())
            if events.isEmpty {
                Text("Nada este día.").foregroundStyle(Palette.inkMid)
            }
            ForEach(events) { event in
                HStack(spacing: Layout.spacing) {
                    Circle().fill(event.kind.color).frame(width: 10, height: 10).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: Layout.spacingTight) {
                        Text(event.title).foregroundStyle(Palette.ink)
                        Text(event.kind.label).font(.footnote).foregroundStyle(Palette.inkMid)
                    }
                    Spacer()
                    if let cents = event.amountCents {
                        MoneyText(cents: cents).foregroundStyle(event.kind == .income ? Palette.good : Palette.ink)
                    }
                }
                .frame(minHeight: Layout.minTap)
                .cardStyle()
                .accessibilityElement(children: .combine)
            }
        }
    }
}

private struct DayCell: View {
    let date: CalendarDay
    let kinds: [CalendarEvent.Kind]
    let isToday: Bool
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Text("\(date.day)")
                    .font(.subheadline.weight(isToday ? .semibold : .regular))
                    .foregroundStyle(isSelected ? Palette.surface : (isToday ? Palette.sageStrong : Palette.ink))
                HStack(spacing: 2) {
                    ForEach(kinds, id: \.self) { Circle().fill($0.color).frame(width: 5, height: 5) }
                }
                .frame(height: 5)
            }
            .frame(maxWidth: .infinity, minHeight: Layout.minTap)
            .background(isSelected ? Palette.sage : .clear, in: .rect(cornerRadius: Layout.radiusControl))
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var label: String {
        ([DayFormat.long(date)] + kinds.map(\.label)).joined(separator: ", ")
    }
}

extension CalendarEvent.Kind {
    /// What leaves is red or amber, what comes in is green.
    var color: Color {
        switch self {
        case .cardPayment: Palette.danger
        case .subscription: Palette.warn
        case .income: Palette.good
        }
    }
}
