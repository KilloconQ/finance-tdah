import Testing

/// Parent of every suite that uses `StubURLProtocol`: its handler is global, so they must not run in parallel.
@Suite(.serialized)
struct NetworkedTests {}
