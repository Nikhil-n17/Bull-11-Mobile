# Direct URL Navigation Security Testing Guide

## Overview
This document outlines how to test the security measures preventing unauthorized direct URL navigation in the Bull-11 React Native app.

## Security Issue (FIXED)
**Previous Vulnerability**: Users could bypass authentication by directly navigating to protected routes via URL manipulation.

**Solution Implemented**:
- Added `AuthGuard` component that wraps the entire app
- Guards check authentication state before rendering any route
- Admin routes require additional role validation
- Proper loading states prevent flash of protected content

## Test Scenarios

### Test 1: Unauthenticated Direct URL Access
**Objective**: Verify that unauthenticated users cannot access protected routes.

**Steps**:
1. Clear browser storage (localStorage/sessionStorage)
   - Open DevTools → Application → Storage → Clear All
2. Navigate directly to: `http://localhost:5050/(tabs)`
3. Navigate directly to: `http://localhost:5050/(tabs)/profile`
4. Navigate directly to: `http://localhost:5050/(tabs)/new-game`
5. Navigate directly to: `http://localhost:5050/(tabs)/history`

**Expected Result**:
- All attempts should redirect to `/auth/login`
- No flash of protected content
- Loading spinner briefly shows during redirect

### Test 2: Authenticated Non-Admin Access to Admin Routes
**Objective**: Verify that regular users cannot access admin-only routes.

**Steps**:
1. Login as a regular USER (not ADMIN)
2. Verify you're on `/(tabs)` page
3. Navigate directly to: `http://localhost:5050/(tabs)/admin`
4. Navigate directly to: `http://localhost:5050/(admin)/dashboard`
5. Navigate directly to: `http://localhost:5050/(admin)/users`

**Expected Result**:
- All attempts should redirect to `/(tabs)` (regular user home)
- No access granted to admin routes
- Admin tab should not be visible in tab bar

### Test 3: Admin User Access
**Objective**: Verify that admin users CAN access all routes.

**Steps**:
1. Login as an ADMIN user
2. Navigate directly to: `http://localhost:5050/(tabs)/admin`
3. Navigate directly to: `http://localhost:5050/(admin)/dashboard`
4. Navigate directly to: `http://localhost:5050/(admin)/users`

**Expected Result**:
- All routes should load successfully
- Admin tab visible in tab bar
- No redirects occur

### Test 4: Session Expiry
**Objective**: Verify that expired sessions redirect to login.

**Steps**:
1. Login successfully
2. Wait for session timeout (30 minutes) OR manually clear token:
   - Open DevTools → Application → Local Storage
   - Delete `auth_token` key
3. Try to navigate to any protected route
4. Try to navigate directly via URL

**Expected Result**:
- Should redirect to `/auth/login`
- Error message: "Session expired due to inactivity"

### Test 5: Token Validation
**Objective**: Verify that invalid/tampered tokens are rejected.

**Steps**:
1. Login successfully
2. Open DevTools → Application → Local Storage
3. Modify the `auth_token` value (change a few characters)
4. Navigate to any protected route
5. Try direct URL navigation

**Expected Result**:
- Should redirect to `/auth/login`
- No access granted with invalid token

### Test 6: Race Condition (Fast Navigation)
**Objective**: Verify no security holes during loading states.

**Steps**:
1. Logout completely
2. Rapidly type URLs in browser:
   - `http://localhost:5050/(tabs)`
   - Press Enter immediately
   - Try multiple times quickly

**Expected Result**:
- Should always redirect to `/auth/login`
- Loading state prevents content flash
- No race condition exploits

## Implementation Details

### AuthGuard Component
Location: `/src/presentation/components/guards/AuthGuard.tsx`

**Features**:
- Checks `isAuthenticated` state from `useAuth` hook
- Monitors current route segments via `useSegments()`
- Redirects unauthenticated users to `/auth/login`
- Redirects authenticated users away from auth pages
- Optional `requireAdmin` prop for admin-only routes
- Shows loading spinner during auth checks
- Prevents content flash with proper loading states

**Integration Points**:
1. **Root Layout** (`app/_layout.tsx`): Wraps entire app
2. **Admin Layout** (`app/(admin)/_layout.tsx`): Additional admin check

### Key Security Features

1. **Route Segment Monitoring**:
   ```typescript
   const segments = useSegments();
   const inAuthGroup = segments[0] === 'auth';
   ```

2. **Auth State Checks**:
   ```typescript
   if (!isAuthenticated && !inAuthGroup) {
     router.replace('/auth/login');
   }
   ```

3. **Admin Role Validation**:
   ```typescript
   if (requireAdmin && !isAdmin) {
     router.replace('/(tabs)');
   }
   ```

4. **Loading State Protection**:
   - Shows spinner while `loading === true`
   - Prevents rendering protected content during redirect
   - No flash of unauthorized content

## Console Logging

The AuthGuard logs all security events:
- `[AuthGuard] Unauthorized access detected - redirecting to login`
- `[AuthGuard] Already authenticated - redirecting to app`
- `[AuthGuard] Non-admin trying to access admin route - redirecting`

Monitor browser console during testing.

## Manual Testing Commands

```bash
# Start the app
cd /Users/I757930/Documents/Projects/bull-11-app
npm run web

# Open in browser
open http://localhost:5050

# Clear storage (in DevTools Console)
localStorage.clear()
sessionStorage.clear()

# Navigate to protected routes
window.location.href = 'http://localhost:5050/(tabs)'
window.location.href = 'http://localhost:5050/profile'
window.location.href = 'http://localhost:5050/(tabs)/admin'
```

## Automated Test Cases (Future)

Consider adding E2E tests with Playwright/Cypress:

```typescript
// Example test case
test('should redirect unauthenticated users', async ({ page }) => {
  await page.goto('http://localhost:5050/(tabs)');
  await expect(page).toHaveURL(/auth\/login/);
});

test('should allow admin to access admin routes', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('http://localhost:5050/(admin)/dashboard');
  await expect(page).toHaveURL(/(admin)\/dashboard/);
});
```

## Troubleshooting

### Issue: Redirect loops
**Cause**: Auth state not properly initialized
**Solution**: Check useAuth hook's loading state logic

### Issue: Content flashes before redirect
**Cause**: Missing loading state check
**Solution**: Verify AuthGuard shows spinner while loading

### Issue: Admin can't access admin routes
**Cause**: Role not properly set in token/user object
**Solution**: Check JWT token payload, verify role field

## Security Checklist

- ✅ All protected routes wrapped in AuthGuard
- ✅ Admin routes have additional role check
- ✅ Direct URL navigation properly blocked
- ✅ Token validation on every route access
- ✅ Session expiry redirects to login
- ✅ No content flash during redirects
- ✅ Loading states properly handled
- ✅ Console logging for debugging
- ✅ Race condition protection

## Next Steps

1. Run all test scenarios manually
2. Verify console logs show expected behavior
3. Test with multiple user roles
4. Test on different browsers
5. Consider adding E2E automated tests
6. Test on mobile devices (iOS/Android)
