import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../../src/constants/theme';
import { notificationApi } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotificationsPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [sending, setSending] = useState(false);

    const handleSendToAll = async () => {
        if (!title.trim() || !body.trim()) {
            Alert.alert('Required', 'Please fill in both title and message.');
            return;
        }

        Alert.alert(
            'Confirm Broadcast',
            'Are you sure you want to send this notification to ALL users?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send to All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSending(true);
                            const result = await notificationApi.sendNotification({
                                title: title.trim(),
                                body: body.trim(),
                                imageUrl: imageUrl.trim() || undefined,
                                targetType: 'all',
                            });

                            const stats = result.stats;
                            let alertMessage = `✅ Broadcast successful!\n\n`;
                            alertMessage += `📱 Targeted: ${stats?.targetedTokens || 0}\n`;
                            alertMessage += `✓ Success: ${stats?.successful || 0}\n`;
                            alertMessage += `✗ Failed: ${stats?.failed || 0}`;

                            Alert.alert('Broadcast Completed', alertMessage);
                            setTitle('');
                            setBody('');
                            setImageUrl('');
                        } catch (error: any) {
                            const errorMessage = error.response?.data?.error || error.message || 'Failed to send notification';
                            Alert.alert('Broadcast Error', errorMessage);
                        } finally {
                            setSending(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <StatusBar barStyle="dark-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                <View style={styles.headerBlock}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="megaphone-outline" size={32} color={COLORS.primary} />
                    </View>
                    <View>
                        <Text style={styles.mainTitle}>Direct Broadcast</Text>
                        <Text style={styles.subTitle}>Push alerts to all active players</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardLabel}>COMPOSE MESSAGE</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Title</Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Enter notification title..."
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Message Body</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={body}
                            onChangeText={setBody}
                            placeholder="Type your message here..."
                            placeholderTextColor={COLORS.textSecondary}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Banner URL <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>(Optional)</Text></Text>
                        <TextInput
                            style={styles.input}
                            value={imageUrl}
                            onChangeText={setImageUrl}
                            placeholder="https://example.com/promo.jpg"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="url"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Live Preview */}
                <View style={styles.previewContainer}>
                    <View style={styles.previewHeader}>
                        <Ionicons name="eye" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.previewHeaderText}>LIVE PREVIEW</Text>
                    </View>

                    <View style={styles.previewCard}>
                        <View style={styles.previewTop}>
                            <View style={styles.appIcon}>
                                <Ionicons name="game-controller" size={14} color={COLORS.white} />
                            </View>
                            <Text style={styles.appName}>GAMEZONE</Text>
                            <Text style={styles.timeText}>now</Text>
                        </View>

                        <View style={styles.previewContent}>
                            <Text style={styles.previewTitle} numberOfLines={1}>
                                {title.trim() || 'Notification Title'}
                            </Text>
                            <Text style={styles.previewBody} numberOfLines={2}>
                                {body.trim() || 'Your message will appear here when you type...'}
                            </Text>
                            {imageUrl.trim() ? (
                                <Image
                                    source={{ uri: imageUrl.trim() }}
                                    style={styles.previewImage}
                                    resizeMode="cover"
                                />
                            ) : null}
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleSendToAll}
                    disabled={sending}
                    style={styles.sendButtonContainer}
                >
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sendButton}
                    >
                        {sending ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <>
                                <Text style={styles.sendText}>Broadcast to All</Text>
                                <Ionicons name="paper-plane" size={18} color={COLORS.white} />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.warningBox}>
                    <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                    <Text style={styles.warningText}>
                        This action is irreversible and sends alerts to all registered devices. Use wisely.
                    </Text>
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
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    headerBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    headerIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    mainTitle: {
        fontSize: 22,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.text,
    },
    subTitle: {
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
    },
    cardLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.primary,
        letterSpacing: 1,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: 14,
        padding: 14,
        fontSize: 15,
        fontFamily: 'Poppins_500Medium',
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    textArea: {
        height: 100,
        paddingTop: 14,
    },
    previewContainer: {
        marginBottom: 24,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    previewHeaderText: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    previewCard: {
        backgroundColor: '#1E293B',
        borderRadius: 20,
        padding: 16,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    previewTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    appIcon: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appName: {
        fontSize: 12,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.white,
        flex: 1,
        letterSpacing: 0.5,
    },
    timeText: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: COLORS.textSecondary,
    },
    previewContent: {
        gap: 4,
    },
    previewTitle: {
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.white,
    },
    previewBody: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        color: '#94A3B8',
        lineHeight: 18,
    },
    previewImage: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        marginTop: 10,
    },
    sendButtonContainer: {
        marginBottom: 20,
    },
    sendButton: {
        height: 60,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        elevation: 6,
    },
    sendText: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        color: COLORS.white,
    },
    warningBox: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.1)',
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
});
