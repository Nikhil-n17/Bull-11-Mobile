# Stock Company Logo APIs for Indian Market - Research Report

**Date:** March 2026
**Context:** Bull-11 Stock Fantasy Game (React Native/Expo)
**Target:** NSE/BSE listed Indian companies (INFY, TCS, RELIANCE, etc.)

---

## Executive Summary

After extensive research, there is **no single free API** that provides comprehensive logo coverage for Indian NSE/BSE stocks. The recommended approach is a **multi-tier fallback system** combining:

1. **Logo.dev** (Primary) - Best coverage for large-cap Indian companies via domain lookup
2. **Finnhub** (Secondary) - Company profiles with logos, supports NSE/BSE
3. **DiceBear/UI Avatars** (Fallback) - Generate letter avatars when logos unavailable

---

## 1. Logo APIs Comparison

### Logo.dev (Recommended Primary)

**URL:** https://logo.dev

| Feature | Details |
|---------|---------|
| **Free Tier** | 500,000 requests/month |
| **Pricing** | $280/year (1M req), $1,260/year (5M req) |
| **Attribution** | Required on free tier |
| **Formats** | SVG, PNG, WebP, JPEG |
| **Indian Support** | Via domain lookup (e.g., `infosys.com`, `tcs.com`) |

**URL Patterns:**
```
# By domain (most reliable for Indian stocks)
https://img.logo.dev/infosys.com?token=YOUR_KEY

# By stock ticker (limited Indian support)
https://img.logo.dev/ticker/INFY?token=YOUR_KEY

# With customization
https://img.logo.dev/tcs.com?token=YOUR_KEY&size=128&format=png
```

**Parameters:**
- `size`: 128, 256, 512
- `format`: webp, png, jpg
- `retina`: true/false
- `token`: API key (required)

**Pros:**
- Excellent free tier (500K/month is generous)
- Simple CDN-based URL construction
- High-quality logos with transparent backgrounds
- Supports domain, ticker, ISIN lookups

**Cons:**
- Attribution required on free tier
- Indian ticker support may be limited (use domain instead)
- No offline/local caching license on free tier

---

### Finnhub

**URL:** https://finnhub.io

| Feature | Details |
|---------|---------|
| **Free Tier** | Available (limits unspecified) |
| **Paid Plans** | $49.99-$199.99/month for market data |
| **Indian Exchanges** | NSE and BSE explicitly supported |
| **Logo Field** | Included in Company Profile response |

**API Endpoint:**
```
GET https://finnhub.io/api/v1/stock/profile2?symbol=INFY.NS&token=YOUR_KEY
```

**Response includes:**
```json
{
  "name": "Infosys Limited",
  "ticker": "INFY",
  "logo": "https://static.finnhub.io/logo/abc123.png",
  "weburl": "https://www.infosys.com",
  "marketCapitalization": 75000,
  ...
}
```

**Indian Symbol Format:**
- NSE: `SYMBOL.NS` (e.g., `INFY.NS`, `TCS.NS`, `RELIANCE.NS`)
- BSE: `SYMBOL.BO` (e.g., `INFY.BO`)

**Pros:**
- Official NSE/BSE support
- Logo included in company profile
- Additional company data (market cap, sector, etc.)

**Cons:**
- Paid plans expensive for logo-only use
- Free tier limits unclear
- Requires API call per company (not CDN-based)

---

### Brandfetch

**URL:** https://brandfetch.com/developers

| Feature | Details |
|---------|---------|
| **Coverage** | 44M+ brands globally |
| **Free Tier** | Developer access available |
| **Data** | Logos, colors, fonts, social links |

**Pros:**
- Comprehensive brand data beyond just logos
- High quality assets

**Cons:**
- Pricing not publicly listed
- Primarily focused on consumer brands
- May have limited coverage for Indian stocks

---

### Clearbit Logo API (Deprecated)

**Status:** Discontinued as of December 1, 2025
**Alternative:** Logo.dev (officially recommended by Clearbit)

---

## 2. Fallback Solutions

### DiceBear Initials API (Recommended Fallback)

**URL:** https://api.dicebear.com

| Feature | Details |
|---------|---------|
| **Cost** | Free |
| **Rate Limit** | 50 req/sec (SVG), 10 req/sec (PNG) |
| **License** | MIT (open source) |

**URL Pattern:**
```
# Basic initials avatar
https://api.dicebear.com/9.x/initials/svg?seed=TCS

# Customized
https://api.dicebear.com/9.x/initials/svg?seed=RELIANCE&backgroundColor=2196F3&textColor=ffffff&fontSize=50
```

**React Native Usage:**
```tsx
const getInitialsAvatar = (symbol: string, bgColor: string = '2196F3') => {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${symbol}&backgroundColor=${bgColor}&fontSize=45&chars=2`;
};

