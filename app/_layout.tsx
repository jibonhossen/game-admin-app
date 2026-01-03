import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { COLORS } from '../src/constants/theme';
import { View, ActivityIndicator } from 'react-native';
import { AlertProvider } from '../src/contexts/AlertContext';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

function MainLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!user && inAuthGroup) {
      // Redirect to login if accessing protected route without user
      router.replace('/login');
    } else if (user && segments[0] === 'login') {
      // Redirect to dashboard if logged in and accessing login
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);

  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const MyLightTheme = {
    ...DarkTheme,
    dark: false,
    colors: {
      ...DarkTheme.colors,
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.text,
      border: COLORS.border,
      notification: COLORS.primary,
    },
  };

  return (
    <ThemeProvider value={MyLightTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.backgroundLight },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="match/[id]" options={{ title: 'Edit Match' }} />
        <Stack.Screen name="distribute/[id]" options={{ title: 'Distribute Prizes' }} />
        <Stack.Screen name="rules/index" options={{ headerShown: false }} />
        <Stack.Screen name="rules/create" options={{ headerShown: false }} />
        <Stack.Screen name="rules/[id]" options={{ headerShown: false }} />

      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </AlertProvider>
  );
}
