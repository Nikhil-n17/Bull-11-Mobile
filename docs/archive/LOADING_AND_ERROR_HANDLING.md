# Loading States & Error Handling Documentation

## Overview
This document describes the loading states and error handling implementation across all screens in the Bull-11 app.

## Reusable Components

### 1. LoadingSpinner
Location: `/src/presentation/components/common/LoadingSpinner.tsx`

A reusable loading indicator component with optional message.

**Usage:**
```tsx
import { LoadingSpinner } from '@/src/presentation/components/common/LoadingSpinner';

// Basic usage
<LoadingSpinner message="Loading data..." />

// With custom size and color
<LoadingSpinner
  message="Please wait..."
  size="small"
  color="#007AFF"
/>
```

**Props:**
- `message?: string` - Optional loading message (default: "Loading...")
- `size?: 'small' | 'large'` - Spinner size (default: 'large')
- `color?: string` - Spinner color (default: '#007AFF')
- `style?: ViewStyle` - Optional custom styles

---

### 2. ErrorDisplay
Location: `/src/presentation/components/common/ErrorDisplay.tsx`

A full-screen error display component with retry functionality.

**Usage:**
```tsx
import { ErrorDisplay } from '@/src/presentation/components/common/ErrorDisplay';

<ErrorDisplay
  title="Failed to Load Data"
  message="Unable to connect to the server. Please check your connection."
  onRetry={loadData}
  retryText="Try Again"
/>
```

**Props:**
- `message: string` - Error message to display (required)
- `title?: string` - Error title (default: 'Error')
- `onRetry?: () => void` - Optional retry callback
- `retryText?: string` - Retry button text (default: 'Retry')
- `style?: ViewStyle` - Optional custom styles
- `showIcon?: boolean` - Show warning icon (default: true)

---

### 3. ErrorBanner
Location: `/src/presentation/components/common/ErrorBanner.tsx`

An inline error banner for displaying errors without replacing content. Useful for showing errors while keeping the UI functional.

**Usage:**
```tsx
import { ErrorBanner } from '@/src/presentation/components/common/ErrorBanner';

// Error banner
<ErrorBanner
  message="Failed to refresh data"
  type="error"
  onDismiss={() => setError(null)}
/>

// Warning banner
<ErrorBanner
  message="Your session will expire soon"
  type="warning"
/>

// Info banner
<ErrorBanner
  message="New data is available"
  type="info"
/>
```

**Props:**
- `message: string` - Banner message (required)
- `onDismiss?: () => void` - Optional dismiss callback
- `type?: 'error' | 'warning' | 'info'` - Banner type (default: 'error')
- `style?: ViewStyle` - Optional custom styles

---

## Error Handler Utility

Location: `/src/core/utils/errorHandler.ts`

A utility class for parsing errors and providing user-friendly messages.

### Features:
- Categorizes errors into types (Network, Unauthorized, Server, etc.)
- Provides user-friendly error messages
- Determines if retry is recommended
- Checks if logout is needed (for auth errors)

### Error Types:
- `NETWORK` - Network connection errors
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Access denied
- `NOT_FOUND` (404) - Resource not found
- `SERVER` (500+) - Server errors
- `VALIDATION` (400) - Validation errors
- `TIMEOUT` - Request timeout
- `UNKNOWN` - Unknown errors

### Usage:
```tsx
import { ErrorHandler } from '@/src/core/utils/errorHandler';

try {
  // API call
} catch (err) {
  // Get full error details
  const errorDetails = ErrorHandler.parseError(err);
  console.log(errorDetails.type); // ErrorType
  console.log(errorDetails.title); // User-friendly title
  console.log(errorDetails.message); // User-friendly message
  console.log(errorDetails.shouldRetry); // boolean

  // Or just get the message
  const message = ErrorHandler.getShortMessage(err);
  setError(message);

  // Check if should logout
  if (ErrorHandler.shouldLogout(err)) {
    logout();
  }

  // Check if retry is recommended
  if (ErrorHandler.shouldRetry(err)) {
    // Show retry button
  }
}
```

---

## Implementation Pattern

### Standard Screen Pattern:

```tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { LoadingSpinner, ErrorDisplay, ErrorBanner } from '@/src/presentation/components/common';
import { ErrorHandler } from '@/src/core/utils/errorHandler';

export default function MyScreen() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchData();
      setData(result);
    } catch (err) {
      const errorMessage = ErrorHandler.getShortMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Show full-screen loading on initial load
  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading data..." />;
  }

  // Show full-screen error on initial load failure
  if (error && !refreshing) {
    return (
      <ErrorDisplay
        title="Failed to Load"
        message={error}
        onRetry={loadData}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Show inline error banner during refresh */}
      {error && refreshing && (
        <ErrorBanner message={error} type="error" />
      )}

      <FlatList
        data={data}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}
```

