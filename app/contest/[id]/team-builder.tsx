/**
 * Team Builder Screen
 * Select 5 stocks for contest entry
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
const BUDGET = 40;

// Brand green — canonical value used throughout this screen
const BRAND_GREEN = theme.colors.success.dark; // '#2E7D32'

export default function TeamBuilderScreen() {
  const router = useRouter();
  const { id: contestId } = useLocalSearchParams();
  const { isAuthenticated, updateActivity } = useAuth();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<Stock[]>([]);
  const [captainSymbol, setCaptainSymbol] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Animated budget bar width (0–100)
  const budgetAnim = useRef(new Animated.Value(0)).current;

  // Computed
  const usedPoints = selectedStocks.reduce((sum, s) => sum + (s.points ?? 9), 0);
  const remainingBudget = BUDGET - usedPoints;
  const budgetPct = Math.min((usedPoints / BUDGET) * 100, 100);

  // Animate budget bar whenever usedPoints changes
  useEffect(() => {
    Animated.timing(budgetAnim, {
      toValue: budgetPct,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [budgetPct]);

  // Dismiss validation error after 3 s
  useEffect(() => {
    if (!validationError) return;
    const t = setTimeout(() => setValidationError(null), 3000);
    return () => clearTimeout(t);
  }, [validationError]);

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
        const existingStocks: Stock[] = entry.stocks.map((cs: any) => ({
          symbol: cs.symbol,
          name: cs.symbol,
          exchange: (cs.exchange as Exchange) || Exchange.NSE,
          instrumentToken: 0,
          lastPrice: cs.currentPrice || cs.openingPrice || undefined,
          points: cs.points ?? 9,
          capCategory: cs.capCategory,
        }));
        setSelectedStocks(existingStocks);
        setIsEditing(true);
        const captainStock = (entry.stocks as any[]).find((cs: any) => cs.captain === true);
        if (captainStock) setCaptainSymbol(captainStock.symbol.toUpperCase());
      }
    } catch {
      // No team yet — creating for the first time
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

    if (!stock || !stock.symbol || !stock.name || stock.instrumentToken == null) {
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

    const stockPoints = stock.points ?? 9;
    if (usedPoints + stockPoints > BUDGET) {
      setValidationError(`Over budget: ${stock.symbol} costs ${stockPoints} pts, only ${remainingBudget} remaining`);
      return;
    }

    setSelectedStocks([...selectedStocks, stock]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveStock = (symbol: string) => {
    if (captainSymbol?.toUpperCase() === symbol.toUpperCase()) {
      setCaptainSymbol(null);
    }
    setSelectedStocks(selectedStocks.filter((s) => s.symbol.toUpperCase() !== symbol.toUpperCase()));
    setValidationError(null);
  };

  // Captain can be toggled at any time (not gated on 5 stocks); normalized to uppercase
  const handleToggleCaptain = (symbol: string) => {
    const upper = symbol.toUpperCase();
    setCaptainSymbol(prev =>
      prev === upper ? null : upper
    );
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
          captain: captainSymbol ?? undefined,
        });
      } else {
        await container.submitTeamUseCase.execute({
          contestId: contestId as string,
          stockSymbols,
          captain: captainSymbol ?? undefined,
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

  const getBudgetBarColor = () => {
    if (usedPoints > BUDGET) return theme.colors.error.main;
    if (usedPoints > 35) return theme.colors.warning.main;
    return BRAND_GREEN;
  };

  const renderSearchResult = ({ item }: { item: Stock }) => {
    const isSelected = selectedStocks.some((s) => s.symbol.toUpperCase() === item.symbol.toUpperCase());
    const stockPoints = item.points ?? 9;
    const isUnaffordable = !isSelected && usedPoints + stockPoints > BUDGET;

    return (
      <TouchableOpacity
        style={[
          styles.searchResultItem,
          isSelected && styles.searchResultItemSelected,
          isUnaffordable && styles.searchResultItemUnaffordable,
        ]}
        onPress={() => handleSelectStock(item)}
        disabled={isSelected || isUnaffordable}
        activeOpacity={0.7}
      >
        <View style={styles.searchResultContent}>
          <Text style={styles.stockSymbol}>{item.symbol}</Text>
          <Text style={styles.stockName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.stockMeta}>
            <Text style={styles.stockExchange}>{item.exchange}</Text>
            {item.lastPrice != null && item.lastPrice > 0 && (
              <Text style={styles.stockPrice}> · ₹{item.lastPrice.toFixed(2)}</Text>
            )}
            {item.capCategory && item.capCategory !== 'UNKNOWN' && (
              <Text style={styles.capCategoryText}> · {item.capCategory}</Text>
            )}
          </View>
        </View>
        <View style={styles.searchResultRight}>
          {item.points != null && (
            <View style={[
              styles.searchPointsBadge,
              isUnaffordable && styles.searchPointsBadgeOver,
            ]}>
              <Text style={[
                styles.searchPointsText,
                isUnaffordable && styles.searchPointsTextOver,
              ]}>
                {item.points} pts
              </Text>
            </View>
          )}
          <View style={[styles.addIconContainer, isSelected && styles.addIconContainerSelected]}>
            <Text style={[styles.addIcon, isSelected && styles.addIconSelected]}>
              {isSelected ? '✓' : '+'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedStock = (stock: Stock) => {
    const isCaptain = captainSymbol?.toUpperCase() === stock.symbol.toUpperCase();
    const stockPoints = stock.points ?? 9;

    return (
      <TouchableOpacity
        key={stock.symbol}
        style={[styles.stockCard, isCaptain && styles.stockCardCaptain]}
        onPress={() => handleToggleCaptain(stock.symbol)}
        activeOpacity={0.7}
        disabled={submitting}
      >
        <View style={styles.stockCardLeft}>
          {/* Captain badge — always rendered as ghost or filled */}
          <TouchableOpacity
            style={[styles.captainBadge, isCaptain && styles.captainBadgeFilled]}
            onPress={() => handleToggleCaptain(stock.symbol)}
            disabled={submitting}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.captainBadgeText, isCaptain && styles.captainBadgeTextFilled]}>C</Text>
          </TouchableOpacity>
          <View style={styles.stockCardInfo}>
            <Text style={styles.stockCardSymbol}>{stock.symbol}</Text>
            <Text style={styles.stockCardName} numberOfLines={1}>
              {stock.name !== stock.symbol ? stock.name : (stock.capCategory ?? '')}
            </Text>
            <View style={styles.stockCardMeta}>
              <Text style={styles.stockCardExchange}>{stock.exchange}</Text>
              {stock.lastPrice != null && stock.lastPrice > 0 && (
                <Text style={styles.stockCardPrice}> · ₹{stock.lastPrice.toFixed(2)}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.stockCardRight}>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsBadgeText}>{stockPoints} pts</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleRemoveStock(stock.symbol)}
            disabled={submitting}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loadingTeam) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={BRAND_GREEN} />
        <Text style={styles.loadingText}>Loading team...</Text>
      </View>
    );
  }

  const showSubmitButton = selectedStocks.length === REQUIRED_STOCKS;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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

        {/* Floating validation error */}
        {validationError && (
          <View style={styles.validationErrorContainer}>
            <Text style={styles.validationErrorText}>{validationError}</Text>
          </View>
        )}

        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, isFocused && styles.searchInputFocused]}
              placeholder="Search stocks by symbol or name..."
              placeholderTextColor={theme.colors.text.hint}
              value={searchQuery}
              onChangeText={handleSearchInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!submitting}
            />
            {searching && (
              <ActivityIndicator
                style={styles.searchLoader}
                size="small"
                color={BRAND_GREEN}
              />
            )}
          </View>

          {/* Selected Stocks */}
          {selectedStocks.length > 0 && (
            <View style={styles.selectedContainer}>
              <Text style={styles.selectedLabel}>
                Your Team ({selectedStocks.length}/{REQUIRED_STOCKS})
              </Text>

              {/* Budget Bar */}
              <View style={styles.budgetContainer}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budgetLabel}>BUDGET USED</Text>
                  <Text style={[
                    styles.budgetAmount,
                    usedPoints > BUDGET
                      ? styles.budgetOver
                      : usedPoints > 35
                        ? styles.budgetWarning
                        : styles.budgetOk,
                  ]}>
                    {usedPoints} / {BUDGET} pts
                  </Text>
                </View>
                {/* Animated fill bar */}
                <View style={styles.budgetBarTrack}>
                  <Animated.View style={[
                    styles.budgetBarFill,
                    {
                      width: budgetAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: getBudgetBarColor(),
                    },
                  ]} />
                </View>
                {/* Slot pip row */}
                <View style={styles.budgetPips}>
                  {Array.from({ length: REQUIRED_STOCKS }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.pip,
                        i < selectedStocks.length ? styles.pipFilled : styles.pipEmpty,
                      ]}
                    />
                  ))}
                  <Text style={styles.budgetRemaining}>
                    {usedPoints <= BUDGET
                      ? `${remainingBudget} pts remaining`
                      : `${usedPoints - BUDGET} pts over budget`}
                  </Text>
                </View>
              </View>

              {selectedStocks.map((stock) => renderSelectedStock(stock))}

              {/* Captain hint — always shown when stocks are selected but no captain */}
              {!captainSymbol && selectedStocks.length > 0 && (
                <View style={styles.captainHint}>
                  <Text style={styles.captainHintText}>Tap the C badge to set a captain (optional)</Text>
                </View>
              )}
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

          {/* Progress hint */}
          {selectedStocks.length > 0 && selectedStocks.length < REQUIRED_STOCKS && (
            <View style={styles.hintContainer}>
              <View style={styles.hintSlots}>
                {Array.from({ length: REQUIRED_STOCKS }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.hintPip, i < selectedStocks.length ? styles.hintPipFilled : styles.hintPipEmpty]}
                  />
                ))}
              </View>
              <Text style={styles.hintText}>
                Select {REQUIRED_STOCKS - selectedStocks.length} more stock
                {REQUIRED_STOCKS - selectedStocks.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Spacer so content isn't hidden behind fixed submit button */}
          {showSubmitButton && <View style={{ height: 80 }} />}
        </ScrollView>

        {/* Submit Button — fixed outside ScrollView */}
        {showSubmitButton && (
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitTeam}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update Team' : 'Submit Team'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Confirmation Dialog */}
        <ConfirmDialog
          visible={showConfirmDialog}
          title={isEditing ? 'Update Team' : 'Submit Team'}
          message={`${isEditing ? 'Update' : 'Submit'} your team?\n\n${selectedStocks.map(s => s.symbol).join(', ')}${captainSymbol ? `\nCaptain: ${captainSymbol}` : ''}\nBudget: ${usedPoints}/${BUDGET} pts`}
          confirmText={isEditing ? 'Update' : 'Submit'}
          cancelText="Cancel"
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowConfirmDialog(false)}
          confirmColor={BRAND_GREEN}
        />

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
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.spacing.md,
    ...theme.typography.textStyles.body,
    color: theme.colors.text.secondary,
  },

  // ── Header ───────────────────────────────────────────────────────
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.padding.screen,
    paddingBottom: theme.spacing.spacing.base,
    backgroundColor: BRAND_GREEN,
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
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...theme.typography.textStyles.h3,
    color: theme.colors.text.inverse,
    marginBottom: 2,
  },
  subtitle: {
    ...theme.typography.textStyles.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // ── Content ──────────────────────────────────────────────────────
  content: {
    flex: 1,
    padding: theme.spacing.padding.screen,
  },

  // ── Search ───────────────────────────────────────────────────────
  searchContainer: {
    position: 'relative',
    marginBottom: theme.spacing.spacing.base,
  },
  searchInput: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.spacing.borderRadius.md,
    paddingVertical: theme.spacing.spacing.md,
    paddingHorizontal: theme.spacing.spacing.base,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border.light,
    color: theme.colors.text.primary,
  },
  searchInputFocused: {
    borderColor: theme.colors.border.focus,
  },
  searchLoader: {
    position: 'absolute',
    right: 14,
    top: 13,
  },

  // ── Floating validation error ─────────────────────────────────────
  validationErrorContainer: {
    backgroundColor: theme.colors.error.bg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error.dark,
    paddingHorizontal: theme.spacing.spacing.base,
    paddingVertical: theme.spacing.spacing.sm,
    marginHorizontal: theme.spacing.padding.screen,
    marginBottom: theme.spacing.spacing.sm,
    borderRadius: theme.spacing.borderRadius.base,
  },
  validationErrorText: {
    color: theme.colors.error.dark,
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Selected stocks ───────────────────────────────────────────────
  selectedContainer: {
    marginBottom: theme.spacing.spacing.base,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.spacing.sm,
  },

  // ── Budget bar ───────────────────────────────────────────────────
  budgetContainer: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.spacing.borderRadius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.spacing.shadows.sm,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.spacing.sm,
  },
  budgetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  budgetOk: { color: BRAND_GREEN },
  budgetWarning: { color: theme.colors.warning.dark },
  budgetOver: { color: theme.colors.error.main },
  budgetBarTrack: {
    height: 8,
    backgroundColor: theme.colors.success.bg,
    borderRadius: theme.spacing.borderRadius.full,
    overflow: 'hidden',
    marginBottom: 8,
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: theme.spacing.borderRadius.full,
  },
  budgetPips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pip: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pipFilled: {
    backgroundColor: BRAND_GREEN,
  },
  pipEmpty: {
    backgroundColor: theme.colors.border.light,
  },
  budgetRemaining: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.hint,
    textAlign: 'right',
  },

  // ── Stock cards ───────────────────────────────────────────────────
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.spacing.borderRadius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.spacing.shadows.sm,
  },
  stockCardCaptain: {
    borderWidth: 2,
    borderColor: theme.colors.warning.main,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning.dark,
    backgroundColor: theme.colors.warning.bg,
  },
  stockCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  // Ghost/filled captain badge — always rendered
  captainBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.warning.main,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  captainBadgeFilled: {
    backgroundColor: theme.colors.warning.main,
    borderStyle: 'solid',
    borderColor: theme.colors.warning.dark,
  },
  captainBadgeText: {
    color: theme.colors.warning.main,
    fontSize: 13,
    fontWeight: '800',
  },
  captainBadgeTextFilled: {
    color: '#ffffff',
  },
  stockCardInfo: {
    flex: 1,
  },
  stockCardSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  stockCardName: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 1,
  },
  stockCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  stockCardExchange: {
    fontSize: 11,
    color: theme.colors.text.hint,
  },
  stockCardPrice: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  stockCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointsBadge: {
    backgroundColor: theme.colors.success.bg,
    borderRadius: theme.spacing.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_GREEN,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.error.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: theme.colors.error.main,
    fontSize: 13,
    fontWeight: '600',
  },

  // Captain hint
  captainHint: {
    backgroundColor: theme.colors.warning.bg,
    borderRadius: theme.spacing.borderRadius.base,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning.main,
  },
  captainHintText: {
    fontSize: 13,
    color: theme.colors.warning.dark,
  },

  // ── Search results ────────────────────────────────────────────────
  resultsContainer: {
    marginBottom: theme.spacing.spacing.base,
  },
  resultsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.spacing.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.alt,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  searchResultItemSelected: {
    backgroundColor: theme.colors.success.bgLight,
    borderColor: BRAND_GREEN,
    opacity: 0.7,
  },
  searchResultItemUnaffordable: {
    opacity: 0.45,
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
  capCategoryText: {
    fontSize: 12,
    color: theme.colors.text.hint,
    fontStyle: 'italic',
  },
  // Right side of search row: points badge + add button
  searchResultRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  searchPointsBadge: {
    backgroundColor: theme.colors.success.bg,
    borderRadius: theme.spacing.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 48,
    alignItems: 'center',
  },
  searchPointsBadgeOver: {
    backgroundColor: theme.colors.error.bg,
  },
  searchPointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_GREEN,
  },
  searchPointsTextOver: {
    color: theme.colors.error.main,
  },
  addIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconContainerSelected: {
    backgroundColor: theme.colors.border.medium,
  },
  addIcon: {
    fontSize: 20,
    color: theme.colors.text.inverse,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
  addIconSelected: {
    fontSize: 16,
  },

  // ── Errors ────────────────────────────────────────────────────────
  errorContainer: {
    backgroundColor: theme.colors.error.bg,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 12,
    marginBottom: theme.spacing.spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error.dark,
  },
  errorText: {
    color: theme.colors.error.dark,
    fontSize: 14,
  },
  errorRetryHint: {
    color: theme.colors.error.dark,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.75,
  },

  // ── Empty state ───────────────────────────────────────────────────
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

  // ── Progress hint ─────────────────────────────────────────────────
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success.bgLight,
    borderRadius: theme.spacing.borderRadius.base,
    padding: 12,
    marginBottom: theme.spacing.spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_GREEN,
    gap: 10,
  },
  hintSlots: {
    flexDirection: 'row',
    gap: 5,
  },
  hintPip: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hintPipFilled: {
    backgroundColor: BRAND_GREEN,
  },
  hintPipEmpty: {
    backgroundColor: theme.colors.border.light,
  },
  hintText: {
    color: BRAND_GREEN,
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Submit button (fixed bottom) ───────────────────────────────────
  submitContainer: {
    paddingHorizontal: theme.spacing.padding.screen,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    backgroundColor: theme.colors.background.default,
  },
  submitButton: {
    backgroundColor: BRAND_GREEN,
    borderRadius: theme.spacing.borderRadius['2xl'],
    paddingVertical: 16,
    alignItems: 'center',
    ...theme.spacing.shadows.base,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
