# UI/Animation Libraries for Bull-11 React Native App

## Overview

This document provides research and recommendations for enhancing the Bull-11 stock trading game interface with modern animations, UI components, and visual assets.

**Current Tech Stack:**
- React Native 0.81.5 / Expo SDK 54
- TypeScript 5.9.2
- React Native Web 0.21.0
- Already installed: `react-native-reanimated`, `react-native-gesture-handler`

---

## 1. Animation Libraries

### 1.1 React Native Reanimated (ALREADY INSTALLED)

**Status:** Already in your `package.json` (v4.1.1)

**Best For:** High-performance, native-thread animations

**Pros:**
- Runs on native thread (60 FPS)
- Full Web support
- Works with Expo SDK 54
- Powerful shared values and animated styles
- Industry standard for complex animations

**Cons:**
- Steeper learning curve
- Debugging requires Hermes JavaScript Inspector

**Key Use Cases for Bull-11:**
- Stock list reordering animations
- Price change highlight effects
- Card flip/slide animations
- Progress bar animations

**Example - Stock Price Flash Animation:**
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming
} from 'react-native-reanimated';

const PriceCell = ({ price, prevPrice }) => {
  const backgroundColor = useSharedValue('transparent');

  useEffect(() => {
    if (price !== prevPrice) {
      const flashColor = price > prevPrice ? '#4CAF50' : '#F44336';
      backgroundColor.value = withSequence(
        withTiming(flashColor, { duration: 100 }),
        withTiming('transparent', { duration: 400 })
      );
    }
  }, [price]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColor.value,
  }));

  return (
    <Animated.View style={[styles.priceCell, animatedStyle]}>
      <Text>{price}</Text>
    </Animated.View>
  );
};
```

**Example - List Reorder Animation:**
```typescript
import Animated, {
  Layout,
  FadeIn,
  FadeOut,
  SlideInRight
} from 'react-native-reanimated';

const StockListItem = ({ stock, index }) => (
  <Animated.View
    entering={SlideInRight.delay(index * 50)}
    exiting={FadeOut}
    layout={Layout.springify()}
  >
    <StockCard stock={stock} />
  </Animated.View>
);
```

---

### 1.2 Moti (RECOMMENDED ADD-ON)

**Installation:**
```bash
npm install moti
# OR
yarn add moti
```

**Best For:** Declarative animations with mount/unmount support

**Pros:**
- Built on Reanimated (uses what you already have)
- Simpler API than raw Reanimated
- Framer Motion-like syntax
- Excellent TypeScript support
- Web and Expo support
- Skeleton loading components built-in

**Cons:**
- Additional dependency
- Less granular control than raw Reanimated

**Key Use Cases for Bull-11:**
- Entry/exit animations
- Loading skeletons
- Simple hover/press states
- Variant-based animations

**Example - Stock Card with Variants:**
```typescript
import { MotiView, MotiPressable } from 'moti';

const StockCard = ({ isSelected, stock }) => (
  <MotiView
    from={{ opacity: 0, scale: 0.9 }}
    animate={{
      opacity: 1,
      scale: isSelected ? 1.02 : 1,
      borderColor: isSelected ? '#007AFF' : '#E0E0E0'
    }}
    transition={{ type: 'timing', duration: 200 }}
  >
    <Text>{stock.symbol}</Text>
    <MotiView
      animate={{
        backgroundColor: stock.change > 0 ? '#4CAF50' : '#F44336'
      }}
    >
      <Text>{stock.change}%</Text>
    </MotiView>
  </MotiView>
);
```

**Example - Skeleton Loading:**
```typescript
import { Skeleton } from 'moti/skeleton';

const StockCardSkeleton = () => (
  <View style={styles.card}>
    <Skeleton colorMode="light" width={60} height={60} radius="round" />
    <View style={styles.info}>
      <Skeleton colorMode="light" width={120} height={20} />
      <Skeleton colorMode="light" width={80} height={16} />
    </View>
    <Skeleton colorMode="light" width={70} height={24} />
  </View>
);
```

---

### 1.3 React Native Animatable

**Installation:**
```bash
npm install react-native-animatable
```

**Best For:** Quick, predefined animations (60+ built-in)

**Pros:**
- Very simple API
- 60+ predefined animations (bounce, fade, slide, etc.)
- Lightweight
- Great for rapid prototyping

**Cons:**
- Not as performant as Reanimated
- Limited customization
- Runs on JS thread

**Key Use Cases for Bull-11:**
- Attention-grabbing effects (shake, pulse, bounce)
- Quick entrance animations
- Badge/notification animations

**Example - Rank Badge Animation:**
```typescript
import * as Animatable from 'react-native-animatable';

