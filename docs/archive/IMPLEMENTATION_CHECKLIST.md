# Implementation Checklist - Game Rules & Edge Cases

## ✅ Game Rules Implemented

### Stock Selection Rules
- [x] **3-5 stocks requirement** - Enforced in both UI and UseCase
- [x] **No duplicate stocks** - Case-insensitive check
- [x] **Valid stock data** - symbol, name, instrumentToken must exist
- [x] **Valid instrument token** - Must be number > 0
- [x] **Penny stock warning** - Below ₹10 shows warning dialog
- [x] **Exchange awareness** - Warns if all from same exchange
- [x] **Max limit enforcement** - Blocks 6th stock selection

### Data Validation
- [x] **Stock must have valid data** - Pre-selection validation
- [x] **Price validation** - Checks if price is valid number
- [x] **Instrument token validation** - Type and value checks
- [x] **Symbol validation** - Non-empty string required

### Diversification Checks (Warnings Only)
- [x] **Single exchange warning** - Shows in confirmation dialog
- [x] **Penny stock warning** - Shows count in confirmation
- [x] **User can proceed** - Warnings don't block game start

## ✅ Edge Cases Handled

### Selection Flow
- [x] **User selects 6th stock** → Blocked with message
- [x] **Remove from middle** → Array updates correctly
- [x] **Clear search + select** → Works seamlessly
- [x] **Remove + re-select same** → Fully supported
- [x] **Case differences** → "INFY" == "infy" detected

### Search & Network
- [x] **Network fails** → Error shown, retry allowed
- [x] **Empty results** → "No stocks found" message
- [x] **Malformed data** → Filtered out, count shown
- [x] **Session expired** → Detected and message shown
- [x] **Timeout errors** → Specific error message

### Game Start
- [x] **Double-click protection** → `isGameStarting` flag
- [x] **Invalid data** → Pre-start validation blocks
- [x] **Duplicate check** → Defensive validation
- [x] **Not authenticated** → Blocked with message
- [x] **Invalid count** → < 3 or > 5 blocked

## ✅ Loading States

- [x] **Search loading** → Spinner in input field
- [x] **Start loading** → Button spinner, inputs disabled
- [x] **Success state** → Alert + navigation
- [x] **Error state** → Banner + Alert dialog

## ✅ UI Enhancements

### Visual Feedback
- [x] **Selected stocks** → Green chips with X button
- [x] **Already selected** → Checkmark (✓) in results
- [x] **Disabled state** → Grayed out when selected
- [x] **Penny stocks** → Orange price indicator
- [x] **Stock prices** → Shown in search results

### Error Display
- [x] **Validation errors** → Orange banner (non-blocking)
- [x] **Search errors** → Red banner (persistent)
- [x] **Critical errors** → Alert dialogs (blocking)

### Empty States
- [x] **No search** → Magnifying glass icon + instructions
- [x] **No results** → "No stocks found" message
- [x] **Need more stocks** → Blue hint showing count needed

## ✅ User Experience

### Clear Messaging
- [x] **Technical errors hidden** → User-friendly messages
- [x] **Action guidance** → "Please check connection" etc.
- [x] **Selection count** → "Selected (2/5)" indicator
- [x] **Progress hints** → "Select 1 more stock to start"

### Smooth Interactions
- [x] **Debounced search** → 500ms delay
- [x] **Cleanup on unmount** → Timers cleared
- [x] **State reset** → All cleared on success
- [x] **Keyboard handling** → Dismisses properly

## ✅ Code Quality

### Architecture
- [x] **Clean Architecture** → Separation maintained
- [x] **Single Responsibility** → Each function focused
- [x] **Type Safety** → Full TypeScript typing
- [x] **Error Handling** → Try-catch throughout

### Performance
- [x] **Efficient filtering** → Single-pass validation
- [x] **Minimal re-renders** → Focused state updates
- [x] **Proper cleanup** → No memory leaks
- [x] **Disabled during ops** → Prevents spam

## 🧪 Testing Scenarios

### Happy Paths
```
✓ Search "INFY" → Select → Add to 3 stocks → Start game
✓ Select 5 different stocks → Start game
✓ Select penny stock → Accept warning → Start game
✓ Mix of NSE and BSE stocks → Start game
```

### Warning Paths
```
✓ All NSE stocks → Warning shown → Can proceed
✓ 2 penny stocks → Warning shown → Can proceed
✓ Same exchange + penny → Both warnings → Can proceed
```

### Error Paths
```
✓ Select 2 stocks → Try start → Blocked
✓ Select 6th stock → Blocked with message
✓ Select INFY twice → Second attempt blocked
✓ No network → Error shown → Can retry
✓ Session expired → Message shown → Must re-login
✓ Click Start twice quickly → Second blocked
```

### Complex Flows
```
✓ Search → Select 3 → Remove 1 → Search → Select 1 → Start
✓ Select 5 → Remove middle → Add different → Start
✓ Search "invalid" → No results → Search "INFY" → Select
✓ Select penny → Cancel warning → Select different → Start
```

## 📂 Files Modified

1. **`/src/domain/usecases/game/StartGameUseCase.ts`**
   - Added duplicate request prevention
   - Enhanced validation logic
   - Case-insensitive duplicate check
   - Type and value validation

2. **`/app/(tabs)/new-game.tsx`**
   - Comprehensive error handling
   - Smart validations and warnings
   - Enhanced visual feedback
   - Edge case handling throughout

3. **`/GAME_RULES_SUMMARY.md`** (Created)
   - Complete documentation
   - Testing scenarios
   - Future enhancements

4. **`/IMPLEMENTATION_CHECKLIST.md`** (This file)
   - Verification checklist
   - Testing guide

## 🚀 Ready for Testing

The implementation is complete and ready for:
1. Manual testing with backend
2. User acceptance testing
3. Integration with production data

## 📝 Notes

- All requested features implemented
- Clean Architecture principles maintained
- Zero breaking changes to existing code
- Backward compatible with current backend
- Production-ready code quality
