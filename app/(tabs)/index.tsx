import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { matchApi } from '../../src/services/api';
import { MatchCard } from '../../src/components/MatchCard';
import { COLORS, SPACING } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
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
}

export default function Dashboard() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = async (silent = false) => {
    try {
      if (!silent && !refreshing) setLoading(true);
      const data = await matchApi.getAllMatches();
      setMatches(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const handleDeleteMatch = (matchId: string) => {
    setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  const activeMatches = matches.filter(m => m.adminStatus === 'active').length;
  const totalJoined = matches.reduce((acc, curr) => acc + (curr.joinedSlots || 0), 0);
  const totalRevenue = matches.reduce((acc, curr) => acc + ((curr.joinedSlots || 0) * (curr.entryFee || 0)), 0);

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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Matches</Text>
        <Ionicons name="filter-outline" size={20} color={COLORS.textSecondary} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              onUpdate={() => fetchMatches(true)}
              onDelete={handleDeleteMatch}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="game-controller-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>No matches found. Create one!</Text>
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
    padding: 20,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
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