// Usage
<Image source={{ uri: getInitialsAvatar('TCS', '4CAF50') }} />
```

**Pros:**
- Completely free
- No API key required
- Deterministic (same input = same output)
- Customizable colors

**Cons:**
- Generic appearance (no actual company branding)
- Text-based only

---

### UI Avatars

**URL:** https://ui-avatars.com

| Feature | Details |
|---------|---------|
| **Cost** | Free |
| **Rate Limit** | 2B+ requests/month handled |
| **Response Time** | ~3ms average |

**URL Pattern:**
```
# Basic
https://ui-avatars.com/api/?name=TCS

# Customized
https://ui-avatars.com/api/?name=INFY&background=2196F3&color=fff&size=128&rounded=true
```

**Parameters:**
- `name`: Text for initials
- `size`: 16-512 (default 64)
- `background`: Hex color (without #)
- `color`: Font color
- `rounded`: true/false
- `bold`: true/false
- `format`: svg or png

**Pros:**
- No authentication needed
- Privacy-focused (no data stored)
- Very fast response times

**Cons:**
- Generic appearance
- No company branding

---

## 3. Indian Market Specific Solutions

### NSE/BSE Official Sources

Neither NSE India nor BSE India provide public APIs for company logos. Their websites display logos but:
- No documented API endpoints
- Scraping violates terms of service
- Logos are embedded in their proprietary systems

### Indian Broker APIs (Zerodha, Upstox, Groww)

**Zerodha Kite Connect:**
- Does NOT provide company logos
- Focused on trading data only

**Upstox API:**
- No public logo endpoint documented
- Branding assets are for Upstox brand only

**Groww Approach:**
Based on research, Groww likely uses:
1. Proprietary logo database (curated in-house)
2. Company domain-based lookup similar to Logo.dev
3. Manual curation for top stocks

---

## 4. Recommended Implementation

### Multi-Tier Logo Service

```typescript
// src/core/services/LogoService.ts

interface LogoConfig {
  logoDevToken: string;
  finnhubToken?: string;
}

// Domain mapping for popular Indian stocks
const INDIAN_COMPANY_DOMAINS: Record<string, string> = {
  'INFY': 'infosys.com',
  'TCS': 'tcs.com',
  'RELIANCE': 'ril.com',
  'HDFCBANK': 'hdfcbank.com',
  'ICICIBANK': 'icicibank.com',
  'WIPRO': 'wipro.com',
  'BHARTIARTL': 'airtel.in',
  'ITC': 'itcportal.com',
  'SBIN': 'sbi.co.in',
  'KOTAKBANK': 'kotak.com',
  'LT': 'larsentoubro.com',
  'AXISBANK': 'axisbank.com',
  'MARUTI': 'marutisuzuki.com',
  'TITAN': 'titan.co.in',
  'ASIANPAINT': 'asianpaints.com',
  'HINDUNILVR': 'hul.co.in',
  'BAJFINANCE': 'bajajfinserv.in',
  'TATAMOTORS': 'tatamotors.com',
  'TATASTEEL': 'tatasteel.com',
  'SUNPHARMA': 'sunpharma.com',
  // Add more as needed
};

class LogoService {
  private config: LogoConfig;
  private cache: Map<string, string> = new Map();

  constructor(config: LogoConfig) {
    this.config = config;
  }

  /**
   * Get logo URL with multi-tier fallback
   */
  async getLogoUrl(symbol: string): Promise<string> {
    // Check cache first
    if (this.cache.has(symbol)) {
      return this.cache.get(symbol)!;
    }

    // Tier 1: Logo.dev via domain
    const domain = INDIAN_COMPANY_DOMAINS[symbol.toUpperCase()];
    if (domain) {
      const logoDevUrl = this.getLogoDevUrl(domain);
      this.cache.set(symbol, logoDevUrl);
      return logoDevUrl;
    }

    // Tier 2: Try Logo.dev ticker lookup
    const tickerUrl = this.getLogoDevTickerUrl(symbol);

    // Tier 3: Fallback to initials avatar
    const fallbackUrl = this.getInitialsAvatar(symbol);

    // In production, you'd verify if tickerUrl returns valid image
    // For now, return ticker URL with fallback mechanism in component
    this.cache.set(symbol, tickerUrl);
    return tickerUrl;
  }

  /**
   * Logo.dev by domain (most reliable)
   */
  getLogoDevUrl(domain: string, size: number = 128): string {
    return `https://img.logo.dev/${domain}?token=${this.config.logoDevToken}&size=${size}&format=png`;
  }

