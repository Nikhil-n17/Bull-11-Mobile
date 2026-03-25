/**
 * Stock Comparison Bar Component
 * Visual comparison of stock performance in a portfolio
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import type { GameStock } from '@/src/domain/entities/Game';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface StockComparisonBarProps {
  stocks: readonly GameStock[];
  variant?: 'mini' | 'full';
  isActive?: boolean;
}

interface StockSegment {
  stock: GameStock;
  percentage: number;
  color: string;
  performance: number;
}

// Color palette for differentiation
const STOCK_COLORS = [
  { base: '#2196F3', light: '#64B5F6', dark: '#1976D2' }, // Blue
  { base: '#9C27B0', light: '#BA68C8', dark: '#7B1FA2' }, // Purple
  { base: '#FF9800', light: '#FFB74D', dark: '#F57C00' }, // Orange
  { base: '#00BCD4', light: '#4DD0E1', dark: '#0097A7' }, // Teal
  { base: '#3F51B5', light: '#7986CB', dark: '#303F9F' }, // Indigo
];

export const StockComparisonBar: React.FC<StockComparisonBarProps> = ({
  stocks,
  variant = 'full',
  isActive = true,
}) => {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const isMini = variant === 'mini';

  // Calculate segments
  const calculateSegments = (): StockSegment[] => {
    const totalValue = stocks.reduce((sum, stock) => {
      const currentPrice = isActive
        ? (stock.currentPrice || stock.openingPrice)
        : (stock.closingPrice || stock.openingPrice);
      return sum + currentPrice;
    }, 0);

    return stocks.map((stock, index) => {
      const currentPrice = isActive
        ? (stock.currentPrice || stock.openingPrice)
        : (stock.closingPrice || stock.openingPrice);

      const percentage = totalValue > 0 ? (currentPrice / totalValue) * 100 : 0;

      const performance = (stock.percentageChange != null)
        ? stock.percentageChange
        : (stock.openingPrice > 0)
          ? ((currentPrice - stock.openingPrice) / stock.openingPrice) * 100
          : 0;

      const colorSet = STOCK_COLORS[index % STOCK_COLORS.length];

      // Choose color intensity based on performance
      let color = colorSet.base;
      if (performance > 5) {
        color = colorSet.dark; // Strong positive
      } else if (performance > 0) {
        color = colorSet.light; // Mild positive
      } else if (performance < -5) {
        color = colorSet.dark; // Strong negative (darker shade indicates loss)
      } else if (performance < 0) {
        color = colorSet.light; // Mild negative
      }

      return {
        stock,
        percentage,
        color,
        performance,
      };
    });
  };

  const segments = calculateSegments();

  const handleSegmentPress = (symbol: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedStock(selectedStock === symbol ? null : symbol);
  };

  const renderBar = () => (
    <View style={[styles.barContainer, isMini && styles.barContainerMini]}>
      {segments.map((segment, index) => {
        const isSelected = selectedStock === segment.stock.symbol;
        const isOtherSelected = selectedStock !== null && !isSelected;

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.segment,
              {
                width: `${segment.percentage}%`,
                backgroundColor: segment.color,
                opacity: isOtherSelected ? 0.3 : 1,
              },
              isSelected && styles.segmentSelected,
            ]}
            onPress={() => handleSegmentPress(segment.stock.symbol)}
            activeOpacity={0.7}
          >
            {!isMini && segment.percentage > 15 && (
              <Text style={styles.segmentLabel} numberOfLines={1}>
                {segment.stock.symbol}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderTooltip = () => {
    if (!selectedStock) return null;

    const segment = segments.find(s => s.stock.symbol === selectedStock);
    if (!segment) return null;

    const currentPrice = isActive
      ? (segment.stock.currentPrice || segment.stock.openingPrice)
      : (segment.stock.closingPrice || segment.stock.openingPrice);

    return (
      <View style={[styles.tooltip, isMini && styles.tooltipMini]}>
        <View style={styles.tooltipHeader}>
          <Text style={styles.tooltipSymbol}>{segment.stock.symbol}</Text>
          <Text
            style={[
              styles.tooltipPerformance,
              segment.performance >= 0 ? styles.profit : styles.loss,
            ]}
          >
            {segment.performance >= 0 ? '+' : ''}{segment.performance.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.tooltipRow}>
          <Text style={styles.tooltipLabel}>Portfolio Weight:</Text>
          <Text style={styles.tooltipValue}>{segment.percentage.toFixed(1)}%</Text>
        </View>
        {!isMini && (
          <>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Opening:</Text>
              <Text style={styles.tooltipValue}>₹{segment.stock.openingPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>{isActive ? 'Current' : 'Closing'}:</Text>
              <Text style={styles.tooltipValue}>₹{currentPrice.toFixed(2)}</Text>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderLegend = () => {
    if (isMini && selectedStock) return null; // Hide legend in mini when tooltip shows

    return (
      <View style={[styles.legend, isMini && styles.legendMini]}>
        {segments.map((segment, index) => {
          const isSelected = selectedStock === segment.stock.symbol;
          const isOtherSelected = selectedStock !== null && !isSelected;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.legendItem,
                isMini && styles.legendItemMini,
                isOtherSelected && styles.legendItemFaded,
              ]}
              onPress={() => handleSegmentPress(segment.stock.symbol)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.legendColor,
                  isMini && styles.legendColorMini,
                  { backgroundColor: segment.color },
                  isSelected && styles.legendColorSelected,
                ]}
              />
              <Text
                style={[
                  styles.legendSymbol,
                  isMini && styles.legendSymbolMini,
                  isSelected && styles.legendSymbolSelected,
                ]}
                numberOfLines={1}
              >
                {segment.stock.symbol}
              </Text>
              {!isMini && (
                <Text
                  style={[
                    styles.legendPerformance,
                    segment.performance >= 0 ? styles.profit : styles.loss,
                  ]}
                >
                  {segment.performance >= 0 ? '+' : ''}{segment.performance.toFixed(1)}%
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (stocks.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, isMini && styles.containerMini]}>
      {renderBar()}
      {renderTooltip()}
      {renderLegend()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  containerMini: {
    marginVertical: 8,
  },
  barContainer: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  barContainerMini: {
    height: 32,
    borderRadius: 6,
  },
  segment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentSelected: {
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 4,
    margin: 2,
  },
  segmentLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tooltip: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipMini: {
    padding: 8,
    marginTop: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tooltipSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  tooltipPerformance: {
    fontSize: 16,
    fontWeight: '700',
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  tooltipLabel: {
    fontSize: 14,
    color: '#666',
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendMini: {
    marginTop: 8,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    minWidth: 80,
  },
  legendItemMini: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 60,
  },
  legendItemFaded: {
    opacity: 0.4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendColorMini: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendColorSelected: {
    borderWidth: 2,
    borderColor: '#333',
  },
  legendSymbol: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  legendSymbolMini: {
    fontSize: 11,
  },
  legendSymbolSelected: {
    fontWeight: '700',
  },
  legendPerformance: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  profit: {
    color: '#4CAF50',
  },
  loss: {
    color: '#f44336',
  },
});
