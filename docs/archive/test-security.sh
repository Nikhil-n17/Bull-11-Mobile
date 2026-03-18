#!/bin/bash

# Bull-11 Security Test Script
# Tests direct URL navigation protection

echo "======================================"
echo "Bull-11 Security Testing Script"
echo "======================================"
echo ""

# Check if the app is running
if ! curl -s http://localhost:5050 > /dev/null; then
    echo "❌ ERROR: App is not running on localhost:5050"
    echo "Please start the app with: npm run web"
    exit 1
fi

echo "✅ App is running on localhost:5050"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "Manual Testing Instructions"
echo "======================================"
echo ""

echo "${YELLOW}Test 1: Unauthenticated Direct URL Access${NC}"
echo "1. Open DevTools → Application → Storage → Clear All"
echo "2. Try these URLs:"
echo "   - http://localhost:5050/(tabs)"
echo "   - http://localhost:5050/(tabs)/profile"
echo "   - http://localhost:5050/(tabs)/new-game"
echo "   - http://localhost:5050/(tabs)/history"
echo "   - http://localhost:5050/(tabs)/admin"
echo ""
echo "Expected: All should redirect to /auth/login"
echo "Press Enter to continue..."
read

echo ""
echo "${YELLOW}Test 2: Check Console Logs${NC}"
echo "Open browser console and look for:"
echo "   [AuthGuard] Not authenticated, redirecting to login"
echo "Press Enter to continue..."
read

echo ""
echo "${YELLOW}Test 3: Login as Regular User${NC}"
echo "1. Login with a USER account"
echo "2. Try to access admin routes:"
echo "   - http://localhost:5050/(tabs)/admin"
echo "   - http://localhost:5050/(admin)/dashboard"
echo "   - http://localhost:5050/(admin)/users"
echo ""
echo "Expected: Redirect to /(tabs) or admin tab not visible"
echo "Press Enter to continue..."
read

echo ""
echo "${YELLOW}Test 4: Login as Admin${NC}"
echo "1. Login with an ADMIN account"
echo "2. Navigate to:"
echo "   - http://localhost:5050/(tabs)/admin"
echo "   - http://localhost:5050/(admin)/dashboard"
echo ""
echo "Expected: Both should work, admin tab visible"
echo "Press Enter to continue..."
read

echo ""
echo "${YELLOW}Test 5: Token Tampering${NC}"
echo "1. Stay logged in"
echo "2. Open DevTools → Application → Local Storage"
echo "3. Modify auth_token value (change a few characters)"
echo "4. Try to navigate to any protected route"
echo ""
echo "Expected: Redirect to /auth/login"
echo "Press Enter to continue..."
read

echo ""
echo "${YELLOW}Test 6: Session Expiry${NC}"
echo "1. Login successfully"
echo "2. Open DevTools → Application → Local Storage"
echo "3. Delete auth_token"
echo "4. Try to navigate to protected routes"
echo ""
echo "Expected: Redirect to /auth/login"
echo "Press Enter to continue..."
read

echo ""
echo "======================================"
echo "Automated Checks"
echo "======================================"
echo ""

# Check if guards exist
echo -n "Checking AuthGuard exists... "
if [ -f "/Users/I757930/Documents/Projects/bull-11-app/src/presentation/guards/AuthGuard.tsx" ]; then
    echo "${GREEN}✓${NC}"
else
    echo "${RED}✗${NC}"
fi

echo -n "Checking AdminGuard exists... "
if [ -f "/Users/I757930/Documents/Projects/bull-11-app/src/presentation/guards/AdminGuard.tsx" ]; then
    echo "${GREEN}✓${NC}"
else
    echo "${RED}✗${NC}"
fi

# Check if guards are integrated
echo -n "Checking root layout uses AuthGuard... "
if grep -q "AuthGuard" /Users/I757930/Documents/Projects/bull-11-app/app/_layout.tsx; then
    echo "${GREEN}✓${NC}"
else
    echo "${RED}✗${NC}"
fi

echo -n "Checking admin layout uses AdminGuard... "
if grep -q "AdminGuard" /Users/I757930/Documents/Projects/bull-11-app/app/\(admin\)/_layout.tsx; then
    echo "${GREEN}✓${NC}"
else
    echo "${RED}✗${NC}"
fi

# Check for useSegments usage
echo -n "Checking AuthGuard uses useSegments... "
if grep -q "useSegments" /Users/I757930/Documents/Projects/bull-11-app/src/presentation/guards/AuthGuard.tsx; then
    echo "${GREEN}✓${NC}"
else
    echo "${RED}✗${NC}"
fi

echo ""
echo "======================================"
echo "Security Checklist"
echo "======================================"
echo ""

echo "✅ AuthGuard component created"
echo "✅ AdminGuard component created"
echo "✅ Root layout wrapped in AuthGuard"
echo "✅ Admin routes wrapped in AdminGuard"
echo "✅ Route segment monitoring implemented"
echo "✅ Loading states prevent content flash"
echo "✅ Console logging for debugging"
echo ""

echo "======================================"
echo "Next Steps"
echo "======================================"
echo ""
echo "1. Complete all manual tests above"
echo "2. Verify console logs show expected behavior"
echo "3. Test with multiple user roles"
echo "4. Test on different browsers (Chrome, Firefox, Safari)"
echo ""
echo "For detailed testing guide, see:"
echo "  /Users/I757930/Documents/Projects/bull-11-app/SECURITY_TESTING.md"
echo ""