  /**
   * Logo.dev by ticker (may not work for all Indian stocks)
   */
  getLogoDevTickerUrl(ticker: string, size: number = 128): string {
    return `https://img.logo.dev/ticker/${ticker}?token=${this.config.logoDevToken}&size=${size}&format=png`;
  }

  /**
   * DiceBear initials fallback
   */
  getInitialsAvatar(symbol: string, bgColor: string = '2196F3'): string {
    return `https://api.dicebear.com/9.x/initials/svg?seed=${symbol}&backgroundColor=${bgColor}&fontSize=45&chars=2`;
  }

  /**
   * UI Avatars alternative fallback
   */
  getUIAvatarUrl(symbol: string, bgColor: string = '2196F3'): string {
    return `https://ui-avatars.com/api/?name=${symbol}&background=${bgColor}&color=fff&size=128&rounded=true&bold=true`;
  }
}

export const logoService = new LogoService({
  logoDevToken: process.env.LOGO_DEV_TOKEN || 'YOUR_PUBLISHABLE_KEY',
});
```

### React Native Component with Fallback

```tsx
// src/presentation/components/StockLogo.tsx

import React, { useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { logoService } from '@/core/services/LogoService';

interface StockLogoProps {
  symbol: string;
  size?: number;
  style?: object;
}

const STOCK_COLORS: Record<string, string> = {
  'INFY': '#007CC3',
  'TCS': '#0056A2',
  'RELIANCE': '#004B8C',
  'HDFCBANK': '#004C8F',
  'WIPRO': '#441D5C',
  // Add more brand colors
};

export const StockLogo: React.FC<StockLogoProps> = ({
  symbol,
  size = 48,
  style
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const primaryUrl = logoService.getLogoDevUrl(
    INDIAN_COMPANY_DOMAINS[symbol] || `${symbol.toLowerCase()}.com`
  );

  const fallbackUrl = logoService.getInitialsAvatar(
    symbol,
    (STOCK_COLORS[symbol] || '2196F3').replace('#', '')
  );

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {!hasError ? (
        <Image
          source={{ uri: primaryUrl }}
          style={[styles.logo, { width: size, height: size }]}
          onError={handleError}
          onLoad={handleLoad}
          resizeMode="contain"
        />
      ) : (
        <Image
          source={{ uri: fallbackUrl }}
          style={[styles.logo, { width: size, height: size }]}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  logo: {
    borderRadius: 8,
  },
});
```

### Caching Strategy

```typescript
// src/core/services/LogoCacheService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGO_CACHE_KEY = 'stock_logo_cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedLogo {
  url: string;
  timestamp: number;
  isValid: boolean;
}

export class LogoCacheService {
  private memoryCache: Map<string, CachedLogo> = new Map();

  async initialize(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(LOGO_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        Object.entries(parsed).forEach(([key, value]) => {
          this.memoryCache.set(key, value as CachedLogo);
        });
      }
    } catch (error) {
      console.warn('Failed to load logo cache:', error);
    }
  }

  async get(symbol: string): Promise<string | null> {
    const cached = this.memoryCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
      return cached.isValid ? cached.url : null;
    }
    return null;
  }

  async set(symbol: string, url: string, isValid: boolean): Promise<void> {
    this.memoryCache.set(symbol, {
      url,
      timestamp: Date.now(),
      isValid,
    });
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      const obj = Object.fromEntries(this.memoryCache);
      await AsyncStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.warn('Failed to persist logo cache:', error);
    }
  }
}

