/**
 * New Game Screen
 * Search and select stocks to start a new game
 * Includes comprehensive validation and edge case handling
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { container } from '@/src/core/di/container';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import type { Stock } from '@/src/domain/entities/Stock';
import { theme } from '@/src/core/theme';
import { ConfirmDialog } from '@/src/presentation/components/ConfirmDialog';

const MIN_STOCKS = 3;
const MAX_STOCKS = 5;
const PENNY_STOCK_THRESHOLD = 10; // Stocks below ₹10

/**
 * Categorizes error messages for user-friendly display
 */
function categorizeSearchError(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check for Kite authentication errors - hide technical details
  if (
    lowerMessage.includes('kite') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('login') ||
    lowerMessage.includes('token') ||
    lowerMessage.includes('zerodha')
  ) {
    return 'Unable to search stocks right now. Please try again later.';
  }

  // Check for network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('econnrefused')
  ) {
    return 'Network error. Please check your connection and try again.';
  }

  // Check for session errors
  if (lowerMessage.includes('401') || lowerMessage.includes('403')) {
    return 'Session expired. Please log in again.';
  }

  // For all other errors (including market hours), show the message as-is
  return errorMessage;
}

export default function NewGameScreen() {
  const router = useRouter();
  const { isAuthenticated, updateActivity } = useAuth();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<Stock[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [checkingMarketHours, setCheckingMarketHours] = useState(true);
  const [marketHoursError, setMarketHoursError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');

  // Check market hours on mount - FIRST validation
  // TEMPORARILY COMMENTED FOR TESTING
  /*
  useEffect(() => {
    const checkMarketHours = async () => {
      try {
        setCheckingMarketHours(true);
        // Try a simple search with empty query to trigger backend validation
        // Backend will return market hours error if market is closed
        await container.searchStocksUseCase.execute('RELIANCE');
        // If successful, market is open and we're good to go
        setMarketHoursError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const lowerMessage = errorMessage.toLowerCase();

        // Check if this is a market hours error (backend will say "market is closed")
        if (lowerMessage.includes('market') &&
            (lowerMessage.includes('closed') || lowerMessage.includes('hours') || lowerMessage.includes('time'))) {
          // Show the backend's actual market hours message
          setMarketHoursError(errorMessage);
        } else {
          // For all other errors (Kite, network, etc) - just prevent access without details
          setMarketHoursError('BLOCKED');
        }
      } finally {
        setCheckingMarketHours(false);
      }
    };

    checkMarketHours();
  }, []);
  */

  // TEMPORARY: Skip market hours check for testing
  useEffect(() => {
    setCheckingMarketHours(false);
    setMarketHoursError(null);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Debounced search with comprehensive error handling
  const handleSearch = async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      setError(null);
      return;
    }

    try {
      setSearching(true);
      setError(null);
      const results = await container.searchStocksUseCase.execute(query);

      // Handle empty results
      if (!results || results.length === 0) {
        setSearchResults([]);
        setError('No stocks found matching your search');
        return;
      }

      // Filter NSE/BSE only, sort NSE first
      const sortedResults = results
        .filter((stock) => stock && stock.symbol && (stock.exchange === 'NSE' || stock.exchange === 'BSE'))
        .sort((a, b) => {
          if (a.exchange === 'NSE' && b.exchange !== 'NSE') return -1;
          if (a.exchange !== 'NSE' && b.exchange === 'NSE') return 1;
          return 0;
        });

      if (sortedResults.length === 0) {
        setSearchResults([]);
        setError('Search returned invalid stock data');
        return;
      }

      setSearchResults(sortedResults);
    } catch (err) {
      const userFriendlyError = categorizeSearchError(err);
      setError(userFriendlyError);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(text);
    }, 500);
  };

  const handleSelectStock = (stock: Stock) => {
    // Clear any previous validation errors
    setValidationError(null);

    // Validate stock data
    if (!stock || !stock.symbol || !stock.name || !stock.instrumentToken) {
      setValidationError('This stock has missing data and cannot be selected');
      return;
    }

    // Validate instrument token
    if (typeof stock.instrumentToken !== 'number' || stock.instrumentToken <= 0) {
      setValidationError('This stock has an invalid instrument token');
      return;
    }

    // Check if already selected (case-insensitive)
    if (selectedStocks.some(s => s.symbol.toUpperCase() === stock.symbol.toUpperCase())) {
      setValidationError('This stock is already selected');
      return;
    }

    // Check max limit
    if (selectedStocks.length >= MAX_STOCKS) {
      setValidationError(`You can select up to ${MAX_STOCKS} stocks only`);
      return;
    }

    // Check if stock price is available (optional warning for penny stocks)
    if (stock.lastPrice && stock.lastPrice < PENNY_STOCK_THRESHOLD) {
      Alert.alert(
        'Low Price Stock',
        `${stock.symbol} is trading at ₹${stock.lastPrice.toFixed(2)}. Penny stocks can be highly volatile. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Anyway',
            onPress: () => {
              setSelectedStocks([...selectedStocks, stock]);
              setSearchQuery('');
              setSearchResults([]);
            },
          },
        ]
      );
      return;
    }

    setSelectedStocks([...selectedStocks, stock]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveStock = (symbol: string) => {
    // Filter out the stock (case-insensitive match)
    setSelectedStocks(selectedStocks.filter(
      s => s.symbol.toUpperCase() !== symbol.toUpperCase()
    ));
    setValidationError(null);
  };

  const handleStartGame = async () => {
    // Comprehensive validation before game start
    if (!isAuthenticated) {
      setError('Please log in to start a game');
      return;
    }

    // Validate selection count
    if (selectedStocks.length < MIN_STOCKS) {
      setError(`Please select at least ${MIN_STOCKS} stocks`);
      return;
    }

    if (selectedStocks.length > MAX_STOCKS) {
      setError(`Please select no more than ${MAX_STOCKS} stocks`);
      return;
    }

    // Validate all stock data
    const invalidStocks = selectedStocks.filter(
      s => !s.symbol || !s.name || !s.instrumentToken || s.instrumentToken <= 0
    );
    if (invalidStocks.length > 0) {
      setError(`${invalidStocks.length} stock(s) have invalid data. Please remove and re-select them.`);
      return;
    }

    // Check for duplicates (defensive check)
    const symbols = selectedStocks.map(s => s.symbol.toUpperCase());
    const uniqueSymbols = new Set(symbols);
    if (uniqueSymbols.size !== symbols.length) {
      setError('You have selected duplicate stocks. Please remove duplicates.');
      return;
    }

    // Check exchange distribution and prepare warnings
    const exchanges = selectedStocks.map(s => s.exchange);
    const uniqueExchanges = new Set(exchanges);

    // Build confirmation message with warnings
    let warningMessage = `Start a new game with ${selectedStocks.length} stocks?`;
    const warnings: string[] = [];

    // Warn if all stocks from same exchange (limited diversification)
    if (uniqueExchanges.size === 1) {
      warnings.push(`⚠️ All stocks are from ${Array.from(uniqueExchanges)[0]} exchange`);
    }

    // Warn if any penny stocks present
    const pennyStocks = selectedStocks.filter(s => s.lastPrice && s.lastPrice < PENNY_STOCK_THRESHOLD);
    if (pennyStocks.length > 0) {
      warnings.push(`⚠️ ${pennyStocks.length} penny stock(s) selected (high volatility)`);
    }

    if (warnings.length > 0) {
      warningMessage += '\n\n' + warnings.join('\n');
    }

    setConfirmMessage(warningMessage);
    setShowConfirmDialog(true);
  };

  const handleConfirmStartGame = async () => {
    setShowConfirmDialog(false);

    try {
      setStarting(true);
      setError(null);
      setValidationError(null);
      await updateActivity();

      const stockSymbols = selectedStocks.map(s => s.symbol.trim());

      // Detect the exchange - use the exchange from the first stock
      // (all stocks should be from same exchange due to our BSE/NSE filter)
      const exchange = selectedStocks[0]?.exchange || 'NSE';

      const game = await container.startGameUseCase.execute({
        stockSymbols,
        exchange
      });

      // Clear selection and navigate to active games
      setSelectedStocks([]);
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      setValidationError(null);
      router.replace('/(tabs)/games' as any);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start game';
      setError(errorMessage);
    } finally {
      setStarting(false);
    }
  };

  const renderSearchResult = ({ item }: { item: Stock }) => {
    // Determine if stock is already selected
    const isSelected = selectedStocks.some(s => s.symbol.toUpperCase() === item.symbol.toUpperCase());

    return (
      <TouchableOpacity
        style={[
          styles.searchResultItem,
          isSelected && styles.searchResultItemSelected,
        ]}
        onPress={() => handleSelectStock(item)}
        disabled={isSelected}
      >
        <View style={styles.searchResultContent}>
          <Text style={styles.stockSymbol}>{item.symbol}</Text>
          <Text style={styles.stockName}>{item.name}</Text>
          <View style={styles.stockMeta}>
            <Text style={styles.stockExchange}>{item.exchange}</Text>
            {item.lastPrice != null && item.lastPrice > 0 && (
              <Text style={[
                styles.stockPrice,
                item.lastPrice < PENNY_STOCK_THRESHOLD && styles.stockPricePenny
              ]}>
                ₹{item.lastPrice.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
        <Text style={[styles.addIcon, isSelected && styles.addIconSelected]}>
          {isSelected ? '✓' : '+'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSelectedStock = (stock: Stock, index: number) => (
    <View key={stock.symbol} style={styles.chip}>
      <Text style={styles.chipText}>{stock.symbol}</Text>
      <TouchableOpacity
        onPress={() => handleRemoveStock(stock.symbol)}
        style={styles.chipRemove}
        disabled={starting}
      >
        <Text style={styles.chipRemoveText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  // Show loading while checking market hours
  if (checkingMarketHours) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>New Game</Text>
          <Text style={styles.subtitle}>Checking market status...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Verifying market hours...</Text>
        </View>
      </View>
    );
  }

  // Show market hours error if present
  if (marketHoursError) {
    // If error is 'BLOCKED' (Kite/network issue), show generic message
    const isMarketHoursError = marketHoursError !== 'BLOCKED';
    const displayTitle = isMarketHoursError
      ? 'Cannot start game outside market hours'
      : 'Something went wrong';
    const displayMessage = isMarketHoursError
      ? 'Market is open Monday-Friday, 9:15 AM - 3:30 PM IST'
      : 'Please try again later';

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>New Game</Text>
          <Text style={styles.subtitle}>Select {MIN_STOCKS}-{MAX_STOCKS} stocks to begin</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.marketClosedContainer}>
            <Text style={styles.marketClosedIcon}>⏰</Text>
            <Text style={styles.marketClosedTitle}>{displayTitle}</Text>
            <Text style={styles.marketClosedMessage}>{displayMessage}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>New Game</Text>
        <Text style={styles.subtitle}>Select {MIN_STOCKS}-{MAX_STOCKS} stocks to begin</Text>
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search stocks by symbol or name..."
            placeholderTextColor={theme.colors.text.hint}
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!starting}
          />
          {searching && (
            <ActivityIndicator
              style={styles.searchLoader}
              size="small"
              color={theme.colors.primary.main}
            />
          )}
        </View>

        {/* Selected Stocks */}
        {selectedStocks.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedLabel}>
              Selected ({selectedStocks.length}/{MAX_STOCKS})
            </Text>
            <View style={styles.chipsContainer}>
              {selectedStocks.map((stock, index) => renderSelectedStock(stock, index))}
            </View>
          </View>
        )}

        {/* Validation Error */}
        {validationError && (
          <View style={styles.validationErrorContainer}>
            <Text style={styles.validationErrorText}>{validationError}</Text>
          </View>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsLabel}>Search Results</Text>
            {searchResults.map((item) => (
              <View key={`${item.symbol}-${item.exchange}`}>
                {renderSearchResult({ item })}
              </View>
            ))}
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Empty State */}
        {!searching && searchResults.length === 0 && !searchQuery && selectedStocks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Search for stocks</Text>
            <Text style={styles.emptySubtext}>
              Enter a stock symbol or company name to begin
            </Text>
          </View>
        )}

        {/* Instructions when stocks are selected */}
        {selectedStocks.length > 0 && selectedStocks.length < MIN_STOCKS && (
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>
              Select {MIN_STOCKS - selectedStocks.length} more stock{MIN_STOCKS - selectedStocks.length > 1 ? 's' : ''} to start
            </Text>
          </View>
        )}

        {/* Start Game Button */}
        {selectedStocks.length >= MIN_STOCKS && (
          <TouchableOpacity
            style={[
              styles.startButton,
              starting && styles.startButtonDisabled,
            ]}
            onPress={handleStartGame}
            disabled={starting}
            activeOpacity={0.7}
          >
            {starting ? (
              <ActivityIndicator color={theme.colors.text.inverse} />
            ) : (
              <Text style={styles.startButtonText}>Start Game</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Confirmation Dialog */}
        <ConfirmDialog
          visible={showConfirmDialog}
          title="Start Game"
          message={confirmMessage}
          confirmText="Start"
          cancelText="Cancel"
          onConfirm={handleConfirmStartGame}
          onCancel={() => setShowConfirmDialog(false)}
          confirmColor={theme.colors.success.main}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.padding.screen,
    paddingBottom: theme.spacing.padding.screen,
    backgroundColor: theme.colors.success.main,
  },
  title: {
    ...theme.typography.textStyles.h2,
    color: theme.colors.text.inverse,
    marginBottom: theme.spacing.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.success.bg,
  },
  content: {
    flex: 1,
    padding: theme.spacing.padding.screen,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: theme.spacing.margin.betweenCards,
  },
  searchInput: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: theme.spacing.spacing.md,
    paddingHorizontal: theme.spacing.padding.screen,
    fontSize: theme.typography.fontSize.md,
    borderWidth: theme.spacing.borderWidth.thin,
    borderColor: theme.colors.border.light,
    color: theme.colors.neutral.black,
  },
  searchLoader: {
    position: 'absolute',
    right: theme.spacing.padding.screen,
    top: theme.spacing.spacing.md,
  },
  selectedContainer: {
    marginBottom: theme.spacing.margin.betweenCards,
  },
  selectedLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.gap.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success.main,
    borderRadius: theme.spacing.borderRadius.full,
    paddingVertical: theme.spacing.spacing.sm,
    paddingLeft: theme.spacing.padding.screen,
    paddingRight: theme.spacing.spacing.md,
    marginRight: theme.spacing.spacing.sm,
    marginBottom: theme.spacing.spacing.sm,
  },
  chipText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginRight: theme.spacing.spacing.sm,
  },
  chipRemove: {
    width: 20,
    height: 20,
    borderRadius: theme.spacing.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: 20,
  },
  validationErrorContainer: {
    backgroundColor: theme.colors.warning.bg,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.spacing.md,
    marginBottom: theme.spacing.margin.betweenCards,
    borderLeftWidth: theme.spacing.borderWidth.heavy,
    borderLeftColor: theme.colors.warning.main,
  },
  validationErrorText: {
    color: theme.colors.warning.dark,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
  resultsContainer: {
    marginBottom: theme.spacing.margin.betweenCards,
  },
  resultsLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.spacing.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.spacing.md,
    marginBottom: theme.spacing.spacing.sm,
    borderWidth: theme.spacing.borderWidth.thin,
    borderColor: theme.colors.border.light,
  },
  searchResultItemSelected: {
    backgroundColor: theme.colors.success.bg,
    borderColor: theme.colors.success.main,
    opacity: 0.6,
  },
  searchResultContent: {
    flex: 1,
  },
  stockSymbol: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  stockName: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  stockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.gap.sm,
  },
  stockExchange: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.hint,
  },
  stockPrice: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  stockPricePenny: {
    color: theme.colors.warning.main,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  addIcon: {
    fontSize: 32,
    color: theme.colors.success.main,
    fontWeight: theme.typography.fontWeight.light,
  },
  addIconSelected: {
    color: theme.colors.success.dark,
    fontSize: 24,
  },
  errorContainer: {
    backgroundColor: theme.colors.error.bg,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.spacing.md,
    marginBottom: theme.spacing.margin.betweenCards,
    borderLeftWidth: theme.spacing.borderWidth.heavy,
    borderLeftColor: theme.colors.error.main,
  },
  errorText: {
    color: theme.colors.error.dark,
    fontSize: theme.typography.fontSize.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: theme.typography.fontSize['8xl'],
    marginBottom: theme.spacing.margin.betweenCards,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.hint,
    textAlign: 'center',
  },
  hintContainer: {
    backgroundColor: theme.colors.info.bg,
    borderRadius: theme.spacing.borderRadius.base,
    padding: theme.spacing.spacing.md,
    marginBottom: theme.spacing.margin.betweenCards,
    borderLeftWidth: theme.spacing.borderWidth.heavy,
    borderLeftColor: theme.colors.info.main,
  },
  hintText: {
    color: theme.colors.info.dark,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
  startButton: {
    backgroundColor: theme.colors.success.main,
    borderRadius: theme.spacing.borderRadius.base,
    paddingVertical: theme.spacing.padding.screen,
    alignItems: 'center',
    marginTop: theme.spacing.margin.betweenCards,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.padding.screen,
  },
  loadingText: {
    marginTop: theme.spacing.margin.betweenCards,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
  },
  marketClosedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.padding.screen,
  },
  marketClosedIcon: {
    fontSize: theme.typography.fontSize['8xl'],
    marginBottom: theme.spacing.margin.betweenCards,
  },
  marketClosedTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.spacing.md,
    textAlign: 'center',
  },
  marketClosedMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.margin.betweenCards * 2,
    lineHeight: 22,
  },
});
