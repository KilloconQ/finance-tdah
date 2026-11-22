import SwiftUI

enum AuthRoute: Hashable {
    case signUp
    case forgotPassword
}

struct AuthFlow: View {
    @State private var path: [AuthRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            SignInView(path: $path)
                .navigationDestination(for: AuthRoute.self) { route in
                    switch route {
                    case .signUp: SignUpView(path: $path)
                    case .forgotPassword: ForgotPasswordView(path: $path)
                    }
                }
        }
    }
}
