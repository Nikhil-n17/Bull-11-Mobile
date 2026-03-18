# Performance Insights - Visual Examples

## Insight Banner Appearance

### Success Insights (Green Background)
```
┌─────────────────────────────────────┐
│ 🔥 Strong momentum!                 │ (Light green background)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💰 Exceptional gains!               │ (Light green background)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📈 Solid performance                │ (Light green background)
└─────────────────────────────────────┘
```

### Warning Insights (Orange Background)
```
┌─────────────────────────────────────┐
│ ⚡ High volatility                  │ (Light orange background)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚠️ One stock dragging down          │ (Light orange background)
└─────────────────────────────────────┘
```

### Danger Insights (Red Background)
```
┌─────────────────────────────────────┐
│ 📉 Portfolio struggling             │ (Light red background)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔻 Heavy losses                     │ (Light red background)
└─────────────────────────────────────┘
```

### Info Insights (Blue Background)
```
┌─────────────────────────────────────┐
│ 🎯 Steady performer                 │ (Light blue background)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🏆 AAPL is carrying you!            │ (Light blue background)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📊 Uneven performance               │ (Light blue background)
└─────────────────────────────────────┘
```

## Real-World Scenarios

### Scenario 1: Strong Bull Market
**Portfolio:** +7.2% total return
- AAPL: +8.5%
- GOOGL: +6.8%
- MSFT: +6.3%

**Insight Shown:** 🔥 Strong momentum!
**Reason:** All stocks positive, average >2%, high positive momentum

---

### Scenario 2: One Star Performer
**Portfolio:** +5.1% total return
- TSLA: +12.3%
- GOOGL: -1.2%
- AMZN: +0.8%

**Insight Shown:** 🏆 TSLA is carrying you!
**Reason:** One stock >5%, big spread between best and worst

---

### Scenario 3: Volatile Day
**Portfolio:** +1.2% total return
- GME: +15.7%
- AAPL: -8.3%
- MSFT: +4.1%

**Insight Shown:** ⚡ High volatility
**Reason:** High standard deviation (>60% volatility score)

---

### Scenario 4: Slow and Steady
**Portfolio:** +0.8% total return
- SPY: +0.9%
- BND: +0.7%
- VTI: +0.8%

**Insight Shown:** 🎯 Steady performer
**Reason:** Low volatility, small changes, consistent

---

### Scenario 5: Portfolio Crash
**Portfolio:** -6.8% total return
- NVDA: -7.2%
- AMD: -8.1%
- INTC: -5.2%

**Insight Shown:** 📉 Portfolio struggling
**Reason:** All stocks negative, average <-2%, strong negative momentum

---

## How It Works in the UI

### Active Games Screen
```
┌──────────────────────────────────────────┐
│  Active Games                            │
│  Welcome, John                           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ┌──────────────────────────────────────┐ │
│ │ 🔥 Strong momentum!                  │ │ <- Insight Banner
│ └──────────────────────────────────────┘ │
│                                          │
│  Mar 13, 2026              🟢 ACTIVE    │
│                                          │
│  AAPL    ₹3,245.50    ▲ +8.50%         │
│  GOOGL   ₹2,890.25    ▲ +6.80%         │
│  MSFT    ₹4,120.00    ▲ +6.30%         │
│                                          │
│  Opening: ₹9,800.00                     │
│  Current: ₹10,705.60                    │
│  Portfolio Return: +7.20%               │
│                                          │
│  [View Details]  [Close Game]           │
└──────────────────────────────────────────┘
```

### Game Details Modal
```
┌──────────────────────────────────────────┐
│  Game Details                         ✕  │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ┌──────────────────────────────────────┐ │
│ │ 💰 Exceptional gains!                │ │ <- Insight Banner
│ └──────────────────────────────────────┘ │
│                                          │
│      ┌───┐                               │
│      │ A │  Performance Rank            │
│      └───┘  Excellent Performance!      │
│                                          │
│         Total Return                     │
│         +7.20%                           │
│         ₹905.60                          │
│                                          │
│  [Rest of modal content...]             │
└──────────────────────────────────────────┘
```

## Key Features

1. **Contextual**: Only shows when there's something noteworthy
2. **Clear**: Short messages, easy to understand at a glance
3. **Visual**: Color-coded for quick recognition
4. **Dynamic**: Updates in real-time as prices change
5. **Helpful**: Provides actual analysis, not just numbers
