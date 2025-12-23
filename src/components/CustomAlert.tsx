import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Modal,
    Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
    FadeIn,
    FadeOut,
    ZoomIn,
    ZoomOut,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm?: () => void;
    onCancel?: () => void;
    onClose: () => void;
    confirmText?: string;
    cancelText?: string;
}

export const CustomAlert = ({
    visible,
    title,
    message,
    type = 'info',
    onConfirm,
    onCancel,
    onClose,
    confirmText = 'OK',
    cancelText = 'Cancel'
}: CustomAlertProps) => {

    const getIcon = () => {
        switch (type) {
            case 'success': return { name: 'checkmark-circle', color: COLORS.success };
            case 'error': return { name: 'alert-circle', color: COLORS.error };
            case 'warning': return { name: 'warning', color: '#f59e0b' };
            case 'confirm': return { name: 'help-circle', color: COLORS.primary };
            default: return { name: 'information-circle', color: COLORS.primary };
        }
    };

    const icon = getIcon();

    const handleConfirm = () => {
        onConfirm?.();
        onClose();
    };

    const handleCancel = () => {
        onCancel?.();
        onClose();
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    style={StyleSheet.absoluteFill}
                >
                    <Pressable style={styles.backdrop} onPress={onClose}>
                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    </Pressable>
                </Animated.View>

                <Animated.View
                    entering={ZoomIn.springify()}
                    exiting={ZoomOut}
                    style={styles.alertContainer}
                >
                    <View style={styles.iconContainer}>
                        <View style={[styles.iconBg, { backgroundColor: icon.color + '15' }]}>
                            <Ionicons name={icon.name as any} size={40} color={icon.color} />
                        </View>
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {type === 'confirm' && (
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={handleCancel}
                            >
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton, { backgroundColor: icon.color }]}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        flex: 1,
    },
    alertContainer: {
        width: width * 0.85,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 20,
    },
    iconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButton: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmButtonText: {
        fontSize: 15,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
    cancelButton: {
        backgroundColor: '#f1f5f9',
    },
    cancelButtonText: {
        fontSize: 15,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
});
