import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONTS } from '../src/constants/theme';
import { authApi } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../src/contexts/AlertContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function CreateSubAdminScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [subAdmins, setSubAdmins] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: ''
    });

    useEffect(() => {
        fetchSubAdmins();
    }, []);

    const fetchSubAdmins = async () => {
        try {
            const data = await authApi.getSubAdmins();
            setSubAdmins(data || []);
        } catch (error) {
            console.error('Failed to fetch subadmins', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchSubAdmins();
        setRefreshing(false);
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
                role: 'subadmin' // Default role
            });
            showAlert({
                title: 'Success',
                message: 'Sub-Admin account created successfully',
                type: 'success',
                onConfirm: () => {
                    setFormData({ username: '', password: '', name: '' });
                    fetchSubAdmins();
                }
            });
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to create sub-admin';
            showAlert({ title: 'Error', message: msg, type: 'error' });
        } finally {
            setLoading(false);
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

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
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
                        subAdmins.map((admin: any, index) => (
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
                                    <Text style={styles.itemDate}>
                                        Created: {new Date(admin.created_at).toLocaleDateString()}
                                    </Text>
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
    itemDate: {
        fontSize: 11,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        fontFamily: FONTS.medium,
        padding: 20,
    },
});
