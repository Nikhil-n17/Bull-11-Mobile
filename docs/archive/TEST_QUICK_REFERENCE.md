# Authentication Tests - Quick Reference

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run security tests only
npm run test:security

# Watch mode
npm run test:watch
```

## 📁 Test Files

```
bull-11-app/
├── jest.config.js                           # Jest configuration
├── jest.setup.js                            # Global test setup
├── TESTING.md                               # Full test documentation
└── src/
    ├── core/security/__tests__/
    │   ├── TokenService.test.ts            # 38 tests - Token management
    │   ├── SessionManager.test.ts          # 28 tests - Session timeout
    │   └── RateLimiter.test.ts             # 32 tests - Rate limiting
    └── presentation/hooks/__tests__/
        └── useAuth.test.ts                  # 25 tests - Auth integration
```

## ✅ Test Coverage

| Module | Tests | Coverage |
|--------|-------|----------|
| TokenService | 38 | Token expiry, validation, storage |
| SessionManager | 28 | 30-min timeout, activity tracking |
| RateLimiter | 32 | 5 attempts, 30-min lockout |
| useAuth Hook | 25 | Login/logout flows, integration |
| **TOTAL** | **123** | **Complete security coverage** |

## 🔐 Critical Security Tests

### Token Security ✅
- [x] Expires after 24 hours
- [x] Auto-cleared when expired
- [x] Invalid tokens handled gracefully
- [x] Concurrent operations safe

### Session Security ✅
- [x] 30-minute inactivity timeout
- [x] Activity updates reset timer
- [x] Background/foreground handling
- [x] Expiry triggers logout

### Rate Limiting ✅
- [x] Max 5 attempts / 15 minutes
- [x] 30-minute lockout after 5 fails
- [x] Per-user rate limiting
- [x] Brute force protection

### Auth Flow ✅
- [x] Login stores token + starts session
- [x] Logout clears token + ends session
- [x] Registration (no auto-login)
- [x] Role-based access control

## 🧪 Test Commands

```bash
# Run specific test file
npm test -- TokenService.test.ts
npm test -- SessionManager.test.ts
npm test -- RateLimiter.test.ts
npm test -- useAuth.test.ts

# Run by test name pattern
npm test -- --testNamePattern="should reject expired tokens"

# Run with verbose output
npm test -- --verbose

# Run failed tests only
npm test -- --onlyFailures

# Clear cache and run
npm test -- --clearCache
```

## 📊 Coverage Report

After running `npm run test:coverage`, view report at:
```
bull-11-app/coverage/lcov-report/index.html
```

Coverage thresholds:
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

## 🐛 Debugging

```bash
# Debug single test
npm test -- --testNamePattern="login" --verbose

# Run with logs
npm test -- --silent=false

# Watch mode (auto-rerun on changes)
npm run test:watch
```

## 📦 Required Dependencies

Already added to `package.json`:
```json
{
  "devDependencies": {
    "@testing-library/react-native": "^12.4.3",
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.10",
    "react-test-renderer": "19.1.0"
  }
}
```

## 🔄 Test Workflow

1. **Before committing**:
   ```bash
   npm test
   ```

2. **Before PR**:
   ```bash
   npm run test:coverage
   ```

3. **During development**:
   ```bash
   npm run test:watch
   ```

## 📝 Test Structure

```typescript
describe('Feature', () => {
  beforeEach(async () => {
    // Setup
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup
    await AsyncStorage.clear();
  });

  test('should do something', async () => {
    // Arrange
    const input = 'test';

    // Act
    const result = await doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## 🎯 What's Tested

### ✅ TokenService
- Token storage with expiry
- Token retrieval and validation
- Expired token rejection
- Token clearance on logout
- Edge cases (corrupted data, concurrent ops)

### ✅ SessionManager
- Session start/end lifecycle
- 30-minute inactivity timeout
- Activity tracking and timer reset
- Session expiry callbacks
- Background/foreground handling

### ✅ RateLimiter
- Attempt recording (max 5)
- 30-minute lockout enforcement
- 15-minute rolling window
- Per-user rate limiting
- Brute force protection

### ✅ useAuth Hook
- Login/logout flows
- Registration flow
- Session integration
- Rate limiting integration
- Role detection (USER/ADMIN)
- Error handling

## 🚨 Known Issues

None! All 123 tests should pass.

## 📚 Resources

- Full documentation: `TESTING.md`
- Jest docs: https://jestjs.io/
- React Native Testing Library: https://callstack.github.io/react-native-testing-library/
- Testing best practices: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library

## 🤝 Contributing

When adding new auth features:
1. Write tests first (TDD)
2. Ensure 70%+ coverage
3. Test edge cases
4. Update TESTING.md
5. Run `npm run test:coverage`

---

**Status**: ✅ Ready for use
**Total Tests**: 123
**Coverage**: 70%+
**Last Updated**: 2024-03-14
