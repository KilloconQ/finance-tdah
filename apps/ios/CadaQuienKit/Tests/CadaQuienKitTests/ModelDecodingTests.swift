import Foundation
import Testing
@testable import CadaQuienKit

/// Payloads shaped like the real API responses (see packages/shared/src/schemas).
struct ModelDecodingTests {
    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONCoding.makeDecoder().decode(type, from: Data(json.utf8))
    }

    @Test func decodesAnExpenseWithMillisecondDates() throws {
        let expense = try decode(Expense.self, """
        {"id":"0b4d5c7e-1c0f-4b8e-9a0e-6f9d2c1a7e11","userId":"u1","accountId":"3f1d5c7e-1c0f-4b8e-9a0e-6f9d2c1a7e22",
         "toAccountId":null,"envelopeId":null,"kind":"expense","amountCents":15050,"category":"comida",
         "description":"Tacos","occurredAt":"2026-11-20T14:21:55.123Z","createdAt":"2026-11-20T14:21:56Z"}
        """)
        #expect(expense.amountCents == 15050)
        #expect(expense.kind == .expense)
        #expect(expense.toAccountId == nil)
        #expect(abs(expense.occurredAt.timeIntervalSince(expense.createdAt) + 0.877) < 0.001)
    }

    @Test func decodesAnExpenseFromAnAPIWithoutEnvelopesOrKind() throws {
        // Mid-deploy the API may predate `envelopeId`; the web tolerates it, so do we.
        let json = """
        {"id":"0b4d5c7e-1c0f-4b8e-9a0e-6f9d2c1a7e11","userId":"u1","accountId":null,"toAccountId":null,
         "kind":"income","amountCents":100,"category":"sueldo","description":"Pago",
         "occurredAt":"2026-11-20T14:21:55.123Z","createdAt":"2026-11-20T14:21:55.123Z"}
        """
        #expect(try decode(Expense.self, json).envelopeId == nil)
    }

    @Test func decodesAnAccountThatPredatesStatementDays() throws {
        let account = try decode(Account.self, """
        {"id":"3f1d5c7e-1c0f-4b8e-9a0e-6f9d2c1a7e22","userId":"u1","name":"BBVA","type":"credito","institution":"BBVA",
         "last4":"1234","balanceCents":-250000,"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}
        """)
        #expect(account.balanceCents == -250000)
        #expect(account.cutoffDay == nil)
        #expect(account.type == .credito)
    }

    @Test func decodesAGoalWithACalendarDeadline() throws {
        let goal = try decode(Goal.self, """
        {"id":"0b4d5c7e-1c0f-4b8e-9a0e-6f9d2c1a7e11","userId":"u1","name":"Viaje","emoji":"🌿","targetCents":500000,
         "currentCents":120000,"deadline":"2027-03-01","archivedAt":null,
         "createdAt":"2026-11-01T00:00:00.000Z","updatedAt":"2026-11-02T00:00:00.000Z"}
        """)
        #expect(goal.deadline == CalendarDay(year: 2027, month: 3, day: 1))
    }

    @Test func profileDefaultsTheReminderFieldsLikeTheWeb() throws {
        let profile = try decode(UserProfile.self, """
        {"userId":"u1","displayName":"Ana","pain":["olvido"],"inputPreference":"widget","densityMode":"simple",
         "showBalances":true,"weeklyBudgetCents":200000,"onboardingCompleted":true,
         "createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}
        """)
        #expect(profile.dailyReminderEnabled)
        #expect(profile.dailyReminderHour == 21)
        #expect(profile.timeZone == "America/Mexico_City")
        #expect(profile.inputPreference == .widget)
    }

    @Test func decodesACardStatement() throws {
        let statement = try decode(CardStatement.self, """
        {"today":"2026-11-20","cutoffDate":"2026-11-15","paymentDate":"2026-12-05","dueCents":80000,
         "openPeriodCents":12000,"nextCutoffDate":"2026-12-15"}
        """)
        #expect(statement.paymentDate == CalendarDay(year: 2026, month: 12, day: 5))
    }

    @Test func decodesAGroupDetail() throws {
        let detail = try decode(GroupDetail.self, """
        {"group":{"id":"0b4d5c7e-1c0f-4b8e-9a0e-6f9d2c1a7e11","name":"Depa","createdBy":"u1",
                  "createdAt":"2026-11-01T00:00:00.000Z","members":[{"userId":"u1","name":"Ana","email":"a@b.co"}],
                  "myBalanceCents":5000},
         "expenses":[{"id":"1b4d5c7e-1c0f-4b8e-9a0e-6f9d2c1a7e11","groupId":"0b4d5c7e-1c0f-4b8e-9a0e-6f9d2c1a7e11",
                      "paidBy":"u1","description":"Super","amountCents":10000,"date":"2026-11-10","createdBy":"u1",
                      "createdAt":"2026-11-10T10:00:00.000Z","splits":[{"userId":"u1","shareCents":5000}]}],
         "settlements":[],
         "balances":{"balances":{"u1":5000},"debts":[{"from":"u2","to":"u1","amountCents":5000}]}}
        """)
        #expect(detail.group.myBalanceCents == 5000)
        #expect(detail.balances.debts.first?.to == "u1")
        #expect(detail.expenses.first?.splits.first?.shareCents == 5000)
    }

    @Test func rejectsAnUnknownAccountType() {
        #expect(throws: DecodingError.self) {
            try decode(AccountType.self, #""criptomoneda""#)
        }
    }
}