---

## Screens Updated

### 1. Active Games Screen (`app/(tabs)/index.tsx`)
- ✅ Loading state with LoadingSpinner
- ✅ Error display with retry functionality
- ✅ Error banner for refresh failures
- ✅ Enhanced error messages using ErrorHandler
- ✅ Proper error handling in handleCloseGame

### 2. History Screen (`app/(tabs)/history.tsx`)
- ✅ Loading state with LoadingSpinner
- ✅ Error display with retry functionality
- ✅ Error banner for refresh failures
- ✅ Enhanced error messages using ErrorHandler

### 3. Admin Screen (`app/(tabs)/admin.tsx`)
- ✅ Loading state with LoadingSpinner
- ✅ Error display with retry functionality
- ✅ Enhanced error messages using ErrorHandler

### 4. Users Screen (`app/(admin)/users.tsx`)
- ✅ Loading state with LoadingSpinner
- ✅ Error display with retry functionality
- ✅ Enhanced error messages using ErrorHandler

### 5. User Detail Screen (`app/(admin)/users/[id].tsx`)
- ✅ Loading state with LoadingSpinner
- ✅ Error display with retry functionality
- ✅ Enhanced error messages using ErrorHandler

### 6. Login Screen (`src/presentation/screens/auth/LoginScreen.tsx`)
- ✅ Already has proper loading state
- ✅ Already has error handling with ErrorText
- ✅ Rate limiting warnings

### 7. Register Screen (`src/presentation/screens/auth/RegisterScreen.tsx`)
- ✅ Already has proper loading state
- ✅ Already has error handling with ErrorText
- ✅ Password strength validation

### 8. Kite Setup Screen (`src/presentation/screens/admin/KiteSetupScreen.tsx`)
- ✅ Already has comprehensive error handling
- ✅ Loading states during authentication
- ✅ Success and error message cards

---

## Error Handling Best Practices

### 1. Always Set Loading States
```tsx
setLoading(true);
try {
  // API call
} finally {
  setLoading(false); // Always in finally block
}
```

### 2. Clear Previous Errors
```tsx
const loadData = async () => {
  try {
    setLoading(true);
    setError(null); // Clear previous errors
    // ...
  }
}
```

### 3. Use ErrorHandler for Consistency
```tsx
catch (err) {
  const errorMessage = ErrorHandler.getShortMessage(err);
  setError(errorMessage);
}
```

### 4. Different UI for Initial Load vs Refresh
```tsx
// Initial load: full-screen loading/error
if (loading && !refreshing) {
  return <LoadingSpinner />;
}

// Refresh: inline banner
if (error && refreshing) {
  return <ErrorBanner message={error} />;
}
```

### 5. Provide Retry Functionality
```tsx
<ErrorDisplay
  message={error}
  onRetry={loadData} // Allow users to retry
/>
```

### 6. Handle Specific Error Cases
```tsx
catch (err) {
  const errorDetails = ErrorHandler.parseError(err);

  // Don't show alerts for network errors (show in UI instead)
  if (errorDetails.type !== 'NETWORK') {
    Alert.alert(errorDetails.title, errorDetails.message);
  }

  setError(errorDetails.message);
}
```

---

## Testing Scenarios

Test these scenarios for each screen:

1. **Initial Load Success**: Data loads correctly
2. **Initial Load Failure**: Error display with retry button
3. **Network Error**: User-friendly network error message
4. **Refresh Success**: Pull-to-refresh works
5. **Refresh Failure**: Error banner appears, data remains visible
6. **Retry After Error**: Retry button reloads data
7. **401 Unauthorized**: Session timeout handling
8. **500 Server Error**: Server error message
9. **Timeout**: Timeout error message

---

## Future Enhancements

1. **Skeleton Screens**: Consider adding skeleton loaders for better UX
2. **Offline Mode**: Add offline data caching
3. **Toast Notifications**: Add toast notifications for minor errors
4. **Error Reporting**: Integrate error reporting service (Sentry, etc.)
5. **Network Status Indicator**: Show network status in the app
6. **Automatic Retry**: Implement exponential backoff for retries

---

## Summary

All screens now have:
- ✅ Proper loading states with visual feedback
- ✅ User-friendly error messages
- ✅ Retry functionality for recoverable errors
- ✅ Consistent error handling approach
- ✅ Distinction between initial load and refresh errors
- ✅ Reusable components for DRY code
