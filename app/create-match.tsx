import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../src/constants/theme';
import { matchApi } from '../src/services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function CreateMatch() {
    const router = useRouter();
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
            Alert.alert('Error', 'Please fill in all required fields');
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
            Alert.alert('Success', 'Match created successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create match');
        } finally {
            setLoading(false);
        }
    };

    const renderSelection = (label: string, field: string, options: string[]) => (
        <View style={styles.section}>
            <Text style={styles.label}>{label}</Text>
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
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>Create match</Text>
                <Text style={styles.subHeader}>Fill in the details to host a new game</Text>
            </View>

            <View style={styles.card}>
                <Input label="Title" value={formData.title} onChangeText={(t: string) => handleChange('title', t)} placeholder="e.g. Daily Scrims" />
            </View>

            <View style={styles.card}>
                {renderSelection("Type", "matchType", ['Solo', 'Duo', 'Squad'])}
                {renderSelection("Category", "category", config?.category ? config.category.map((c: any) => c.value) : ['Battle Royale'])}
                {renderSelection("Map", "map", config?.map ? config.map.map((c: any) => c.value) : ['Bermuda'])}
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Schedule</Text>
                <View style={styles.row}>
                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
                        <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.dateText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Economics</Text>
                <View style={styles.row}>
                    <Input label="Entry Fee" value={formData.entryFee} onChangeText={(t: string) => handleChange('entryFee', t)} keyboardType="numeric" flex={1} />
                    <Input label="Prize Pool" value={formData.prizePool} onChangeText={(t: string) => handleChange('prizePool', t)} keyboardType="numeric" flex={1} />
                </View>
                <View style={styles.row}>
                    <Input label="Per Kill" value={formData.perKill} onChangeText={(t: string) => handleChange('perKill', t)} keyboardType="numeric" flex={1} />
                    <Input label="Total Slots" value={formData.totalSlots} onChangeText={(t: string) => handleChange('totalSlots', t)} keyboardType="numeric" flex={1} />
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Credentials (Optional)</Text>
                <View style={styles.row}>
                    <Input label="Custom ID" value={formData.customId} onChangeText={(t: string) => handleChange('customId', t)} flex={1} placeholder="Room ID" />
                    <Input label="Password" value={formData.password} onChangeText={(t: string) => handleChange('password', t)} flex={1} placeholder="Pass" />
                </View>
            </View>

            <TouchableOpacity onPress={handleSubmit} disabled={loading} style={styles.submitButtonContainer}>
                <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.button}
                >
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Create Match</Text>}
                </LinearGradient>
            </TouchableOpacity>
        </ScrollView>
    );
}

const Input = ({ label, value, onChangeText, placeholder, keyboardType, flex }: any) => (
    <View style={[styles.inputContainer, flex && { flex }]}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textSecondary}
            keyboardType={keyboardType}
        />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.m,
        paddingBottom: 40,
    },
    headerContainer: {
        marginBottom: SPACING.l,
    },
    header: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    subHeader: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    card: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: SPACING.m,
    },
    row: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    inputContainer: {
        marginBottom: SPACING.m,
    },
    label: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.s,
        fontSize: 12,
        fontFamily: FONTS.medium,
    },
    input: {
        backgroundColor: COLORS.surface,
        color: COLORS.text,
        padding: SPACING.m,
        borderRadius: 12,
        fontFamily: FONTS.regular,
        fontSize: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    section: {
        marginBottom: SPACING.m,
    },
    chipContainer: {
        flexDirection: 'row',
        gap: SPACING.s,
        paddingBottom: SPACING.xs,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        color: COLORS.textSecondary,
        fontFamily: FONTS.medium,
        fontSize: 12,
    },
    chipTextActive: {
        color: COLORS.white,
    },
    dateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.m,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: SPACING.s,
    },
    dateText: {
        color: COLORS.text,
        fontFamily: FONTS.medium,
        fontSize: 14,
    },
    submitButtonContainer: {
        marginVertical: SPACING.m,
    },
    button: {
        padding: SPACING.m,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonText: {
        color: COLORS.white,
        fontFamily: FONTS.bold,
        fontSize: 16,
    },
});
