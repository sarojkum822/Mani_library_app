import * as Haptics from 'expo-haptics';

/** Light impact — never throws; no-op if haptics unavailable (simulator, web, missing native build). */
export function hapticLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
