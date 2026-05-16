import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppColorSchemeProvider } from '@/components/AppColorSchemeProvider';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { MemberPrefetchProvider } from '@/components/member/MemberPrefetchProvider';
import { LibraryInfoProvider } from '@/components/library/LibraryInfoProvider';
import { RazorpayExpoGoCheckoutHost } from '@/components/payments/RazorpayExpoGoCheckoutHost';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Branding first (library story + Sign in); login only after user taps Sign in.
  initialRouteName: '(student)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  /** Never leave the native splash up forever (fonts slow/fail on some devices, or dev client waiting). */
  useEffect(() => {
    const failSafe = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 12_000);
    return () => clearTimeout(failSafe);
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  // Wait for fonts unless they failed — then continue with system fonts so the app still opens.
  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppColorSchemeProvider>
        <RootLayoutNav />
      </AppColorSchemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  return (
    <>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <ThemeProvider value={DefaultTheme}>
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
