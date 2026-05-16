import { Platform, ViewStyle } from 'react-native';

/** Cards / surfaces — Clarity UI shadow-card token (iOS + Android). */
export function cardElevation(): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 2 };
  }
  return {
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  };
}

/** Slightly lifted card on press/hover contexts. */
export function cardElevationHover(): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 4 };
  }
  return {
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  };
}

/** Admin top bar — same separation on iOS (shadow) and Android (elevation) */
export function headerElevation(): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 8 };
  }
  return {
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  };
}

/** Student tab bar — consistent lift above scene content */
export function tabBarElevation(): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 12 };
  }
  return {
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  };
}
