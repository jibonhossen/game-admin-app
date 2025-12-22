import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { matchApi } from '../../src/services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateMatch() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [date, setDate] = useState(new Date());
    const [formData, setFormData] = useState({
        title: '',
        matchType: 'Solo',
        category: 'Battle Royale',
        map: 'Bermuda',
        entryFee: '',
        prizePool: '',
        perKill: '',
        totalSlots: '',
        customId: '',
        password: '',
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const data = await matchApi.getMatchConfig();
            setConfig(data);
        } catch (error) {
            console.error('Failed to fetch config', error);
        }
    };

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const newDate = new Date(date);
            newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setDate(newDate);
        }
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate) {
            const newDate = new Date(date);
            newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
            setDate(newDate);
        }
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.entryFee || !formData.totalSlots) {
            Alert.alert('Required', 'Please fill in Title, Entry Fee, and Total Slots.');
            return;
        }

        try {
            setLoading(true);

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dateStr = `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;

            let hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const timeStr = `${hours}:${String(date.getMinutes()).padStart(2, '0')} ${ampm}`;

            await matchApi.createMatch({
                ...formData,
                scheduleDate: dateStr,
                scheduleTime: timeStr,
                entryFee: Number(formData.entryFee),
                prizePool: Number(formData.prizePool),
                perKill: Number(formData.perKill),
                totalSlots: Number(formData.totalSlots),
                joinedSlots: 0,
                status: 'Open',
                joinedUsers: []
            });

            Alert.alert('Success', 'Match created successfully!', [
                { text: 'Great', onPress: () => router.replace('/') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create match');
        } finally {
            setLoading(false);
        }
    };

    const renderSelection = (label: string, field: string, options: string[], icon: any) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name={icon} size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.label}>{label}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt}
                        style={[
                            styles.chip,
                            formData[field as keyof typeof formData] === opt && styles.chipActive
                        ]}
                        onPress={() => handleChange(field, opt)}
                    >
                        <Text style={[
                            styles.chipText,
                            formData[field as keyof typeof formData] === opt && styles.chipTextActive
                        ]}>{opt}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>New Match</Text>
                    <Text style={styles.headerSub}>Setup a new tournament session</Text>
                </View>

                {/* Basic Details */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>BASIC INFORMATION</Text>
                    <Input
                        icon="document-text-outline"
                        label="Match Title"
                        value={formData.title}
                        onChangeText={(t: string) => handleChange('title', t)}
                        placeholder="e.g. Pro League Qualifier"
                    />

                    {renderSelection("Match Type", "matchType", ['Solo', 'Duo', 'Squad'], "people-outline")}
                    {renderSelection("Game Mode", "category", config?.category ? config.category.map((c: any) => c.value) : ['Battle Royale'], "game-controller-outline")}
                    {renderSelection("Select Map", "map", config?.map ? config.map.map((c: any) => c.value) : ['Bermuda'], "map-outline")}
                </View>

                {/* Scheduling */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>SCHEDULE & TIME</Text>
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
                            <View style={styles.pickerIcon}>
                                <Ionicons name="calendar" size={18} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.pickerLabel}>DATE</Text>
                                <Text style={styles.pickerValue}>{date.toLocaleDateString()}</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
                            <View style={styles.pickerIcon}>
                                <Ionicons name="time" size={18} color={COLORS.primary} />
                            </View>
                            <View>
                                <Text style={styles.pickerLabel}>TIME</Text>
                                <Text style={styles.pickerValue}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            onChange={handleDateChange}
                            minimumDate={new Date()}
                        />
                    )}
                    {showTimePicker && (
                        <DateTimePicker
                            value={date}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleTimeChange}
                        />
                    )}
                </View>

                {/* Economics */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>ECONOMICS & SLOTS</Text>
                    <View style={styles.row}>
                        <Input icon="cash-outline" label="Entry Fee" value={formData.entryFee} onChangeText={(t: string) => handleChange('entryFee', t)} keyboardType="numeric" flex={1} placeholder="0" />
                        <Input icon="trophy-outline" label="Prize Pool" value={formData.prizePool} onChangeText={(t: string) => handleChange('prizePool', t)} keyboardType="numeric" flex={1} placeholder="0" />
                    </View>
                    <View style={styles.row}>
                        <Input icon="skull-outline" label="Per Kill" value={formData.perKill} onChangeText={(t: string) => handleChange('perKill', t)} keyboardType="numeric" flex={1} placeholder="0" />
                        <Input icon="people-outline" label="Total Slots" value={formData.totalSlots} onChangeText={(t: string) => handleChange('totalSlots', t)} keyboardType="numeric" flex={1} placeholder="48" />
                    </View>
                </View>

                {/* Room Details */}
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>ROOM CREDENTIALS</Text>
                    <View style={styles.row}>
                        <Input icon="id-card-outline" label="Room ID" value={formData.customId} onChangeText={(t: string) => handleChange('customId', t)} flex={2} placeholder="Wait for Match" />
                        <Input icon="lock-closed-outline" label="Pass" value={formData.password} onChangeText={(t: string) => handleChange('password', t)} flex={1} placeholder="****" />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.8}
                    style={styles.submitContainer}
                >
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitButton}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <>
                                <Text style={styles.submitText}>Release Match</Text>
                                <Ionicons name="rocket-outline" size={20} color={COLORS.white} />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const Input = ({ label, value, onChangeText, placeholder, keyboardType, flex, icon }: any) => (
    <View style={[styles.inputContainer, flex && { flex }]}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputWrapper}>
            <Ionicons name={icon} size={18} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType={keyboardType}
            />
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 20,
    },
    headerInfo: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    headerSub: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: COLORS.textSecondary,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.primary,
        letterSpacing: 1,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        color: COLORS.text,
        marginBottom: 8,
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 54,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    input: {
        flex: 1,
        color: COLORS.text,
        fontFamily: 'Poppins_500Medium',
        fontSize: 14,
    },
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    chipContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        color: COLORS.textSecondary,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12,
    },
    chipTextActive: {
        color: COLORS.white,
    },
    pickerBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
        marginBottom: 16,
    },
    pickerIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pickerLabel: {
        fontSize: 9,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    pickerValue: {
        color: COLORS.text,
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
    },
    submitContainer: {
        marginTop: 10,
        marginBottom: 20,
    },
    submitButton: {
        height: 60,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    submitText: {
        color: COLORS.white,
        fontFamily: 'Poppins_700Bold',
        fontSize: 16,
    },
});
