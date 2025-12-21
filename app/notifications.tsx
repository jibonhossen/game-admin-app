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
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../src/constants/theme';
import { notificationApi } from '../src/services/api';
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
            Alert.alert('Error', 'Please fill in both title and message');
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

                            console.log('Broadcast result:', result);

                            const stats = result.stats;
                            let alertMessage = `✅ Notification sent to all users!\n\n`;
                            alertMessage += `📱 Targeted tokens: ${stats?.targetedTokens || 0}\n`;
                            alertMessage += `✓ Successful: ${stats?.successful || 0}\n`;
                            alertMessage += `✗ Failed: ${stats?.failed || 0}`;

                            if (stats?.errors && stats.errors.length > 0) {
                                alertMessage += `\n\n⚠️ Errors:\n${stats.errors.slice(0, 3).join('\n')}`;
                            }

                            Alert.alert('Notification Sent', alertMessage);
                            setTitle('');
                            setBody('');
                            setImageUrl('');
                        } catch (error: any) {
                            console.error('Broadcast error:', error);
                            const errorMessage = error.response?.data?.error || error.message || 'Failed to send notification';
                            Alert.alert('Error', `Failed to send notification:\n\n${errorMessage}`);
                        } finally {
                            setSending(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <LinearGradient
                    colors={[COLORS.primaryDark, COLORS.background]}
                    style={styles.headerGradient}
                >
                    <View style={styles.iconWrapper}>
                        <Ionicons name="notifications" size={48} color={COLORS.primaryLight} />
                    </View>
                    <Text style={styles.headerTitle}>Broadcast Notification</Text>
                    <Text style={styles.headerSubtitle}>Send push notification to all registered users</Text>
                </LinearGradient>

                {/* Form */}
                <View style={styles.formContainer}>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                <Ionicons name="text" size={14} color={COLORS.primaryLight} /> Title
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Enter notification title..."
                                placeholderTextColor={COLORS.textSecondary}
                                maxLength={100}
                            />
                            <Text style={styles.charCount}>{title.length}/100</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                <Ionicons name="chatbubble-ellipses" size={14} color={COLORS.primaryLight} /> Message
                            </Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={body}
                                onChangeText={setBody}
                                placeholder="Enter your message..."
                                placeholderTextColor={COLORS.textSecondary}
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                                maxLength={500}
                            />
                            <Text style={styles.charCount}>{body.length}/500</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                <Ionicons name="image" size={14} color={COLORS.primaryLight} /> Banner Image (Optional)
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={imageUrl}
                                onChangeText={setImageUrl}
                                placeholder="https://example.com/image.jpg"
                                placeholderTextColor={COLORS.textSecondary}
                                autoCapitalize="none"
                                keyboardType="url"
                            />
                            <Text style={styles.hintText}>Add a banner image URL to show in the notification</Text>
                            {imageUrl.trim() ? (
                                <View style={styles.imagePreviewContainer}>
                                    <Image
                                        source={{ uri: imageUrl.trim() }}
                                        style={styles.imagePreview}
                                        resizeMode="cover"
                                    />
                                </View>
                            ) : null}
                        </View>

                        {/* Preview */}
                        {(title.trim() || body.trim()) && (
                            <View style={styles.previewContainer}>
                                <Text style={styles.previewLabel}>
                                    <Ionicons name="eye" size={14} color={COLORS.textSecondary} /> Preview
                                </Text>
                                <View style={styles.previewCard}>
                                    <View style={styles.previewHeader}>
                                        <View style={styles.appIcon}>
                                            <Ionicons name="game-controller" size={16} color="white" />
                                        </View>
                                        <Text style={styles.previewAppName}>GameZone</Text>
                                        <Text style={styles.previewTime}>now</Text>
                                    </View>
                                    <Text style={styles.previewTitle} numberOfLines={1}>
                                        {title.trim() || 'Notification Title'}
                                    </Text>
                                    <Text style={styles.previewBody} numberOfLines={2}>
                                        {body.trim() || 'Notification message will appear here...'}
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
                        )}

                        {/* Send Button */}
                        <TouchableOpacity
                            style={[styles.sendButton, sending && styles.disabledButton]}
                            onPress={handleSendToAll}
                            disabled={sending}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, COLORS.primaryDark]}
                                style={styles.gradientButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {sending ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="send" size={20} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.sendButtonText}>Send to All Users</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Warning */}
                        <View style={styles.warningContainer}>
                            <Ionicons name="warning" size={18} color="#f59e0b" />
                            <Text style={styles.warningText}>
                                This will send a notification to every user who has enabled push notifications.
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerGradient: {
        paddingTop: 40,
        paddingBottom: 50,
        paddingHorizontal: SPACING.m,
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    iconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    formContainer: {
        padding: SPACING.m,
        marginTop: -30,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: COLORS.text,
        fontWeight: '600',
        marginBottom: 8,
        fontSize: 14,
    },
    input: {
        backgroundColor: COLORS.background,
        color: COLORS.text,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        fontSize: 16,
    },
    textArea: {
        height: 120,
        paddingTop: 14,
    },
    charCount: {
        color: COLORS.textSecondary,
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
    previewContainer: {
        marginBottom: 20,
    },
    previewLabel: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginBottom: 8,
    },
    previewCard: {
        backgroundColor: '#1a1a2e',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    appIcon: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    previewAppName: {
        color: COLORS.textSecondary,
        fontSize: 12,
        flex: 1,
    },
    previewTime: {
        color: COLORS.textSecondary,
        fontSize: 11,
    },
    previewTitle: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
    },
    previewBody: {
        color: COLORS.textSecondary,
        fontSize: 13,
    },
    sendButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    gradientButton: {
        flexDirection: 'row',
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.7,
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 12,
        borderRadius: 10,
        gap: 10,
    },
    warningText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
    hintText: {
        color: COLORS.textSecondary,
        fontSize: 11,
        marginTop: 4,
        fontStyle: 'italic',
    },
    imagePreviewContainer: {
        marginTop: 12,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    imagePreview: {
        width: '100%',
        height: 150,
        backgroundColor: COLORS.background,
    },
    previewImage: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        marginTop: 8,
    },
});
