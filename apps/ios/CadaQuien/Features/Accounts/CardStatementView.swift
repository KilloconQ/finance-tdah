import CadaQuienKit
import SwiftUI

/// What a credit card needs paid and when. The server works it out in the owner's time zone.
struct CardStatementView: View {
    let accountId: EntityID
    @Environment(AppModel.self) private var app
    @State private var statement: CardStatement?

    var body: some View {
        Group {
            if let statement {
                VStack(alignment: .leading, spacing: Layout.spacingSmall) {
                    Text("Estado de cuenta").font(.subheadline).foregroundStyle(Palette.inkMid)
                    if statement.dueCents == 0 {
                        Text("No tienes nada pendiente de este corte").foregroundStyle(Palette.ink)
                    } else {
                        Text(
                            statement.paymentDate < statement.today
                                ? "Debiste pagar el \(DayFormat.short(statement.paymentDate))"
                                : "Te toca pagar el \(DayFormat.short(statement.paymentDate))"
                        )
                        .foregroundStyle(statement.paymentDate < statement.today ? Palette.danger : Palette.ink)
                        MoneyText(cents: statement.dueCents).font(.title2.bold()).foregroundStyle(Palette.ink)
                    }
                    MoneySentence("Lo que gastes desde el corte (", .money(statement.openPeriodCents), ") se paga en el siguiente periodo, que cierra el \(DayFormat.short(statement.nextCutoffDate)).")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkMid)
                }
                .cardStyle()
            }
        }
        .task(id: accountId) {
            // The statement is a bonus: if it can't load, the form still works.
            statement = try? await app.services.accounts.statement(accountId)
        }
    }
}
