import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator, KeyboardAvoidingView, Modal } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { matchApi, templateApi, MatchTemplate } from '../../src/services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '../../src/contexts/AlertContext';

export default function CreateMatch() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Template states
    const [templates, setTemplates] = useState<MatchTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<MatchTemplate | null>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);

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
        prizeDetails: '',
    });

    const fetchData = async () => {
        try {
            const [configData, templatesData] = await Promise.all([
                matchApi.getMatchConfig(),
                templateApi.getAll()
            ]);
            setConfig(configData);
            setTemplates(templatesData);
        } catch (error) {
            console.error('Failed to fetch config', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const handleSelectTemplate = (template: MatchTemplate) => {
        setSelectedTemplate(template);
        setFormData({
            title: template.title,
            matchType: template.matchType,
            category: template.category,
            map: template.map,
            entryFee: template.entryFee.toString(),
            prizePool: template.prizePool.toString(),
            perKill: template.perKill.toString(),
            totalSlots: template.totalSlots.toString(),
            customId: '',
            password: '',
            prizeDetails: template.prizeDetails,
        });
        showAlert({ title: 'Template Applied', message: `"${template.name}" loaded. Set the date & time to create the match.`, type: 'success' });
    };

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            showAlert({ title: 'Required', message: 'Please enter a template name', type: 'warning' });
            return;
        }
        if (!formData.title || !formData.entryFee || !formData.totalSlots) {
            showAlert({ title: 'Required', message: 'Please fill in Title, Entry Fee, and Total Slots before saving template.', type: 'warning' });
            return;
        }

        try {
            setSavingTemplate(true);
            await templateApi.create({
                name: templateName.trim(),
                title: formData.title,
                matchType: formData.matchType as 'Solo' | 'Duo' | 'Squad',
                category: formData.category,
                map: formData.map,
                entryFee: Number(formData.entryFee),
                prizePool: Number(formData.prizePool) || 0,
                perKill: Number(formData.perKill) || 0,
                totalSlots: Number(formData.totalSlots),
                prizeDetails: formData.prizeDetails,
            });
            setShowSaveModal(false);
            setTemplateName('');
            await fetchData();
            showAlert({ title: 'Success', message: 'Template saved successfully!', type: 'success' });
        } catch (error) {
            showAlert({ title: 'Error', message: 'Failed to save template', type: 'error' });
        } finally {
            setSavingTemplate(false);
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
            showAlert({ title: 'Required', message: 'Please fill in Title, Entry Fee, and Total Slots.', type: 'warning' });
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
                joinedUsers: [],
                prizeDetails: formData.prizeDetails
            });

            showAlert({
                title: 'Success',
                message: 'Match created successfully!',
                type: 'success',
                onConfirm: () => router.replace('/')
            });
        } catch (error: any) {
            showAlert({ title: 'Error', message: error.response?.data?.message || 'Failed to create match', type: 'error' });
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
                {/* Template Save Modal */}
                <Modal
                    visible={showSaveModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowSaveModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Ionicons name="bookmark" size={24} color={COLORS.primary} />
                                <Text style={styles.modalTitle}>Save as Template</Text>
                            </View>
                            <Text style={styles.modalSubtitle}>Enter a name for this template</Text>
                            <View style={styles.modalInputWrapper}>
                                <TextInput
                                    style={styles.modalInput}
                                    value={templateName}
                                    onChangeText={setTemplateName}
                                    placeholder="e.g. Solo BR 10TK"
                                    placeholderTextColor={COLORS.textSecondary}
                                    autoFocus
                                />
                            </View>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => { setShowSaveModal(false); setTemplateName(''); }}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalSaveBtn}
                                    onPress={handleSaveTemplate}
                                    disabled={savingTemplate}
                                >
                                    {savingTemplate ? (
                                        <ActivityIndicator color={COLORS.white} size="small" />
                                    ) : (
                                        <Text style={styles.modalSaveText}>Save Template</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>New Match</Text>
                    <Text style={styles.headerSub}>Setup a new tournament session</Text>
                </View>

                {/* Template Selector */}
                {templates.length > 0 && (
                    <View style={styles.templateSection}>
                        <View style={styles.templateHeader}>
                            <Ionicons name="flash" size={16} color={COLORS.primary} />
                            <Text style={styles.templateLabel}>Quick Start from Template</Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.templateScroll}
                        >
                            {templates.map((template) => (
                                <TouchableOpacity
                                    key={template.id}
                                    style={[
                                        styles.templateChip,
                                        selectedTemplate?.id === template.id && styles.templateChipActive
                                    ]}
                                    onPress={() => handleSelectTemplate(template)}
                                >
                                    <Text style={[
                                        styles.templateChipText,
                                        selectedTemplate?.id === template.id && styles.templateChipTextActive
                                    ]}>{template.name}</Text>
                                    <Text style={[
                                        styles.templateChipSub,
                                        selectedTemplate?.id === template.id && styles.templateChipSubActive
                                    ]}>৳{template.entryFee}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

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

                    {/* Quick Time Presets */}
                    <View style={styles.quickTimeSection}>
                        <View style={styles.quickTimeHeader}>
                            <Ionicons name="flash" size={14} color={COLORS.primary} />
                            <Text style={styles.quickTimeLabel}>Quick Time</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickTimeScroll}>
                            {[20, 21, 22, 23].map((hour) => {
                                const isSelected = date.getHours() === hour && date.getMinutes() === 0;
                                return (
                                    <TouchableOpacity
                                        key={hour}
                                        style={[styles.quickTimeChip, isSelected && styles.quickTimeChipActive]}
                                        onPress={() => {
                                            const newDate = new Date();
                                            newDate.setHours(hour, 0, 0, 0);
                                            if (newDate < new Date()) {
                                                newDate.setDate(newDate.getDate() + 1);
                                            }
                                            setDate(newDate);
                                        }}
                                    >
                                        <Text style={[styles.quickTimeText, isSelected && styles.quickTimeTextActive]}>
                                            {hour > 12 ? hour - 12 : hour} PM
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Relative Time Buttons */}
                    <View style={styles.quickTimeSection}>
                        <View style={styles.quickTimeHeader}>
                            <Ionicons name="timer-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.quickTimeLabelSub}>From Now</Text>
                        </View>
                        <View style={styles.relativeTimeRow}>
                            {[1, 2, 3, 4].map((hours) => (
                                <TouchableOpacity
                                    key={hours}
                                    style={styles.relativeTimeBtn}
                                    onPress={() => {
                                        const newDate = new Date();
                                        newDate.setHours(newDate.getHours() + hours);
                                        newDate.setMinutes(0, 0, 0);
                                        setDate(newDate);
                                    }}
                                >
                                    <Text style={styles.relativeTimeText}>+{hours}H</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Manual Date/Time Pickers */}
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

                {/* Prize Details */}
                <View style={styles.card}>
                    <View style={styles.prizeHeader}>
                        <Text style={styles.cardHeader}>PRIZE DISTRIBUTION</Text>
                        <TouchableOpacity
                            onPress={() => handleChange('prizeDetails', "1st: \n2nd: \n3rd: ")}
                            style={styles.autoPopBtn}
                        >
                            <Ionicons name="flash-outline" size={14} color={COLORS.primary} />
                            <Text style={styles.autoPopText}>Auto 3 Rows</Text>
                        </TouchableOpacity>
                    </View>
                    <Input
                        icon="trophy-outline"
                        label="Prize Distribution Details"
                        value={formData.prizeDetails}
                        onChangeText={(t: string) => handleChange('prizeDetails', t)}
                        placeholder="e.g. 1st: 500, 2nd: 250, 3rd: 100"
                        multiline={true}
                        numberOfLines={4}
                    />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        onPress={() => setShowSaveModal(true)}
                        activeOpacity={0.8}
                        style={styles.saveTemplateBtn}
                    >
                        <Ionicons name="bookmark-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.saveTemplateText}>Save Template</Text>
                    </TouchableOpacity>
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

const Input = ({ label, value, onChangeText, placeholder, keyboardType, flex, icon, multiline, numberOfLines }: any) => (
    <View style={[styles.inputContainer, flex && { flex }]}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputWrapper, multiline && { height: 120, alignItems: 'flex-start', paddingTop: 12 }]}>
            <Ionicons name={icon} size={18} color={COLORS.textSecondary} style={[{ marginRight: 10 }, multiline && { marginTop: 2 }]} />
            <TextInput
                style={[styles.input, multiline && { textAlignVertical: 'top' }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textSecondary}
                keyboardType={keyboardType}
                multiline={multiline}
                numberOfLines={numberOfLines}
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
    prizeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    autoPopBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.background,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    autoPopText: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.primary,
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
    // Template Selector Styles
    templateSection: {
        marginBottom: 20,
    },
    templateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    templateLabel: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.text,
    },
    templateScroll: {
        gap: 10,
    },
    templateChip: {
        backgroundColor: COLORS.white,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        minWidth: 100,
    },
    templateChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    templateChipText: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    templateChipTextActive: {
        color: COLORS.white,
    },
    templateChipSub: {
        fontSize: 11,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    templateChipSubActive: {
        color: COLORS.white + 'CC',
    },
    // Action Row Styles
    actionRow: {
        marginBottom: 12,
    },
    saveTemplateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.white,
        borderRadius: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    saveTemplateText: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.primary,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    modalSubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: COLORS.textSecondary,
        marginBottom: 20,
    },
    modalInputWrapper: {
        backgroundColor: COLORS.background,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        height: 54,
        justifyContent: 'center',
        marginBottom: 20,
    },
    modalInput: {
        color: COLORS.text,
        fontFamily: 'Poppins_500Medium',
        fontSize: 15,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalCancelText: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.textSecondary,
    },
    modalSaveBtn: {
        flex: 2,
        height: 50,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSaveText: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.white,
    },
    // Quick Time Selector Styles
    quickTimeSection: {
        marginBottom: 16,
    },
    quickTimeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    quickTimeLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.primary,
    },
    quickTimeLabelSub: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
    },
    quickTimeScroll: {
        gap: 8,
    },
    quickTimeChip: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    quickTimeChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    quickTimeText: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    quickTimeTextActive: {
        color: COLORS.white,
    },
    relativeTimeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    relativeTimeBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    relativeTimeText: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.textSecondary,
    },
});
