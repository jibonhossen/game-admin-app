import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, RefreshControl, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../src/constants/theme';
import { authApi, matchApi } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../src/contexts/AlertContext';
import { LinearGradient } from 'expo-linear-gradient';

interface SubAdmin {
    id: string;
    username: string;
    name: string;
    allowedCategories: string[];
    created_at: string;
}

export default function CreateSubAdminScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: ''
    });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // Edit modal state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<SubAdmin | null>(null);
    const [editCategories, setEditCategories] = useState<string[]>([]);
    const [updating, setUpdating] = useState(false);

    // Delete confirmation state
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletingAdmin, setDeletingAdmin] = useState<SubAdmin | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [subadminData, configData] = await Promise.all([
                authApi.getSubAdmins(),
                matchApi.getMatchConfig()
            ]);
            setSubAdmins(subadminData || []);
            // Extract categories from config
            if (configData?.category) {
                setCategories(configData.category.map((c: any) => c.value));
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const toggleEditCategory = (category: string) => {
        setEditCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleSubmit = async () => {
        if (!formData.username || !formData.password || !formData.name) {
            showAlert({ title: 'Error', message: 'Please fill in all fields', type: 'error' });
            return;
        }

        try {
            setLoading(true);
            await authApi.createSubAdmin({
                username: formData.username,
                password: formData.password,
                name: formData.name,
                allowedCategories: selectedCategories
            });
            showAlert({
                title: 'Success',
                message: 'Sub-Admin account created successfully',
                type: 'success',
                onConfirm: () => {
                    setFormData({ username: '', password: '', name: '' });
                    setSelectedCategories([]);
                    fetchData();
                }
            });
        } catch (error: any) {
            const errData = error.response?.data?.error;
            const msg = typeof errData === 'string' ? errData : errData?.message || error.message || 'Failed to create sub-admin';
            showAlert({ title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (admin: SubAdmin) => {
        setEditingAdmin(admin);
        setEditCategories(admin.allowedCategories || []);
        setEditModalVisible(true);
    };

    const handleUpdate = async () => {
        if (!editingAdmin) return;

        try {
            setUpdating(true);
            await authApi.updateSubAdmin(editingAdmin.id, {
                allowedCategories: editCategories
            });
            showAlert({
                title: 'Success',
                message: 'Permissions updated successfully',
                type: 'success'
            });
            setEditModalVisible(false);
            setEditingAdmin(null);
            fetchData();
        } catch (error: any) {
            const errData = error.response?.data?.error;
            const msg = typeof errData === 'string' ? errData : errData?.message || error.message || 'Failed to update';
            showAlert({ title: 'Error', message: msg, type: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    const openDeleteModal = (admin: SubAdmin) => {
        setDeletingAdmin(admin);
        setDeleteModalVisible(true);
    };

    const handleDelete = async () => {
        if (!deletingAdmin) return;

        try {
            setDeleting(true);
            await authApi.deleteSubAdmin(deletingAdmin.id);
            showAlert({
                title: 'Deleted',
                message: 'Sub-Admin account has been deleted',
                type: 'success'
            });
            setDeleteModalVisible(false);
            setDeletingAdmin(null);
            fetchData();
        } catch (error: any) {
            const errData = error.response?.data?.error;
            const msg = typeof errData === 'string' ? errData : errData?.message || error.message || 'Failed to delete';
            showAlert({ title: 'Error', message: msg, type: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const renderInput = (label: string, field: string, placeholder: string, secure = false) => (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    value={(formData as any)[field]}
                    onChangeText={(text) => handleChange(field, text)}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textSecondary}
                    secureTextEntry={secure}
                    autoCapitalize="none"
                />
            </View>
        </View>
    );

    const renderCategoryChips = (selected: string[], onToggle: (cat: string) => void) => (
        <View style={styles.categoryContainer}>
            {categories.map((category) => (
                <TouchableOpacity
                    key={category}
                    style={[
                        styles.categoryChip,
                        selected.includes(category) && styles.categoryChipActive
                    ]}
                    onPress={() => onToggle(category)}
                >
                    <Ionicons
                        name={selected.includes(category) ? "checkmark-circle" : "ellipse-outline"}
                        size={18}
                        color={selected.includes(category) ? COLORS.white : COLORS.textSecondary}
                    />
                    <Text style={[
                        styles.categoryChipText,
                        selected.includes(category) && styles.categoryChipTextActive
                    ]}>
                        {category}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* Edit Modal */}
            <Modal
                visible={editModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Ionicons name="settings" size={24} color={COLORS.primary} />
                            <Text style={styles.modalTitle}>Edit Permissions</Text>
                        </View>
                        <Text style={styles.modalSubtitle}>
                            {editingAdmin?.name} ({editingAdmin?.username})
                        </Text>

                        <Text style={styles.modalLabel}>Allowed Game Modes</Text>
                        {editCategories.length === 0 && (
                            <Text style={styles.allAccessText}>
                                <Ionicons name="information-circle" size={14} /> No selection = All modes accessible
                            </Text>
                        )}
                        {renderCategoryChips(editCategories, toggleEditCategory)}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={handleUpdate}
                                disabled={updating}
                            >
                                {updating ? (
                                    <ActivityIndicator color={COLORS.white} size="small" />
                                ) : (
                                    <Text style={styles.modalSaveText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalHeader, { justifyContent: 'center' }]}>
                            <View style={styles.deleteIconWrapper}>
                                <Ionicons name="trash" size={32} color={COLORS.danger} />
                            </View>
                        </View>
                        <Text style={[styles.modalTitle, { textAlign: 'center', marginTop: 16 }]}>
                            Delete Sub-Admin?
                        </Text>
                        <Text style={[styles.modalSubtitle, { textAlign: 'center', marginTop: 8 }]}>
                            Are you sure you want to delete{'\n'}
                            <Text style={{ fontFamily: FONTS.bold }}>{deletingAdmin?.name}</Text>?
                        </Text>
                        <Text style={styles.deleteWarning}>
                            This action cannot be undone. The sub-admin will be logged out immediately.
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <ActivityIndicator color={COLORS.white} size="small" />
                                ) : (
                                    <Text style={styles.deleteBtnText}>Delete</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Create New Sub-Admin</Text>
                    <Text style={styles.subtitle}>Fill in the details to create a restricted admin account.</Text>
                </View>

                <View style={styles.formCard}>
                    {renderInput('Username (Phone/ID)', 'username', 'e.g. 01700000000')}
                    {renderInput('Full Name', 'name', 'e.g. Rakib Hassan')}
                    {renderInput('Password', 'password', 'Enter secure password', true)}

                    {/* Category Selection */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Allowed Game Modes</Text>
                        <Text style={styles.helperText}>
                            Leave empty to allow all modes, or select specific modes
                        </Text>
                        {renderCategoryChips(selectedCategories, toggleCategory)}
                    </View>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        style={styles.submitBtnWrapper}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryDark]}
                            style={styles.submitBtn}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.submitBtnText}>Create Account</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Active Sub-Admins</Text>
                <View style={styles.listCard}>
                    {subAdmins.length === 0 ? (
                        <Text style={styles.emptyText}>No active sub-admins found.</Text>
                    ) : (
                        subAdmins.map((admin: SubAdmin, index) => (
                            <View
                                key={admin.id}
                                style={[
                                    styles.listItem,
                                    index === subAdmins.length - 1 && { borderBottomWidth: 0 }
                                ]}
                            >
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {admin.username && admin.username.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{admin.name}</Text>
                                    <Text style={styles.itemUsername}>{admin.username}</Text>
                                    {/* Show allowed categories */}
                                    <View style={styles.badgeRow}>
                                        {admin.allowedCategories && admin.allowedCategories.length > 0 ? (
                                            admin.allowedCategories.map((cat) => (
                                                <View key={cat} style={styles.modeBadge}>
                                                    <Text style={styles.modeBadgeText}>{cat}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <View style={[styles.modeBadge, styles.allModeBadge]}>
                                                <Text style={[styles.modeBadgeText, styles.allModeBadgeText]}>All Modes</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={styles.editBtn}
                                        onPress={() => openEditModal(admin)}
                                    >
                                        <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteIconBtn}
                                        onPress={() => openDeleteModal(admin)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    formCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
        gap: 20,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    helperText: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: -4,
    },
    inputWrapper: {
        backgroundColor: COLORS.background,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 54,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    input: {
        fontSize: 16,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    categoryChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    categoryChipText: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    categoryChipTextActive: {
        color: COLORS.white,
    },
    submitBtnWrapper: {
        marginTop: 10,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    submitBtn: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 16,
    },
    listCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.secondary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.secondary,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 15,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 2,
    },
    itemUsername: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
    },
    modeBadge: {
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    modeBadgeText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    allModeBadge: {
        backgroundColor: COLORS.success + '15',
    },
    allModeBadgeText: {
        color: COLORS.success,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    editBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.danger + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        fontFamily: FONTS.medium,
        padding: 20,
    },
    // Modal styles
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
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    modalSubtitle: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        marginTop: 4,
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 8,
    },
    allAccessText: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.primary,
        marginBottom: 8,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    modalCancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalCancelText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
    },
    modalSaveBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSaveText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
    deleteIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.danger + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteWarning: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.danger,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 18,
    },
    deleteBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.danger,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteBtnText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
});
