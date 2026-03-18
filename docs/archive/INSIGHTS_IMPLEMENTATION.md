# Performance Insights Implementation

## Overview
Added smart performance insights and trend indicators to game displays that provide real-time analysis and contextual feedback to users.

## Files Created

### 1. Core Utility: `src/core/utils/gameInsights.ts`
Advanced analytics engine that calculates:
- **Portfolio Momentum**: Detects if returns are accelerating, steady, decelerating, or volatile
- **Diversification Score**: Measures how evenly distributed performance is (0-100 scale)
- **Volatility Indicator**: Tracks how wildly stocks are moving (0-100 scale)
- **Best/Worst Performers**: Identifies top and bottom performing stocks
- **Time-based Insights**: Contextual messages based on game duration and session timing

### 2. UI Component: `src/presentation/components/InsightBanner.tsx`
Displays contextual insight messages with:
- Color-coded banners (Green=success, Orange=warning, Red=danger, Blue=info)
- Emoji indicators for quick visual recognition
- Short, actionable messages (5-8 words max)

## Insight Types & Triggers

### Success Insights (Green)
- 🔥 "Strong momentum!" - When gaining fast (>3% with positive momentum)
- 💰 "Exceptional gains!" - When total return >5%
- 📈 "Solid performance" - When total return >2%

### Warning Insights (Orange)
- ⚡ "High volatility" - When stocks moving wildly (>60% volatility)
- ⚠️ "One stock dragging down" - When worst performer <-5% and big spread

### Danger Insights (Red)
- 📉 "Portfolio struggling" - When losing fast (<-3% with negative momentum)
- 🔻 "Heavy losses" - When total return <-5%

### Info Insights (Blue)
- 🎯 "Steady performer" - Low volatility, consistent performance (<2% change)
- 🏆 "[STOCK] is carrying you!" - One stock doing all the work (>5% gain, big spread)
- 📊 "Uneven performance" - Low diversification with high volatility

## Integration Points

### 1. Active Games Screen (`app/(tabs)/index.tsx`)
- Insight banner displayed at top of each game card
- Updates in real-time with auto-refresh
- Only shows when insights are noteworthy

### 2. Game Details Modal (`src/presentation/components/GameDetailsModal.tsx`)
- Insight banner shown at the top for active games
- Complements existing performance metrics
- Provides additional context to detailed statistics

## Smart Features

### Momentum Detection
Analyzes stock price movements to determine:
- **Accelerating**: 80%+ stocks positive, avg >2%
- **Decelerating**: 80%+ stocks negative, avg <-2%
- **Volatile**: High standard deviation in changes (>3%)
- **Steady**: Everything else

### Diversification Scoring
- Calculated from standard deviation of stock changes
- 0-100 scale (higher = more diversified)
- Helps identify if one stock is dominating portfolio

### Volatility Measurement
- Based on average absolute percentage changes
- Normalized to 0-100 scale
- Indicates market turbulence level

## User Benefits

1. **Real-time Analysis**: Users get instant feedback on portfolio performance
2. **Contextual Insights**: Messages change based on actual performance patterns
3. **Visual Clarity**: Color-coded banners provide at-a-glance understanding
4. **Actionable Feedback**: Short, clear messages guide decision-making
5. **Enhanced Engagement**: Gamified feedback makes tracking more interesting

## Technical Highlights

- **Pure TypeScript**: Type-safe implementation with proper interfaces
- **Functional Approach**: Stateless utility functions for easy testing
- **Performance Optimized**: Lightweight calculations that don't impact UI
- **Extensible Design**: Easy to add new insight types or modify thresholds
- **Maintainable**: Clear separation between calculation logic and UI

## Future Enhancements

Potential improvements:
- Historical trend tracking (multi-day momentum)
- Comparative analysis (vs market average)
- Personalized insights based on user patterns
- Prediction confidence scores
- Time-of-day performance analysis with real data
