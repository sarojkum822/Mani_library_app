import { Platform, ViewStyle } from 'react-native';

/** Clarity --shadow-card: 0 1px 2px @4%, 0 1px 3px @6% */
const SHADOW_INK = '#101828';

/** Cards / surfaces — Clarity UI shadow-card token (iOS + Android). */
export function cardElevation(): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 2 };
  }
  return {
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.06,
    shadowRadius: 2.5,
    shadowOffset: { width: 0, height: 1 },
  };
}

/** Clarity --shadow-card-hover */
export function cardElevationHover(): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 4 };
  }
  return {
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  };
}

/** Admin top bar — subtle separation above canvas */
export function headerElevation(): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 4 };
  }
  return {
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  };
}

/** Student tab bar — consistent lift above scene content */
export function tabBarElevation(): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 12 };
  }
  return {
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  };
}

/** Dropdown / modal panel — card-hover depth */
export function dropdownElevation(): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: 8 };
  }
  return {
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  };
}