const RankBadge = ({ rank, isNew }) => (
  <Animatable.View
    animation={isNew ? "bounceIn" : undefined}
    duration={600}
    useNativeDriver
  >
    <Animatable.Text
      animation="pulse"
      iterationCount="infinite"
      duration={2000}
    >
      {rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'}
    </Animatable.Text>
  </Animatable.View>
);
```

---

### 1.4 Lottie React Native

**Installation:**
```bash
yarn add lottie-react-native
cd ios && pod install  # iOS only
```

**Best For:** Complex, designer-created animations (After Effects exports)

**Pros:**
- Professional-grade animations
- Huge library of free animations at LottieFiles
- Cross-platform (iOS, Android, Web)
- Highly customizable (color filters, speed control)

**Cons:**
- Larger bundle size
- Requires JSON animation files
- Not all After Effects features supported

**Key Use Cases for Bull-11:**
- Success/error states
- Game completion celebrations
- Loading indicators
- Achievement unlocks

**Example - Success Checkmark:**
```typescript
import LottieView from 'lottie-react-native';

const SuccessAnimation = ({ onComplete }) => (
  <LottieView
    source={require('./assets/animations/success-check.json')}
    autoPlay
    loop={false}
    onAnimationFinish={onComplete}
    style={{ width: 150, height: 150 }}
  />
);
```

**Free Lottie Animations for Trading Apps:**
- Success checkmarks
- Loading spinners
- Confetti/celebration
- Graph/chart animations
- Coin/money animations
- Arrow up/down indicators

Browse at: https://lottiefiles.com/

---

### Animation Library Comparison

| Library | Performance | Ease of Use | Web Support | Best For |
|---------|-------------|-------------|-------------|----------|
| Reanimated | Excellent (native) | Medium | Yes | Complex animations |
| Moti | Excellent (native) | Easy | Yes | Declarative animations |
| Animatable | Good (JS) | Very Easy | Limited | Quick effects |
| Lottie | Good | Easy | Yes | Designer animations |

**Recommendation:** Use **Reanimated** (already installed) + **Moti** for most animations. Add **Lottie** for special celebration/achievement moments.

---

## 2. UI Component Libraries

### 2.1 Gluestack UI (RECOMMENDED)

**Installation:**
```bash
npm install @gluestack-ui/themed @gluestack-style/react react-native-svg
npx gluestack-ui init
```

**Best For:** Modern, performant universal components

**Pros:**
- Built for React Native + Web (universal)
- NativeWind/Tailwind CSS integration
- Highly customizable
- Good TypeScript support
- Active development

**Cons:**
- Newer library, smaller community
- Learning curve for theming

**Key Components for Bull-11:**
- Button, Input, FormControl
- Tabs for navigation
- Cards for stock display
- Modals and ActionSheets
- Progress bars

---

### 2.2 React Native Paper

**Installation:**
```bash
npm install react-native-paper
```

**Best For:** Material Design compliance

**Pros:**
- Well-established (55K+ weekly downloads)
- Material Design 3 support
- Excellent theming system
- RTL and accessibility support

**Cons:**
- Material Design aesthetic (may not suit all apps)
- Some components feel heavy

**Key Components:**
- FAB (Floating Action Button)
- Snackbars for notifications
- Chips for filters/tags
- Data tables

---

### 2.3 Tamagui

**Installation:**
```bash
npm install tamagui @tamagui/core
```

**Best For:** High-performance styled components

**Pros:**
- Excellent performance (optimized CSS output)
- Universal (Native + Web)
- Responsive design built-in
- Strong TypeScript support

**Cons:**
- Complex initial setup
- Steeper learning curve

---

### UI Library Comparison

| Library | Performance | Web Support | Customization | Maturity |
|---------|-------------|-------------|---------------|----------|
| Gluestack | Excellent | Excellent | High | Medium |
| Paper | Good | Good | Medium | High |
| Tamagui | Excellent | Excellent | Very High | Medium |
| NativeBase | Good | Good | High | High |

**Recommendation:** Start with **Gluestack UI** for modern universal components, or **React Native Paper** if you prefer Material Design.

---

## 3. Charting Libraries

### 3.1 react-native-gifted-charts (RECOMMENDED)

**Installation:**
```bash
# Expo
npx expo install react-native-gifted-charts expo-linear-gradient react-native-svg

# React Native CLI
npm install react-native-gifted-charts react-native-linear-gradient react-native-svg
```

**Best For:** Beautiful, animated charts with minimal code

**Pros:**
- 9 chart types (line, bar, pie, area, scatter, etc.)
- Smooth animations (Animated API)
- Highly customizable
- 2D, 3D, and gradient effects
- Good documentation

**Cons:**
- Requires additional dependencies
- Some advanced customizations can be tricky

**Chart Types:**
- Bar charts (standard, horizontal, stacked)
- Line charts
- Area charts
- Pie/Donut charts
- Scatter/Bubble charts
- Radar charts
- Population pyramids

**Example - Stock Performance Line Chart:**
```typescript
import { LineChart } from 'react-native-gifted-charts';

const StockChart = ({ data }) => (
  <LineChart
    data={data}
    areaChart
    curved
    color="#007AFF"
    startFillColor="rgba(0,122,255,0.3)"
    endFillColor="rgba(0,122,255,0)"
    startOpacity={0.9}
    endOpacity={0.2}
    noOfSections={4}
    yAxisTextStyle={{ color: '#999' }}
    xAxisLabelTextStyle={{ color: '#999' }}
    hideDataPoints
    adjustToWidth
  />
);
```

**Example - Portfolio Pie Chart:**
```typescript
import { PieChart } from 'react-native-gifted-charts';

const PortfolioPie = ({ holdings }) => (
  <PieChart
    data={holdings.map((h, i) => ({
      value: h.percentage,
      color: STOCK_COLORS[i % STOCK_COLORS.length],
      text: h.symbol,
    }))}
    donut
    innerRadius={60}
    innerCircleColor="#fff"
    centerLabelComponent={() => (
      <View>
        <Text style={styles.centerLabel}>Total</Text>
        <Text style={styles.centerValue}>100%</Text>
      </View>
    )}
  />
);
```

---

### 3.2 Victory Native

**Installation:**
```bash
yarn add victory-native
```

**Best For:** Highly customizable, data-driven charts

**Pros:**
- Exceptional performance (100+ FPS claimed)
- Highly flexible and composable
- Good for complex visualizations
- Active maintenance (Nearform)

**Cons:**
- Steeper learning curve
- Larger bundle size

---

### 3.3 @shopify/flash-list (for Performance)

**Installation:**
```bash
# Expo
npx expo install @shopify/flash-list

# React Native
yarn add @shopify/flash-list
```

**Best For:** High-performance stock lists

**Why Use It:**
- 5x faster than FlatList on UI thread
- 10x faster on JS thread
- Memory-efficient scrolling
- Drop-in FlatList replacement

**Example - Stock List:**
```typescript
import { FlashList } from "@shopify/flash-list";

const StockList = ({ stocks }) => (
  <FlashList
    data={stocks}
    renderItem={({ item }) => <StockCard stock={item} />}
    estimatedItemSize={80}
    keyExtractor={(item) => item.symbol}
  />
);
```

---

## 4. Icon Libraries

### 4.1 @expo/vector-icons (ALREADY INSTALLED)

**Status:** Already in your `package.json`

**Includes:**
- FontAwesome (money, chart icons)
- MaterialIcons (trending, assessment icons)
- Ionicons (stats, analytics icons)
- Feather (minimalist icons)
- And many more

**Finance-Related Icons:**
```typescript
import {
  FontAwesome,
  MaterialIcons,
  Ionicons
} from '@expo/vector-icons';

// Examples
<FontAwesome name="line-chart" size={24} color="#007AFF" />
<MaterialIcons name="trending-up" size={24} color="#4CAF50" />
<MaterialIcons name="trending-down" size={24} color="#F44336" />
<Ionicons name="stats-chart" size={24} color="#007AFF" />
<FontAwesome name="rupee" size={20} color="#333" />
```

**Useful Icons for Bull-11:**
| Icon | Library | Name |
|------|---------|------|
| Chart Line | FontAwesome | `line-chart` |
| Bar Chart | FontAwesome | `bar-chart` |
| Trending Up | MaterialIcons | `trending-up` |
| Trending Down | MaterialIcons | `trending-down` |
| Stats | Ionicons | `stats-chart` |
| Wallet | Ionicons | `wallet` |
| Trophy | Ionicons | `trophy` |
| Medal | MaterialIcons | `military-tech` |
| Refresh | Ionicons | `refresh` |
| Timer | Ionicons | `timer` |
| Rupee | FontAwesome | `rupee` |

Browse all icons: https://icons.expo.fyi/

---

### 4.2 Tabler Icons

**Installation:**
```bash
npm install @tabler/icons-react-native
```

**Pros:**
- 6,000+ free icons
- Consistent 24x24 grid, 2px stroke
- MIT License
- Active development

**Example:**
```typescript
import { IconChartLine, IconTrendingUp } from '@tabler/icons-react-native';

<IconChartLine size={24} color="#007AFF" stroke={2} />
```

---

## 5. Stock Company Logos API

### 5.1 Logo.dev (RECOMMENDED)

**Pricing:**
- **Free Tier:** 500,000 requests/month (requires attribution)
- **Startup:** $280/year - 1M requests/month, no attribution
- **Pro:** $1,260/year - 5M requests/month

**Stock Ticker API Features:**
- 70,000+ stock tickers (NYSE, NASDAQ, 60+ global exchanges)
- Supports NSE and BSE (Indian exchanges)
- Under 50ms response via CDN
- Multiple formats (SVG, PNG, WebP)
- Dark mode variants
- Automatic rebranding updates

**Usage:**
```typescript
// Basic usage
const logoUrl = `https://img.logo.dev/ticker/RELIANCE.NS?token=${API_KEY}`;

// With options
const logoUrl = `https://img.logo.dev/ticker/TCS.NS?token=${API_KEY}&size=64&format=png`;

// Component
const StockLogo = ({ symbol }) => (
  <Image
    source={{ uri: `https://img.logo.dev/ticker/${symbol}?token=${LOGO_DEV_KEY}` }}
    style={{ width: 40, height: 40 }}
    defaultSource={require('./assets/default-stock.png')}
  />
);
```

**Indian Stock Symbol Format:**
- NSE: `SYMBOL.NS` (e.g., `RELIANCE.NS`, `TCS.NS`, `INFY.NS`)
- BSE: `SYMBOL.BO` (e.g., `RELIANCE.BO`)

---

### 5.2 Alternative: Domain-Based Logos

For companies where you know the domain:
```typescript
// Logo.dev also supports domain lookups
const logoUrl = `https://img.logo.dev/${domain}?token=${API_KEY}`;

// Examples
'https://img.logo.dev/reliance.com'
'https://img.logo.dev/tcs.com'
'https://img.logo.dev/infosys.com'
```

---

### 5.3 Fallback Strategy

For stocks without logos, create initial-based fallbacks:
```typescript
const StockAvatar = ({ symbol, logoUrl }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !logoUrl) {
    return (
      <View style={[styles.avatar, { backgroundColor: getColorForSymbol(symbol) }]}>
        <Text style={styles.initial}>{symbol.charAt(0)}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: logoUrl }}
      style={styles.logo}
      onError={() => setHasError(true)}
    />
  );
};

