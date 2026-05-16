import { router } from 'expo-router';

/**
 * Opens the Profile tab hub (avatar menu + account list).
 * Same destination as the bottom tab — resets nested screens (details, doc, etc.).
 */
export function openStudentProfileHub(): void {
  router.replace('/(student)/profile');
}
