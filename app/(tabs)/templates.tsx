import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { COLORS, SPACING } from '../../src/constants/theme';
import { templateApi, MatchTemplate } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../src/contexts/AlertContext';

export default function TemplatesScreen() {
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<MatchTemplate[]>([]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await templateApi.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to fetch templates', error);
            showAlert({ title: 'Error', message: 'Failed to load templates', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTemplates();
        }, [])
    );

    const handleDelete = (template: MatchTemplate) => {
        showAlert({
            title: 'Delete Template',
            message: `Are you sure you want to delete "${template.name}"?`,
            type: 'confirm',
            onConfirm: async () => {
                try {
                    await templateApi.delete(template.id);
                    setTemplates(prev => prev.filter(t => t.id !== template.id));
                    showAlert({ title: 'Success', message: 'Template deleted', type: 'success' });
                } catch (error) {
                    showAlert({ title: 'Error', message: 'Failed to delete template', type: 'error' });
                }
            }
        });
    };

    const getMatchTypeIcon = (type: string) => {
        switch (type) {
            case 'Solo': return 'person';
            case 'Duo': return 'people';
            case 'Squad': return 'people-circle';
            default: return 'game-controller';
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Match Templates</Text>
                <Text style={styles.headerSub}>Save time with reusable match configurations</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : templates.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="document-text-outline" size={48} color={COLORS.border} />
                    </View>
                    <Text style={styles.emptyTitle}>No Templates Yet</Text>
                    <Text style={styles.emptyText}>
                        Create a template from the Matches tab by filling out a match and tapping "Save as Template"
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {templates.map((template) => (
                        <View key={template.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={styles.iconBadge}>
                                        <Ionicons name={getMatchTypeIcon(template.matchType)} size={16} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.cardTitleContent}>
                                        <Text style={styles.templateName}>{template.name}</Text>
                                        <Text style={styles.templateTitle}>{template.title}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleDelete(template)}
                                    style={styles.deleteBtn}
                                >
                                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.detailsGrid}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Type</Text>
                                    <Text style={styles.detailValue}>{template.matchType}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Map</Text>
                                    <Text style={styles.detailValue}>{template.map}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Entry</Text>
                                    <Text style={styles.detailValue}>৳{template.entryFee}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Prize</Text>
                                    <Text style={styles.detailValue}>৳{template.prizePool}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Slots</Text>
                                    <Text style={styles.detailValue}>{template.totalSlots}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Per Kill</Text>
                                    <Text style={styles.detailValue}>৳{template.perKill}</Text>
                                </View>
                            </View>

                            <View style={styles.cardFooter}>
                                <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                                <Text style={styles.createdAt}>
                                    Created {new Date(template.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: 20,
        paddingBottom: 0,
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
        marginTop: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        flex: 1,
        padding: 20,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitleContent: {
        flex: 1,
    },
    templateName: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    templateTitle: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.error + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 14,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    detailItem: {
        width: '30%',
        backgroundColor: COLORS.background,
        borderRadius: 10,
        padding: 10,
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 10,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
        marginTop: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        gap: 4,
    },
    createdAt: {
        fontSize: 11,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.textSecondary,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
