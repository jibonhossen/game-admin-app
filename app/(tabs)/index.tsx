import { View, Text, SectionList, ActivityIndicator, StyleSheet, RefreshControl, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import React, { useCallback, useState, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { matchApi } from '../../src/services/api';
import { MatchCard } from '../../src/components/MatchCard';
import { COLORS, SPACING } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Match {
  id: string;
  title: string;
  status: string;
  matchType: string;
  map: string;
  scheduleDate: string;
  scheduleTime: string;
  joinedSlots: number;
  totalSlots: number;
  entryFee: number;
  adminStatus: string;
  matchNo: string;
  category: string; // Added category to Match interface
}

type SortType = 'newest' | 'oldest' | 'match_no';

const SORT_LABELS: Record<SortType, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  match_no: 'Match No'
};

export default function Dashboard() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortPrefs, setSortPrefs] = useState<Record<string, SortType>>({});
  const [selectedMode, setSelectedMode] = useState('All');

  const fetchData = async (silent = false) => {
    try {
      if (!silent && !refreshing) setLoading(true);
      const [matchesData, configData] = await Promise.all([
        matchApi.getAllMatches(),
        matchApi.getMatchConfig()
      ]);
      setMatches(matchesData);

      // Filter config for categories
      const activeCats = (configData.category || [])
        .filter((c: any) => c.is_active === 1)
        .map((c: any) => c.value);

      setCategories(['All', ...activeCats]);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDeleteMatch = (matchId: string) => {
    setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  const activeMatches = matches.filter(m => m.adminStatus === 'active').length;
  const totalJoined = matches.reduce((acc, curr) => acc + (curr.joinedSlots || 0), 0);
  const totalRevenue = matches.reduce((acc, curr) => acc + ((curr.joinedSlots || 0) * (curr.entryFee || 0)), 0);

  const parseDateTime = (dateStr: string, timeStr: string) => {
    try {
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const [day, monthStr, year] = dateStr.split(' ');
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      return new Date(parseInt(year), monthMap[monthStr], parseInt(day), hours, minutes, 0).getTime();
    } catch (e) {
      return 0;
    }
  };

  const sections = useMemo(() => {
    const filtered = selectedMode === 'All'
      ? matches
      : matches.filter(m => m.category === selectedMode);

    const grouped = filtered.reduce((acc, match) => {
      const type = match.matchType || 'Uncategorized';
      if (!acc[type]) acc[type] = [];
      acc[type].push(match);
      return acc;
    }, {} as Record<string, Match[]>);

    return Object.entries(grouped).map(([type, list]) => {
      const sortType = sortPrefs[type] || 'newest';
      const sortedList = [...list].sort((a, b) => {
        if (sortType === 'match_no') {
          const noA = parseInt(a.matchNo.replace(/\D/g, '')) || 0;
          const noB = parseInt(b.matchNo.replace(/\D/g, '')) || 0;
          return noB - noA; // Descending ID
        }
        const timeA = parseDateTime(a.scheduleDate, a.scheduleTime);
        const timeB = parseDateTime(b.scheduleDate, b.scheduleTime);

        if (sortType === 'newest') return timeB - timeA;
        return timeA - timeB;
      });

      return { title: type, data: sortedList };
    });
  }, [matches, sortPrefs, selectedMode]);

  const toggleSort = (sectionTitle: string) => {
    setSortPrefs(prev => {
      const current = prev[sectionTitle] || 'newest';
      let next: SortType = 'newest';
      if (current === 'newest') next = 'oldest';
      else if (current === 'oldest') next = 'match_no';
      else next = 'newest';

      return { ...prev, [sectionTitle]: next };
    });
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.welcomeText}>System Overview</Text>

      <View style={styles.statsRow}>
        <StatCard
          label="Active"
          value={activeMatches.toString()}
          icon="radio-button-on"
          color={COLORS.success}
        />
        <StatCard
          label="Players"
          value={totalJoined.toString()}
          icon="people"
          color={COLORS.primary}
        />
        <StatCard
          label="Revenue"
          value={`৳${totalRevenue}`}
          icon="wallet"
          color="#f59e0b"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.modeSelector}
      >
        {categories.map((mode) => {
          const checkIcon = {
            'Battle Royale': 'trophy',
            'Clash Squad': 'flash',
            'Lone Wolf': 'paw',
            'All': 'grid',
            'Ludo': 'dice',
          }[mode] || 'game-controller';

          const isActive = selectedMode === mode;

          return (
            <TouchableOpacity
              key={mode}
              style={[styles.modeChip, isActive && styles.modeChipActive]}
              onPress={() => setSelectedMode(mode)}
            >
              <Ionicons
                name={checkIcon as any}
                size={16}
                color={isActive ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.modeText, isActive && styles.modeTextActive]}>
                {mode}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Only show section title grouping if showing All, otherwise redundant?
          Actually keeping it for sorting controls per section is good.
      */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedMode === 'All' ? 'Recent Matches' : `${selectedMode} Matches`}
        </Text>
      </View>
    </View>
  );

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => {
    const sortType = sortPrefs[title] || 'newest';

    return (
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleContainer}>
          <View style={styles.sectionIndicator} />
          <Text style={styles.sectionTitleSmall}>{title.toUpperCase()}</Text>
        </View>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => toggleSort(title)}
          activeOpacity={0.7}
        >
          <Text style={styles.sortLabel}>{SORT_LABELS[sortType]}</Text>
          <Ionicons name="swap-vertical" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 20 }}>
              <MatchCard
                match={item}
                onUpdate={() => fetchMatches(true)}
                onDelete={handleDeleteMatch}
              />
            </View>
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderHeader}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="game-controller-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>No matches found for {selectedMode}.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const StatCard = ({ label, value, icon, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconBg, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  headerContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  modeSelector: {
    gap: 12,
    marginBottom: 20,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textSecondary,
  },
  modeTextActive: {
    color: COLORS.white,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  sectionTitleSmall: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIndicator: {
    width: 4,
    height: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
