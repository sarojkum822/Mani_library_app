import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import libraryInfo from '@/data/libraryInfo.json';
import { FONT_MONO, FONT_SANS } from '@/constants/Fonts';

const BULLETS = [
  'Secure sign-in with email',
  'Reset your password on the website',
  'Member home for your device user id and details',
  'More library tools roll out step by step',
] as const;

export function AuthMarketingPanel() {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#101828', '#0B1220', '#101828']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(1,96,208,0.55)', 'transparent', 'rgba(1,96,208,0.35)']}
        start={{ x: 0.8, y: 0.1 }}
        end={{ x: 0.2, y: 0.9 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.inner}>
        <Text style={styles.brandKicker}>{libraryInfo.name}</Text>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Your account</Text>
          <Text style={styles.headline}>
            Sign in to access your member area and library tools as we roll them out.
          </Text>
          <View style={styles.bullets}>
            {BULLETS.map((line) => (
              <View key={line} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsKicker}>At a glance</Text>
          <View style={styles.statsRow}>
            <Stat value={String(libraryInfo.capacity)} label="Seats" />
            <Stat value="24/7" label="Open" />
            <Stat value="500+" label="Members" />
          </View>
        </View>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 28,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 280,
  },
  inner: { padding: 22, gap: 20 },
  brandKicker: {
    fontFamily: FONT_MONO.regular,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#CCE1F7',
  },
  copy: { gap: 10 },
  eyebrow: {
    fontFamily: FONT_SANS.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#99C3EF',
  },
  headline: {
    fontFamily: FONT_SANS.semibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: '#fff',
  },
  bullets: { marginTop: 6, gap: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#66A6E7',
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONT_SANS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: '#E1E6EE',
  },
  statsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
  },
  statsKicker: {
    fontFamily: FONT_MONO.regular,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#CCE1F7',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: {
    fontFamily: FONT_MONO.semibold,
    fontSize: 22,
    letterSpacing: -0.5,
    color: '#fff',
  },
  statLabel: {
    marginTop: 4,
    fontFamily: FONT_MONO.regular,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#98A2B3',
  },
});