const getColorForSymbol = (symbol) => {
  const colors = ['#2196F3', '#9C27B0', '#FF9800', '#00BCD4', '#3F51B5'];
  const index = symbol.charCodeAt(0) % colors.length;
  return colors[index];
};
```

---

## 6. Design Inspiration

### 6.1 Zerodha Kite Patterns

**Key UI Patterns:**
- Universal search with zero latency
- Clean, light, fast interface
- Progressive disclosure of advanced features
- Keyboard shortcuts for power users
- Risk awareness integration ("Nudge" alerts)
- Modular, ecosystem-based approach

**Implementation Ideas:**
- Add quick search for stocks in New Game screen
- Show risk indicators on volatile stocks
- Use keyboard shortcuts (web only)

---

### 6.2 Groww Patterns

**Key UI Patterns:**
- Tabbed content organization
- Unified dashboard with watchlists, positions, orders
- Comparison tools for side-by-side analysis
- Social proof integration
- One-tap trading (Scalper mode)

**Implementation Ideas:**
- Add comparison view in portfolio
- Show performance rankings/leaderboards
- Quick action buttons for common tasks

---

### 6.3 Robinhood Patterns

**Key UI Patterns:**
- Bold, colorful portfolio summaries
- Large numbers for key metrics
- Confetti celebrations on achievements
- Simplified stock cards
- Pull-to-refresh with satisfying haptics

**Implementation Ideas:**
- Celebrate game wins with confetti (Lottie)
- Use haptic feedback on price updates
- Bold typography for scores and changes

---

## 7. Implementation Roadmap

### Phase 1: Essential Additions (Week 1)

1. **Add Moti** for declarative animations
   ```bash
   npm install moti
   ```

2. **Add react-native-gifted-charts** for visualizations
   ```bash
   npx expo install react-native-gifted-charts expo-linear-gradient react-native-svg
   ```

3. **Add FlashList** for performant stock lists
   ```bash
   npx expo install @shopify/flash-list
   ```

### Phase 2: Enhanced Visuals (Week 2)

4. **Integrate Logo.dev** for stock logos
   - Sign up at https://logo.dev/signup
   - Get API key
   - Implement StockLogo component with fallback

5. **Add Lottie** for celebrations
   ```bash
   yarn add lottie-react-native
   ```
   - Download success/celebration animations from LottieFiles

### Phase 3: Polish (Week 3)

6. **Implement smooth list reordering** using Reanimated's Layout animations
7. **Add skeleton loading** with Moti
8. **Create price flash animations** for real-time updates
9. **Add mini-charts** to game cards using gifted-charts

---

## 8. Quick Reference - Installation Commands

```bash
# All recommended packages
npm install moti @shopify/flash-list lottie-react-native
npx expo install react-native-gifted-charts expo-linear-gradient react-native-svg

