import CadaQuienKit
import SwiftUI

struct ExpenseRow: View {
    let expense: Expense

    var body: some View {
        HStack(spacing: Layout.spacing) {
            Text(ExpenseCategory.emoji(for: expense.category))
                .frame(width: 40, height: 40)
                .background(Palette.bgAlt, in: .circle)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: Layout.spacingTight) {
                Text(expense.description)
                    .font(.body)
                    .foregroundStyle(Palette.ink)
                Text(expense.category)
                    .font(.footnote)
                    .foregroundStyle(Palette.inkMid)
            }
            Spacer()
            amount
        }
        .frame(minHeight: Layout.minTap)
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private var amount: some View {
        switch expense.kind {
        case .expense:
            HStack(spacing: 0) {
                Text("−")
                MoneyText(cents: expense.amountCents)
            }
            .foregroundStyle(Palette.ink)
        case .income:
            HStack(spacing: 0) {
                Text("+")
                MoneyText(cents: expense.amountCents)
            }
            .foregroundStyle(Palette.good)
        case .transfer:
            HStack(spacing: 0) {
                Text("→ ")
                MoneyText(cents: expense.amountCents)
            }
            .foregroundStyle(Palette.inkMid)
        }
    }
}
