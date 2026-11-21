import SwiftUI

/// The four tabs of the app: Hoy, Movimientos, Dinero, Grupos.
struct MainTabs: View {
    @Environment(AppModel.self) private var app
    @State private var navigator = Navigator()

    var body: some View {
        @Bindable var navigator = navigator
        TabView(selection: $navigator.tab) {
            NavigationStack(path: $navigator.todayPath) {
                HomeView().routeDestinations()
            }
            .tabItem { Label("Hoy", systemImage: "house") }
            .tag(MainTab.today)

            NavigationStack(path: $navigator.movementsPath) {
                TransactionsView().routeDestinations()
            }
            .tabItem { Label("Movimientos", systemImage: "list.bullet.rectangle") }
            .tag(MainTab.movements)

            NavigationStack(path: $navigator.moneyPath) {
                MoneyView().routeDestinations()
            }
            .tabItem { Label("Dinero", systemImage: "wallet.bifold") }
            .tag(MainTab.money)

            NavigationStack(path: $navigator.groupsPath) {
                GroupsView().routeDestinations()
            }
            .tabItem { Label("Grupos", systemImage: "person.2") }
            .tag(MainTab.groups)
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            OfflineBanner(connectivity: app.connectivity)
        }
        .sheet(isPresented: $navigator.isAddingExpense) {
            AddExpenseSheet()
        }
        .fullScreenCover(isPresented: $navigator.isShowingPanic) {
            PanicView()
        }
        // Outermost on purpose: sheets and covers inherit the environment of the view they are attached to.
        .environment(navigator)
    }
}