# Optional UI library (choose one)
npm install @gluestack-ui/themed @gluestack-style/react  # Gluestack
# OR
npm install react-native-paper  # Material Design
```

---

## 9. File Structure Suggestion

```
src/
├── presentation/
│   ├── components/
│   │   ├── animations/
│   │   │   ├── PriceFlash.tsx
│   │   │   ├── ListReorder.tsx
│   │   │   └── Celebration.tsx
│   │   ├── charts/
│   │   │   ├── MiniLineChart.tsx
│   │   │   ├── PortfolioPie.tsx
│   │   │   └── PerformanceBar.tsx
│   │   ├── common/
│   │   │   ├── StockLogo.tsx
│   │   │   ├── StockCardSkeleton.tsx
│   │   │   └── AnimatedNumber.tsx
│   │   └── ...
│   └── ...
├── assets/
│   ├── animations/
│   │   ├── success.json
│   │   ├── celebration.json
│   │   └── loading.json
│   └── images/
│       └── default-stock.png
└── ...
```

---

## Summary

| Category | Primary Recommendation | Alternative |
|----------|----------------------|-------------|
| Animation | Reanimated + Moti | react-native-animatable |
| Charting | react-native-gifted-charts | Victory Native |
| Lists | @shopify/flash-list | FlatList |
| Icons | @expo/vector-icons | Tabler Icons |
| Stock Logos | Logo.dev API | Domain-based fallbacks |
| UI Components | Gluestack UI | React Native Paper |
| Celebrations | Lottie | Reanimated |

---

## Resources

- [React Native Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [Moti Documentation](https://moti.fyi/)
- [Gifted Charts Examples](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts)
- [Logo.dev Pricing](https://logo.dev/pricing)
- [Expo Vector Icons](https://icons.expo.fyi/)
- [LottieFiles](https://lottiefiles.com/)
- [FlashList Documentation](https://shopify.github.io/flash-list/)
