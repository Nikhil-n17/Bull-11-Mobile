/**
 * Team Builder Screen
 * Select 5 stocks for contest entry
 * Reuses stock search logic from new-game.tsx
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { container } from '@/src/core/di/container';
import { useAuth } from '@/src/presentation/hooks/useAuth';
import { ConfirmDialog } from '@/src/presentation/components/ConfirmDialog';
import { Toast } from '@/src/presentation/components/common/Toast';
import type { Stock } from '@/src/domain/entities/Stock';
import { Exchange } from '@/src/domain/entities/Stock';
import { theme } from '@/src/core/theme';

const REQUIRED_STOCKS = 5;

export default function TeamBuilderScreen() {
  const router = useRouter();
  const { id: contestId } = useLocalSearchParams();
  const { isAuthenticated, updateActivity } = useAuth();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<Stock[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Load existing team on mount
  useEffect(() => {
    loadExistingTeam();
  }, [contestId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const loadExistingTeam = async () => {
    try {
      setLoadingTeam(true);
      const entry = await container.getMyTeamUseCase.execute({
        contestId: contestId as string,
      });

      if (entry && entry.stocks && entry.stocks.length > 0) {
        // Convert ContestStock[] to Stock[] format
        const existingStocks: Stock[] = entry.stocks.map((cs) => ({
          symbol: cs.symbol,
          name: cs.symbol, // Backend may not return full name, use symbol as fallback
          exchange: Exchange.NSE,
          instrumentToken: 0, // Not available from contest stock data
          lastPrice: cs.currentPrice || cs.openingPrice || undefined,
        }));
        setSelectedStocks(existingStocks);
        setIsEditing(true);
      }
    } catch {
      // No team yet — that's fine, user is creating for the first time
    } finally {
      setLoadingTeam(false);
    }
  };

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

      if (!results || results.length === 0) {
        setSearchResults([]);
        setError('No stocks found');
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

      setSearchResults(sortedResults.length > 0 ? sortedResults : results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(text);
    }, 500);
  };

  const handleSelectStock = (stock: Stock) => {
    setValidationError(null);

    if (!stock || !stock.symbol || !stock.name || !stock.instrumentToken) {
      setValidationError('Invalid stock data');
      return;
    }

    if (selectedStocks.some((s) => s.symbol.toUpperCase() === stock.symbol.toUpperCase())) {
      setValidationError('Stock already selected');
      return;
    }

    if (selectedStocks.length >= REQUIRED_STOCKS) {
      setValidationError(`Maximum ${REQUIRED_STOCKS} stocks allowed`);
      return;
    }

    setSelectedStocks([...selectedStocks, stock]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveStock = (symbol: string) => {
    setSelectedStocks(selectedStocks.filter((s) => s.symbol.toUpperCase() !== symbol.toUpperCase()));
    setValidationError(null);
  };

  const handleSubmitTeam = () => {
    if (selectedStocks.length !== REQUIRED_STOCKS) {
      setError(`Please select exactly ${REQUIRED_STOCKS} stocks`);
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);

    try {
      setSubmitting(true);
      setError(null);
      await updateActivity();

      const stockSymbols = selectedStocks.map((s) => s.symbol.trim());

      if (isEditing) {
        await container.updateTeamUseCase.execute({
          contestId: contestId as string,
          stockSymbols,
        });
      } else {
        await container.submitTeamUseCase.execute({
          contestId: contestId as string,
          stockSymbols,
        });
      }

      setSuccessMessage(isEditing ? 'Team updated successfully!' : 'Team submitted successfully!');
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          router.replace('/(tabs)/contests' as any);
        });
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit team';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderSearchResult = ({ item }: { item: Stock }) => {
    const isSelected = selectedStocks.some((s) => s.symbol.toUpperCase() === item.symbol.toUpperCase());

    return (
      <TouchableOpacity
        style={[styles.searchResultItem, isSelected && styles.searchResultItemSelected]}
        onPress={() => handleSelectStock(item)}
        disabled={isSelected}
      >
        <View style={styles.searchResultContent}>
          <Text style={styles.stockSymbol}>{item.symbol}</Text>
          <Text style={styles.stockName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.stockMeta}>
            <Text style={styles.stockExchange}>{item.exchange}</Text>
            {item.lastPrice != null && item.lastPrice > 0 && (
              <Text style={styles.stockPrice}>₹{item.lastPrice.toFixed(2)}</Text>
            )}
          </View>
        </View>
        <Text style={[styles.addIcon, isSelected && styles.addIconSelected]}>
          {isSelected ? '✓' : '+'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSelectedStock = (stock: Stock) => (
    <View key={stock.symbol} style={styles.chip}>
      <Text style={styles.chipText}>{stock.symbol}</Text>
      <TouchableOpacity
        onPress={() => handleRemoveStock(stock.symbol)}
        style={styles.chipRemove}
        disabled={submitting}
      >
        <Text style={styles.chipRemoveText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isAuthenticated) {
    return null;
  }

  if (loadingTeam) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#006e1c" />
        <Text style={{ marginTop: 12, fontSize: 16, color: '#666' }}>Loading team...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{isEditing ? 'Edit Your Team' : 'Build Your Team'}</Text>
          <Text style={styles.subtitle}>
            {isEditing
              ? 'Remove or replace stocks in your team'
              : `Select exactly ${REQUIRED_STOCKS} stocks`}
          </Text>
        </View>
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
            editable={!submitting}
          />
          {searching && (
            <ActivityIndicator
              style={styles.searchLoader}
              size="small"
              color="#006e1c"
            />
          )}
        </View>

        {/* Selected Stocks */}
        {selectedStocks.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedLabel}>
              Selected ({selectedStocks.length}/{REQUIRED_STOCKS})
            </Text>
            <View style={styles.chipsContainer}>
              {selectedStocks.map((stock) => renderSelectedStock(stock))}
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
            <Text style={styles.errorRetryHint}>Tap the button below to try again.</Text>
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

        {/* Hint */}
        {selectedStocks.length > 0 && selectedStocks.length < REQUIRED_STOCKS && (
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>
              Select {REQUIRED_STOCKS - selectedStocks.length} more stock
              {REQUIRED_STOCKS - selectedStocks.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        {selectedStocks.length === REQUIRED_STOCKS && (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitTeam}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>{isEditing ? 'Update Team' : 'Submit Team'}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Confirmation Dialog */}
        <ConfirmDialog
          visible={showConfirmDialog}
          title={isEditing ? 'Update Team' : 'Submit Team'}
          message={`${isEditing ? 'Update' : 'Submit'} your team with ${selectedStocks.length} stocks?\n\n${selectedStocks
            .map((s) => s.symbol)
            .join(', ')}`}
          confirmText={isEditing ? 'Update' : 'Submit'}
          cancelText="Cancel"
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowConfirmDialog(false)}
          confirmColor="#006e1c"
        />
      </ScrollView>

      {successMessage && (
        <Toast
          message={successMessage}
          variant="success"
          duration={2000}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#006e1c',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    color: theme.colors.text.primary,
  },
  searchLoader: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
  selectedContainer: {
    marginBottom: 16,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006e1c',
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 12,
  },
  chipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  chipRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  validationErrorContainer: {
    backgroundColor: 'rgba(179, 39, 42, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#b3272a',
  },
  validationErrorText: {
    color: '#b3272a',
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchResultItemSelected: {
    backgroundColor: 'rgba(0, 110, 28, 0.1)',
    borderColor: '#006e1c',
    opacity: 0.6,
  },
  searchResultContent: {
    flex: 1,
  },
  stockSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  stockName: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  stockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockExchange: {
    fontSize: 12,
    color: theme.colors.text.hint,
  },
  stockPrice: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  addIcon: {
    fontSize: 32,
    color: '#006e1c',
    fontWeight: '300',
  },
  addIconSelected: {
    fontSize: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(179, 39, 42, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#b3272a',
  },
  errorText: {
    color: '#b3272a',
    fontSize: 14,
  },
  errorRetryHint: {
    color: '#b3272a',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.75,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.hint,
    textAlign: 'center',
  },
  hintContainer: {
    backgroundColor: 'rgba(0, 110, 28, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#006e1c',
  },
  hintText: {
    color: '#006e1c',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