export const logoCacheService = new LogoCacheService();
```

---

## 5. Legal Considerations

### Logo Usage Rights

1. **Company Trademarks:** Company logos are protected trademarks
   - Using logos for informational purposes (stock info display) is generally acceptable
   - Do NOT modify or alter logos
   - Do NOT use logos to imply endorsement

2. **API Terms of Service:**
   - Logo.dev: Commercial use allowed, attribution required on free tier
   - DiceBear: MIT license, free for all uses
   - UI Avatars: Free for all uses, no restrictions

3. **Best Practices:**
   - Display logos at reasonable sizes (not as primary branding)
   - Include company name alongside logo
   - Link to official company website if possible
   - Do not cache/redistribute logos beyond API terms

### Scraping Warning

**Do NOT scrape logos from:**
- NSE/BSE websites
- Other broker apps (Groww, Zerodha, etc.)
- Google Images or other search engines

This violates terms of service and may have legal consequences.

---

## 6. Cost Analysis

### Monthly Request Estimates (Bull-11 App)

| Scenario | Logos/User/Day | Monthly Users | Monthly Requests |
|----------|----------------|---------------|------------------|
| Light | 20 | 1,000 | 600,000 |
| Medium | 50 | 5,000 | 7,500,000 |
| Heavy | 100 | 10,000 | 30,000,000 |

### Recommended Tier by Scale

| Scale | Logo.dev Tier | Cost/Year | Notes |
|-------|--------------|-----------|-------|
| MVP/Testing | Free | $0 | 500K/month sufficient |
| Small Launch | Startup | $280 | 1M/month, no attribution |
| Growth | Pro | $1,260 | 5M/month, self-host option |
| Scale | Enterprise | Custom | Unlimited |

**Optimization Tips:**
1. Aggressive client-side caching (7+ days)
2. Use CDN for logo assets
3. Preload logos for watchlist stocks
4. Batch logo requests during app launch

---

## 7. Final Recommendation

### For Bull-11 MVP

1. **Sign up for Logo.dev free tier**
   - 500K requests/month is sufficient for MVP
   - Create domain mapping for top 100 Indian stocks

2. **Implement DiceBear fallback**
   - Zero cost, no rate limit concerns
   - Generates consistent branded initials

3. **Build local cache**
   - 7-day expiry for logo URLs
   - Mark invalid URLs to avoid repeated failures

4. **Consider Finnhub for enrichment**
   - If you need market cap, sector data alongside logos
   - Free tier available for testing

### Migration Path

```
MVP Phase:     Logo.dev (free) + DiceBear fallback
Growth Phase:  Logo.dev (Startup $280/yr) + caching
Scale Phase:   Logo.dev (Pro) + CDN + self-hosting
```

---

## 8. Quick Reference URLs

| Service | Documentation | Sign Up |
|---------|--------------|---------|
| Logo.dev | https://logo.dev/docs | https://logo.dev/signup |
| Finnhub | https://finnhub.io/docs/api | https://finnhub.io/register |
| DiceBear | https://www.dicebear.com/how-to-use/http-api/ | N/A (no signup) |
| UI Avatars | https://ui-avatars.com | N/A (no signup) |
| Brandfetch | https://brandfetch.com/developers | https://brandfetch.com/developers |

---

## Appendix: Top 50 Indian Stock Domain Mapping

```typescript
export const INDIAN_COMPANY_DOMAINS: Record<string, string> = {
  // Nifty 50 Companies (Partial)
  'INFY': 'infosys.com',
  'TCS': 'tcs.com',
  'RELIANCE': 'ril.com',
  'HDFCBANK': 'hdfcbank.com',
  'ICICIBANK': 'icicibank.com',
  'HINDUNILVR': 'hul.co.in',
  'BHARTIARTL': 'airtel.in',
  'ITC': 'itcportal.com',
  'KOTAKBANK': 'kotak.com',
  'LT': 'larsentoubro.com',
  'SBIN': 'sbi.co.in',
  'AXISBANK': 'axisbank.com',
  'WIPRO': 'wipro.com',
  'BAJFINANCE': 'bajajfinserv.in',
  'ASIANPAINT': 'asianpaints.com',
  'MARUTI': 'marutisuzuki.com',
  'TITAN': 'titan.co.in',
  'HCLTECH': 'hcltech.com',
  'ULTRACEMCO': 'ultratechcement.com',
  'SUNPHARMA': 'sunpharma.com',
  'TATAMOTORS': 'tatamotors.com',
  'TATASTEEL': 'tatasteel.com',
  'POWERGRID': 'powergrid.in',
  'NTPC': 'ntpc.co.in',
  'M&M': 'mahindra.com',
  'ONGC': 'ongcindia.com',
  'NESTLEIND': 'nestle.in',
  'TECHM': 'techmahindra.com',
  'JSWSTEEL': 'jsw.in',
  'BRITANNIA': 'britannia.co.in',
  'DRREDDY': 'drreddys.com',
  'BAJAJFINSV': 'bajajfinserv.in',
  'DIVISLAB': 'divislabs.com',
  'CIPLA': 'cipla.com',
  'BPCL': 'bharatpetroleum.in',
  'GRASIM': 'grasim.com',
  'INDUSINDBK': 'indusind.com',
  'EICHERMOT': 'eichermotors.com',
  'SHREECEM': 'shreecement.com',
  'HEROMOTOCO': 'heromotocorp.com',
  'COALINDIA': 'coalindia.in',
  'ADANIENT': 'adani.com',
  'ADANIPORTS': 'adaniports.com',
  'APOLLOHOSP': 'apollohospitals.com',
  'TATACONSUM': 'tataconsumer.com',
  'SBILIFE': 'sbilife.co.in',
  'HDFCLIFE': 'hdfclife.com',
  'BAJAJ-AUTO': 'bajajauto.com',
  'UPL': 'upl-ltd.com',
  'HINDALCO': 'hindalco.com',
};
```

---

**Document Version:** 1.0
**Last Updated:** March 2026
