import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@react-navigation/native';

import { AppColorSchemeProvider } from '@/components/AppColorSchemeProvider';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { MemberPrefetchProvider } from '@/components/member/MemberPrefetchProvider';
import { LibraryInfoProvider } from '@/components/library/LibraryInfoProvider';
import { RazorpayExpoGoCheckoutHost } from '@/components/payments/RazorpayExpoGoCheckoutHost';
import { applyClarityFontDefaults } from '@/lib/applyClarityFonts';
import { ClarityNavigationTheme } from '@/lib/clarityNavigationTheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Branding first (library story + Sign in); login only after user taps Sign in.
  initialRouteName: '(student)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (loaded) {
      applyClarityFontDefaults();
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppColorSchemeProvider>
        <RootLayoutNav />
      </AppColorSchemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  return (
    <>
      <StatusBar style="dark" />
      <ThemeProvider value={ClarityNavigationTheme}>
        <LibraryInfoProvider>
          <AuthProvider>
            <MemberPrefetchProvider>
              <RazorpayExpoGoCheckoutHost />
              <AuthedNavigator />
            </MemberPrefetchProvider>
          </AuthProvider>
        </LibraryInfoProvider>
      </ThemeProvider>
    </>
  );
}

function AuthedNavigator() {
  useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(student)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
