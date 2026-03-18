# Game Rules & Edge Case Handling - Implementation Summary

## Overview
Enhanced the New Game screen and StartGameUseCase with comprehensive validation, smart business rules, and robust edge case handling.

## Files Modified

### 1. `/src/domain/usecases/game/StartGameUseCase.ts`
**Enhancements:**
- ✅ **Duplicate Request Prevention**: Added `isGameStarting` flag to prevent concurrent game start requests
- ✅ **Enhanced Validation**:
  - Null/undefined array check
  - Empty symbol validation
  - Type validation (ensure strings)
  - Case-insensitive duplicate detection
  - Invalid instrument token check (must be > 0)

**New Validations:**
```typescript
- Stock symbols must be an array
- All symbols must be non-empty strings
- 3-5 stocks requirement (unchanged)
- No duplicates (case-insensitive)
- All symbols properly trimmed
- Prevents duplicate simultaneous requests
```

### 2. `/app/(tabs)/new-game.tsx`
**Major Enhancements:**

#### A. Search Functionality
- ✅ **Empty Results Handling**: Shows "No stocks found" message
- ✅ **Data Validation**: Filters out stocks with invalid/missing data
- ✅ **Malformed Data**: Handles backend errors gracefully
- ✅ **Network Errors**: Specific error messages with retry guidance
- ✅ **Session Errors**: Detects 401/403 and prompts re-login

**Error Categorization:**
```typescript
- Kite/Auth errors → "Unable to search stocks right now"
- Network errors → "Please check your connection"
- Session errors → "Session expired. Please log in again"
- Other errors → Show as-is (e.g., market hours)
```

#### B. Stock Selection Rules
- ✅ **Validation Before Selection**:
  - Stock must have symbol, name, instrumentToken
  - Instrument token must be valid number > 0
  - No duplicate stocks (case-insensitive)
  - Max 5 stocks enforced with clear message
  
- ✅ **Penny Stock Warning**:
  - Stocks below ₹10 trigger warning dialog
  - User can choose to add anyway
  - Shows price in warning message

- ✅ **Visual Feedback**:
  - Already selected stocks shown with checkmark (✓)
  - Selected stocks disabled/grayed out in search results
  - Penny stocks highlighted in orange

#### C. Stock Removal
- ✅ **Case-Insensitive Matching**: Works correctly even if symbol case differs
- ✅ **Clean State**: Clears validation errors on removal
- ✅ **Index Handling**: Proper array filtering maintains correct order

#### D. Game Start Validation
**Pre-Start Checks:**
1. ✅ User authentication verified
2. ✅ 3-5 stocks selected
3. ✅ All stocks have valid data (symbol, name, instrumentToken > 0)
4. ✅ No duplicates (defensive check)
5. ✅ Symbols properly trimmed before submission

**Smart Warnings (allows game to proceed):**
- ⚠️ All stocks from same exchange (limited diversification)
- ⚠️ Penny stocks present (warns about high volatility)

**Confirmation Dialog:**
```
Start a new game with 4 stocks?

⚠️ All stocks are from NSE exchange
⚠️ 1 penny stock(s) selected (high volatility)
```

#### E. Loading States & UX
- ✅ **Search Loading**: Spinner in search input
- ✅ **Start Loading**: Spinner in button, disables all inputs
- ✅ **Success Flow**: Clear message → Navigate to active games
- ✅ **Error Handling**: Shows error banner AND alert
- ✅ **State Cleanup**: All states cleared on success/navigation

#### F. Edge Cases Handled

| Edge Case | Handling |
|-----------|----------|
| User selects 6th stock | Blocked with "Maximum reached" message |
| Remove stock from middle | Array filtered correctly, no index issues |
| Search → clear → select | Works seamlessly, search results cleared |
| Select → remove → re-search → select same stock | Fully supported |
| Network fails during search | Error shown, allows retry |
| Backend returns empty array | "No stocks found" message |
| Backend returns malformed data | Filtered out, shows count of invalid stocks |
| Duplicate game start requests | Prevented with `isGameStarting` flag |
| Search while game starting | Input disabled during game start |

## Constants Defined

```typescript
const MIN_STOCKS = 3;
const MAX_STOCKS = 5;
const PENNY_STOCK_THRESHOLD = 10; // Stocks below ₹10
```

## UI Enhancements

### New Visual Elements
1. **Stock Price Display**: Shows price in search results
2. **Penny Stock Indicator**: Orange color for low-price stocks
3. **Selected Indicator**: Checkmark (✓) instead of plus (+)
4. **Validation Error Banner**: Yellow/orange banner for selection issues
5. **Search Error Banner**: Red banner for search failures
6. **Selected/Disabled State**: Grayed out selected stocks in results

### Error Display Hierarchy
```
1. Validation Error (orange) - shown below selected stocks
2. Search Error (red) - shown below search results
3. Alert Dialogs - for critical validations
```

## Testing Scenarios

### ✅ Successful Paths
- [x] Select 3 stocks → Start game
- [x] Select 5 stocks → Start game
- [x] Select with penny stock → Accept warning → Start game
- [x] Search → Select → Remove → Search → Select again
- [x] All stocks from different exchanges

### ⚠️ Warning Paths (Allow Proceed)
- [x] All stocks from same exchange
- [x] Includes penny stocks
- [x] Both conditions combined

### ❌ Error Paths (Block)
- [x] Try to select < 3 stocks
- [x] Try to select > 5 stocks
- [x] Try to select same stock twice
- [x] Try to select stock with missing data
- [x] Try to start with invalid stocks
- [x] Network error during search
- [x] Session expired
- [x] Multiple simultaneous start requests

## Security & Data Integrity

1. **Case-Insensitive Matching**: Prevents "INFY" and "infy" as duplicates
2. **Symbol Trimming**: Removes whitespace before submission
3. **Type Validation**: Ensures instrumentToken is number
4. **Null/Undefined Checks**: Defensive programming throughout
5. **Request Deduplication**: Prevents double-submission
6. **Input Disabling**: UI locked during operations

## Error Messages - User-Friendly

| Technical Error | User Message |
|----------------|--------------|
| Kite auth failed | "Unable to search stocks right now. Please try again later." |
| Network timeout | "Network error. Please check your connection and try again." |
| 401/403 | "Session expired. Please log in again." |
| Empty results | "No stocks found matching your search" |
| Invalid data | "Search returned invalid stock data" |
| Duplicate stock | "This stock is already selected" |
| Max reached | "You can select up to 5 stocks only" |
| Invalid instrumentToken | "This stock has an invalid instrument token" |

## Performance Considerations

- **Debounced Search**: 500ms delay prevents API spam
- **Efficient Filtering**: Single-pass validation of search results
- **Proper Cleanup**: Timeout cleared on unmount
- **State Management**: Minimal re-renders with focused state updates
- **Disabled States**: Prevents unnecessary operations during loading

## Future Enhancements (Optional)

1. **Sector Diversification**: If backend provides sector data
   - Warn if all stocks from same sector
   - Show sector distribution in confirmation

2. **Market Cap Validation**: If backend provides market cap
   - Warn if all large-cap or all small-cap
   - Suggest diversification

3. **Trading Volume Check**: If backend provides volume data
   - Warn about illiquid stocks
   - Show average daily volume

4. **Suspended Stock Detection**: If backend provides status
   - Block suspended/delisted stocks
   - Show clear error message

5. **Price Validation**: If backend provides price
   - Block stocks without valid price
   - Show last updated timestamp

## Documentation References

- Main README: `/Users/I757930/Documents/Projects/bull-11-app/README.md`
- Architecture: `/Users/I757930/Documents/Projects/bull-11-app/ARCHITECTURE.md`
- Memory: `/Users/I757930/.claude/projects/-Users-I757930-Documents-Projects/memory/MEMORY.md`

## Status: ✅ COMPLETE

All requested game rules and edge case handling have been implemented and tested.
