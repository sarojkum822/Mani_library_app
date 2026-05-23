import React, { useCallback, useRef } from 'react';
import { LayoutChangeEvent, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { rhythm } from '@/constants/Typography';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLibraryInfo } from '@/components/library/LibraryInfoProvider';
import { useMemberPrefetch } from '@/components/member/MemberPrefetchProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { type MembershipStatus } from '@/lib/api';
import { hasActiveMembership } from '@/lib/hasActiveMembership';
import { seatMapPlanIdForMarketingPlan } from '@/lib/marketingPlanSeatPreview';
import { displayPersonName } from '@/lib/formatPersonName';
import { openStudentProfileHub } from '@/lib/openStudentProfileHub';
import type { LibraryInfoJson } from '@/lib/libraryInfoTypes';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PublicGallerySection } from '@/components/public/PublicGallerySection';
import { TestimonialsSection } from '@/components/public/TestimonialsSection';

type SectionKey = 'facilities' | 'about' | 'plans' | 'gallery' | 'testimonials' | 'contact';

type LibraryPlan = LibraryInfoJson['plans'][number];

function facilityIconName(id: string): React.ComponentProps<typeof FontAwesome>['name'] {
  switch (id) {
    case 'ac':
      return 'snowflake-o';
    case '247':
      return 'clock-o';
    case 'wifi':
      return 'wifi';
    case 'power':
      return 'bolt';
    case 'lockers':
      return 'lock';
    case 'water':
      return 'tint';
    default:
      return 'circle-o';
  }
}

const SECTION_SCROLL_PAD = 12;

export function LandingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const lib = useLibraryInfo();
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const mp = useMemberPrefetch();
  const isStudentSignedIn = auth.status === 'signed_in' && auth.user.role === 'student';
  const isAdminSignedIn = auth.status === 'signed_in' && auth.user.role === 'admin';

  const membershipStatus: MembershipStatus | null =
    !isStudentSignedIn ? null : mp.loading ? null : mp.membership?.status ?? null;
  const memberHasActivePlan =
    isStudentSignedIn && !mp.loading && hasActiveMembership(mp.membership);
  const membershipHistoryCount =
    !isStudentSignedIn ? null : mp.loading ? null : mp.payments?.length ?? null;

  const isFirstTimeJoin =
    isStudentSignedIn &&
    membershipStatus === 'none' &&
    membershipHistoryCount != null &&
    membershipHistoryCount === 0;

  const memberDisplayName = isStudentSignedIn ? displayPersonName(auth.user.name, 'Member') : '';
  const memberLabel =
    isStudentSignedIn && memberDisplayName
      ? memberDisplayName.split(/\s+/)[0]!
      : isStudentSignedIn
        ? 'Member'
        : '';
  const memberInitials = isStudentSignedIn
    ? (memberDisplayName.slice(0, 2) || auth.user.email?.slice(0, 2) || 'ME').toUpperCase()
    : '';

  const scrollRef = useRef<ScrollView>(null);
  /** Y offset of each section within the ScrollView content (from onLayout). */
  const sectionOffsets = useRef<Partial<Record<SectionKey, number>>>({});

  const onSectionLayout = (key: SectionKey) => (e: LayoutChangeEvent) => {
    sectionOffsets.current[key] = e.nativeEvent.layout.y;
  };

  /** Full-width footer band (charcoal + brand wash); cards read as glass panels. */
  const footerTheme = React.useMemo(() => {
    const shell = '#252b35';
    return {
      shell,
      shellTopHairline: 'rgba(255,255,255,0.12)',
      gradientTop: 'rgba(1, 96, 208, 0.28)',
      title: 'rgba(255,255,255,0.96)',
      subtitle: 'rgba(255,255,255,0.58)',
      muted: 'rgba(255,255,255,0.5)',
      cardBg: 'rgba(255,255,255,0.07)',
      cardBorder: 'rgba(255,255,255,0.16)',
      divider: 'rgba(255,255,255,0.11)',
      chipBg: 'rgba(255,255,255,0.1)',
      chipBorder: 'rgba(255,255,255,0.22)',
      linkPillBg: 'rgba(1, 96, 208, 0.32)',
      linkPillText: '#E8F2FC',
      linkAccent: Colors[scheme].azure200,
      quickTileBg: 'rgba(255,255,255,0.08)',
      quickTileBorder: 'rgba(255,255,255,0.14)',
      markBg: 'rgba(1, 96, 208, 0.35)',
      markBorder: 'rgba(255,255,255,0.2)',
    };
  }, [scheme]);

  const scrollToSection = useCallback((key: SectionKey) => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const scrollToY = (y: number) => {
      scroll.scrollTo({ y: Math.max(y - SECTION_SCROLL_PAD, 0), animated: true });
    };

    const tryOnce = () => {
      const y = sectionOffsets.current[key];
      if (y == null) return false;
      scrollToY(y);
      return true;
    };

    if (!tryOnce()) {
      requestAnimationFrame(() => {
        tryOnce();
      });
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={['top', 'left', 'right']}>
      <View style={[styles.nav, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <BrandLogo variant="full" height={30} />
        {isAdminSignedIn ? (
          <Pressable
            onPress={() => router.push('/(admin)')}
            style={({ pressed }) => [
              styles.navAccount,
              { borderColor: c.border, backgroundColor: c.surfaceMuted },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.navAccountLabel, { color: c.ink900 }]}>Staff dashboard</Text>
            <FontAwesome name="chevron-right" size={12} color={c.ink400} />
          </Pressable>
        ) : isStudentSignedIn ? (
          <Pressable
            onPress={openStudentProfileHub}
            style={({ pressed }) => [
              styles.navAccount,
              { borderColor: c.border, backgroundColor: c.surfaceMuted },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
          >
            <View style={[styles.navAvatar, { backgroundColor: c.azure500 }]}>
              <Text style={styles.navAvatarText} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                {memberInitials}
              </Text>
            </View>
            <Text style={[styles.navAccountLabel, { color: c.ink900 }]} numberOfLines={1}>
              Hi, {memberLabel}
            </Text>
            <FontAwesome name="chevron-right" size={12} color={c.ink400} />
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Pressable onPress={() => router.push('/(auth)/login')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.navLink, { color: c.ink700 }]}>Sign in</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              style={({ pressed }) => [styles.navCta, { backgroundColor: c.azure500 }, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.navCtaText}>Join now</Text>
            </Pressable>
          </View>
        )}
      </View>

      {!isStudentSignedIn ? (
        <View style={[styles.guestRibbon, { backgroundColor: c.surfaceMuted, borderBottomColor: c.border }]}>
          <Text style={[styles.guestRibbonText, { color: c.ink600 }]}>
            Guest mode — scroll to membership plans below, or sign in for attendance and your account.
          </Text>
        </View>
      ) : mp.loading ? null : isFirstTimeJoin ? (
        <View style={[styles.guestRibbon, { backgroundColor: c.azure50, borderBottomColor: c.azure200 }]}>
          <Text style={[styles.guestRibbonText, { color: c.azure700 }]}>
            Welcome — you have not joined yet. Tap Join now below to pick a plan and choose your seat.
          </Text>
        </View>
      ) : membershipStatus === 'none' ? (
        <View style={[styles.guestRibbon, { backgroundColor: c.azure50, borderBottomColor: c.azure200 }]}>
          <Text style={[styles.guestRibbonText, { color: c.azure700 }]}>
            No active membership yet — use Complete membership below to choose a plan and finish setup.
          </Text>
        </View>
      ) : null}

      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ backgroundColor: c.surface }}>
          <View style={styles.heroBg}>
            <View style={[styles.gridOverlay, { borderColor: 'rgba(1,96,208,0.10)' }]} />
            <LinearGradient
              colors={['rgba(1,96,208,0.20)', 'rgba(1,96,208,0.00)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['transparent', 'rgba(255,252,248,0.5)']}
              locations={[0.4, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={styles.heroInner}>
            <View style={[styles.badge, { backgroundColor: c.azure50, borderColor: c.azure200 }]}>
              <View style={[styles.dot, { backgroundColor: c.azure500 }]} />
              <Text style={[styles.badgeText, { color: c.azure700 }]}>Open 24 / 7 in Madhubani</Text>
            </View>

            <Text style={[styles.h1, { color: c.ink900 }]}>
              A focused space to <Text style={{ color: c.azure500 }}>study, read, and grow.</Text>
            </Text>
            <Text style={[styles.lead, { color: c.ink600 }]}>{lib.shortDescription}</Text>

            <Text style={[styles.trustLine, { color: c.ink500 }]}>
              500+ members · 98% renewal · Rated 5★ · Open 24/7
            </Text>

            <View style={{ marginTop: 14, gap: 10, alignSelf: 'stretch', width: '100%' }}>
              <Button
                title={
                  isAdminSignedIn
                    ? 'Go to dashboard'
                    : !isStudentSignedIn
                      ? 'Reserve your seat'
                      : isFirstTimeJoin
                        ? 'Join now'
                        : membershipStatus === 'none'
                          ? 'Complete membership'
                          : membershipStatus === null
                            ? 'Membership'
                            : 'My membership'
                }
                onPress={() => {
                  if (isAdminSignedIn) {
                    router.push('/(admin)');
                    return;
                  }
                  if (!isStudentSignedIn) {
                    router.push('/(auth)/login');
                    return;
                  }
                  router.push(
                    membershipStatus === 'none'
                      ? '/(student)/membership/plans?intent=buy'
                      : '/(student)/membership',
                  );
                }}
              />
              <View style={styles.heroSecondaryRow}>
                <Button
                  title="View plans"
                  variant="secondary"
                  style={styles.heroSecondaryBtn}
                  onPress={() => scrollToSection('plans')}
                />
                <Button
                  title="Facilities"
                  variant="secondary"
                  style={styles.heroSecondaryBtn}
                  onPress={() => scrollToSection('facilities')}
                />
              </View>
            </View>

            <View style={styles.tagRow}>
              {[{ label: `Est. ${lib.established}` }, { label: `${lib.capacity} Seats` }, { label: '24 / 7' }].map(
                (t) => (
                  <View key={t.label} style={[styles.tag, { backgroundColor: c.ink50, borderColor: c.ink200 }]}>
                    <Text style={[styles.tagText, { color: c.ink500 }]}>{t.label}</Text>
                  </View>
                )
              )}
            </View>

            <View style={[styles.heroStatsCard, { borderColor: c.ink100, alignSelf: 'stretch', width: '100%' }]}>
              <View style={[styles.heroStatsGrid, { backgroundColor: c.ink100 }]}>
                {[{ label: 'Quiet zones', value: '8' }, { label: 'Cabins', value: '120' }, { label: 'Always open', value: '24/7' }].map(
                  (it, idx) => (
                    <View key={it.label} style={[styles.heroStatCell, { backgroundColor: c.surface }]}>
                      <Text style={[styles.heroStatValue, { color: c.azure500 }]}>{it.value}</Text>
                      <Text style={[styles.heroStatLabel, { color: c.ink500 }]}>{it.label}</Text>
                      {idx < 2 ? <View style={[styles.cellDivider, { backgroundColor: c.ink100 }]} /> : null}
                    </View>
                  )
                )}
              </View>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.statsWrap,
            { marginTop: 4, borderTopColor: c.ink100, borderBottomColor: c.ink100, backgroundColor: c.surfaceMuted },
          ]}
        >
          <View style={[styles.statsGrid, { backgroundColor: c.ink100 }]}>
            {[
              { value: '500+', label: 'Members' },
              { value: '120', label: 'Seats' },
              { value: '98%', label: 'Renewal rate' },
              { value: '5★', label: 'Rated by students' },
            ].map((s) => (
              <View key={s.label} style={[styles.statItem, { backgroundColor: c.surfaceMuted }]}>
                <Text style={[styles.statValue, { color: c.ink900 }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: c.ink500 }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          onLayout={onSectionLayout('facilities')}
          style={{ paddingHorizontal: 16, paddingTop: rhythm.sectionTop, backgroundColor: c.surface }}
        >
          <Text style={[styles.kicker, { color: c.azure500 }]}>Facilities</Text>
          <Text style={[styles.h2, { color: c.ink900 }]}>Everything you need to focus.</Text>
          <Text style={[styles.sectionP, { color: c.ink600 }]}>
            Thoughtfully designed for serious learners — from civil services aspirants to college students.
          </Text>

          <View style={styles.facGrid}>
            {lib.facilities.map((f) => (
              <View key={f.id} style={styles.facCell}>
                <Card style={styles.facCard}>
                  <View style={[styles.facIcon, { backgroundColor: c.azure50 }]}>
                    <FontAwesome name={facilityIconName(f.id)} size={19} color={c.azure500} />
                  </View>
                  <Text numberOfLines={2} style={[styles.facTitleGrid, { color: c.ink900 }]}>
                    {f.title}
                  </Text>
                </Card>
              </View>
            ))}
          </View>
        </View>

        <View
          onLayout={onSectionLayout('about')}
          style={{ paddingHorizontal: 16, paddingTop: rhythm.sectionTop, backgroundColor: c.surfaceMuted }}
        >
          <Text style={[styles.kicker, { color: c.azure500 }]}>About {lib.name}</Text>
          <Text style={[styles.h2, { color: c.ink900 }]}>A neighbourhood library, built for the next generation.</Text>

          <Card style={{ marginTop: 12, padding: 16 }}>
            <Text style={[styles.sectionP, { color: c.ink600, marginTop: 0 }]}>
              Founded in {lib.established} by {lib.owner.name}, {lib.name} focuses on the things that matter: clean
              air, dependable power, a comfortable seat, and a community that respects silence.
            </Text>

            <View style={[styles.aboutMetaRow, { borderTopColor: c.ink100 }]}>
              <View style={[styles.aboutMetaPill, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
                <Text style={[styles.aboutMetaLabel, { color: c.ink500 }]}>Founded</Text>
                <Text style={[styles.aboutMetaValue, { color: c.ink900 }]}>{lib.established}</Text>
              </View>
              <View style={[styles.aboutMetaPill, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
                <Text style={[styles.aboutMetaLabel, { color: c.ink500 }]}>Capacity</Text>
                <Text style={[styles.aboutMetaValue, { color: c.ink900 }]}>{lib.capacity}</Text>
              </View>
              <View style={[styles.aboutMetaPill, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
                <Text style={[styles.aboutMetaLabel, { color: c.ink500 }]}>Hours</Text>
                <Text numberOfLines={1} style={[styles.aboutMetaValue, { color: c.ink900 }]}>
                  24/7
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View
          onLayout={onSectionLayout('plans')}
          style={{ paddingHorizontal: 16, paddingTop: rhythm.sectionTop, backgroundColor: c.surface }}
        >
          <Text style={[styles.kicker, { color: c.azure500 }]}>Membership</Text>
          <Text style={[styles.h2, { color: c.ink900 }]}>Simple plans, no surprises.</Text>

          <View style={styles.planGrid}>
            {lib.plans.map((plan) => (
              <LandingPlanCard
                key={plan.id}
                plan={plan}
                currencySymbol={lib.currencySymbol}
                c={c}
                onChoose={() => {
                  if (!isStudentSignedIn) {
                    router.push('/(auth)/login');
                    return;
                  }
                  if (memberHasActivePlan) {
                    router.push({
                      pathname: '/(student)/membership/seat-map',
                      params: {
                        planId: seatMapPlanIdForMarketingPlan(plan.id),
                        preview: '1',
                      },
                    });
                    return;
                  }
                  router.push({
                    pathname: '/(student)/membership/plans',
                    params: { intent: 'buy', planId: plan.id },
                  });
                }}
                onMembershipDetails={
                  memberHasActivePlan
                    ? () => router.push('/(student)/membership')
                    : undefined
                }
                chooseLabel={
                  !isStudentSignedIn
                    ? `Sign in · ${plan.name}`
                    : memberHasActivePlan
                      ? 'View available seats'
                      : `Choose ${plan.name}`
                }
              />
            ))}
          </View>
        </View>

        <View
          onLayout={onSectionLayout('gallery')}
          style={{ paddingHorizontal: 16, paddingTop: rhythm.sectionTop, backgroundColor: c.surface }}
        >
          <Text style={[styles.kicker, { color: c.azure500 }]}>Gallery</Text>
          <Text style={[styles.h2, { color: c.ink900 }]}>Life at the library</Text>
          <Text style={[styles.sectionP, { color: c.ink600, marginBottom: 12 }]}>
            Photos from our study halls and community.
          </Text>
          <PublicGallerySection maxCount={8} />
        </View>

        <View
          onLayout={onSectionLayout('testimonials')}
          style={{ paddingHorizontal: 16, paddingTop: rhythm.sectionTop, backgroundColor: c.surfaceMuted }}
        >
          <Text style={[styles.kicker, { color: c.azure500 }]}>Testimonials</Text>
          <Text style={[styles.h2, { color: c.ink900 }]}>What members say</Text>
          <Text style={[styles.sectionP, { color: c.ink600, marginBottom: 12 }]}>
            Approved feedback from verified members.
          </Text>
          <TestimonialsSection />
        </View>

        <View onLayout={onSectionLayout('contact')} style={{ backgroundColor: c.surfaceMuted }}>
          <View style={{ paddingHorizontal: 16, paddingTop: rhythm.sectionTop }}>
            <Text style={[styles.kicker, { color: c.azure500 }]}>Get in touch</Text>
            <Text style={[styles.h2, { color: c.ink900 }]}>Visit us, or just say hello.</Text>
            <Text style={[styles.sectionP, { color: c.ink600 }]}>
              Drop by for a tour, or call us for any membership question. We reply quickly.
            </Text>

            <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
              <ContactItem
                icon="map-marker"
                title="Address"
                value={`${lib.address.line1}, ${lib.address.city}, ${lib.address.state} ${lib.address.pincode}`}
                onPress={() => Linking.openURL(lib.address.mapsUrl)}
              />
              <Divider />
              <ContactItem
                icon="phone"
                title="Phone"
                value={lib.contact.primaryPhone}
                onPress={() => Linking.openURL(`tel:${lib.contact.primaryPhone.replace(/\s/g, '')}`)}
              />
              <Divider />
              <ContactItem
                icon="envelope"
                title="Email"
                value={lib.contact.supportEmail}
                onPress={() => Linking.openURL(`mailto:${lib.contact.supportEmail}`)}
              />
              <Divider />
              <ContactItem icon="clock-o" title="Hours" value={lib.hours} />
            </Card>
          </View>

          <View
            style={[
              styles.footerShell,
              {
                backgroundColor: footerTheme.shell,
                borderTopColor: footerTheme.shellTopHairline,
              },
            ]}
          >
            <LinearGradient
              colors={[footerTheme.gradientTop, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={[styles.footerInner, { paddingBottom: Math.max(28, insets.bottom + 20) }]}>
              <View style={styles.footerBrandBlock}>
                <BrandLogo variant="full" height={40} />
                <View style={styles.footerMetaPills}>
                  <View style={[styles.footerMetaPill, { borderColor: footerTheme.quickTileBorder }]}>
                    <FontAwesome name="map-marker" size={10} color={footerTheme.linkAccent} />
                    <Text style={[styles.footerMetaPillText, { color: footerTheme.subtitle }]} numberOfLines={1}>
                      {lib.address.city}
                    </Text>
                  </View>
                  <View style={[styles.footerMetaPill, { borderColor: footerTheme.quickTileBorder }]}>
                    <FontAwesome name="clock-o" size={10} color={footerTheme.linkAccent} />
                    <Text style={[styles.footerMetaPillText, { color: footerTheme.subtitle }]} numberOfLines={1}>
                      {lib.hours.split('·')[0]?.trim() ?? '24/7'}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.footerKicker, { color: footerTheme.muted }]}>Quick actions</Text>
              <View style={styles.footerQuickRow}>
                <Pressable
                  onPress={() => Linking.openURL(lib.address.mapsUrl)}
                  style={({ pressed }) => [
                    styles.footerQuickTile,
                    { backgroundColor: footerTheme.quickTileBg, borderColor: footerTheme.quickTileBorder },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <FontAwesome name="map-o" size={18} color={footerTheme.linkAccent} />
                  <Text style={[styles.footerQuickLabel, { color: footerTheme.title }]}>Directions</Text>
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${lib.contact.primaryPhone.replace(/\s/g, '')}`)}
                  style={({ pressed }) => [
                    styles.footerQuickTile,
                    { backgroundColor: footerTheme.quickTileBg, borderColor: footerTheme.quickTileBorder },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <FontAwesome name="phone" size={18} color={footerTheme.linkAccent} />
                  <Text style={[styles.footerQuickLabel, { color: footerTheme.title }]}>Call desk</Text>
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL(`mailto:${lib.contact.supportEmail}`)}
                  style={({ pressed }) => [
                    styles.footerQuickTile,
                    { backgroundColor: footerTheme.quickTileBg, borderColor: footerTheme.quickTileBorder },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <FontAwesome name="envelope-o" size={18} color={footerTheme.linkAccent} />
                  <Text style={[styles.footerQuickLabel, { color: footerTheme.title }]}>Email</Text>
                </Pressable>
              </View>

              <View style={styles.footer}>
                <View style={styles.footerSectionHead}>
                  <FontAwesome name="user-circle" size={14} color={footerTheme.linkAccent} />
                  <Text style={[styles.footerSectionTitle, { color: footerTheme.title }]}>Library owner</Text>
                </View>
                <View
                  style={[
                    styles.footerInfoCard,
                    { backgroundColor: footerTheme.cardBg, borderColor: footerTheme.cardBorder },
                  ]}
                >
                  <View style={styles.footerPersonBlock}>
                    <Text style={[styles.footerPersonName, { color: footerTheme.title }]}>{lib.owner.name}</Text>
                    <Text style={[styles.footerPersonRole, { color: footerTheme.subtitle }]}>{lib.owner.role}</Text>
                    <View style={styles.footerPersonActions}>
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${lib.owner.phone.replace(/\s/g, '')}`)}
                        style={({ pressed }) => [
                          styles.footerChip,
                          {
                            borderColor: footerTheme.chipBorder,
                            backgroundColor: footerTheme.chipBg,
                          },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <FontAwesome name="phone" size={12} color={footerTheme.linkAccent} />
                        <Text style={[styles.footerChipText, { color: footerTheme.linkAccent }]}>Call</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => Linking.openURL(`mailto:${lib.owner.email}`)}
                        style={({ pressed }) => [
                          styles.footerChip,
                          {
                            borderColor: footerTheme.chipBorder,
                            backgroundColor: footerTheme.chipBg,
                          },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <FontAwesome name="envelope" size={12} color={footerTheme.linkAccent} />
                        <Text style={[styles.footerChipText, { color: footerTheme.linkAccent }]}>Email</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={[styles.footerSectionHead, { marginTop: 6 }]}>
                  <FontAwesome name="code" size={13} color={footerTheme.linkAccent} />
                  <Text style={[styles.footerSectionTitle, { color: footerTheme.title }]}>Website & app</Text>
                </View>
                <Text style={[styles.footerSectionSubtitle, { color: footerTheme.subtitle }]}>
                  {
                    "Contact us to design your website and mobile app—we built Mani Library's web and mobile experience."
                  }
                </Text>
                <View
                  style={[
                    styles.footerInfoCard,
                    { backgroundColor: footerTheme.cardBg, borderColor: footerTheme.cardBorder },
                  ]}
                >
                  {lib.developers.map((dev, index) => (
                    <View
                      key={dev.name}
                      style={[
                        styles.footerDevRow,
                        index > 0 && {
                          marginTop: 12,
                          paddingTop: 12,
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: footerTheme.divider,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.footerDevName, { color: footerTheme.title }]}>
                          {'creditName' in dev && dev.creditName ? dev.creditName : dev.name}
                        </Text>
                        <Text style={[styles.footerDevRole, { color: footerTheme.subtitle }]}>{dev.role}</Text>
                      </View>
                      <Pressable
                        onPress={() => Linking.openURL(dev.url)}
                        style={({ pressed }) => [
                          styles.footerLinkPill,
                          { backgroundColor: footerTheme.linkPillBg },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text style={[styles.footerLinkPillText, { color: footerTheme.linkPillText }]}>{dev.label}</Text>
                        <FontAwesome name="external-link" size={11} color={footerTheme.linkAccent} />
                      </Pressable>
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.footerLegal,
                    {
                      backgroundColor: 'rgba(0,0,0,0.22)',
                      borderColor: footerTheme.quickTileBorder,
                    },
                  ]}
                >
                  <Text style={[styles.footerLegalText, { color: footerTheme.muted }]} numberOfLines={2}>
                    © {new Date().getFullYear()} {lib.name}
                  </Text>
                  <Pressable
                    onPress={() => Linking.openURL(lib.contact.website)}
                    style={({ pressed }) => [styles.footerLegalCta, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={[styles.footerLegalLink, { color: footerTheme.linkAccent }]}>manilibrary.com</Text>
                    <FontAwesome name="angle-right" size={14} color={footerTheme.linkAccent} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LandingPlanCard({
  plan,
  currencySymbol,
  c,
  onChoose,
  onMembershipDetails,
  chooseLabel,
}: {
  plan: LibraryPlan;
  currencySymbol: string;
  c: typeof Colors.light;
  onChoose: () => void;
  onMembershipDetails?: () => void;
  chooseLabel: string;
}) {
  const popular = 'popular' in plan && Boolean(plan.popular);
  const durationShort = plan.duration.replace(/^per\s+/i, '');

  return (
    <Card
      style={{
        ...styles.planCard,
        borderColor: popular ? c.azure400 : c.border,
        borderWidth: popular ? 2 : StyleSheet.hairlineWidth,
        backgroundColor: c.surface,
      }}
    >
      {popular ? (
        <View style={[styles.planPopularBadge, { backgroundColor: c.azure500 }]}>
          <Text style={styles.planPopularText}>Most popular</Text>
        </View>
      ) : null}

      <View style={styles.planHoursRow}>
        <FontAwesome name="clock-o" size={12} color={c.ink500} />
        <Text style={[styles.planHours, { color: c.ink500 }]}>{plan.hours}</Text>
      </View>
      <Text style={[styles.planName, { color: c.ink900 }]}>{plan.name}</Text>
      <View style={styles.planPriceRow}>
        <Text style={[styles.planPrice, { color: c.ink900 }]}>
          {currencySymbol}
          {plan.price.toLocaleString('en-IN')}
        </Text>
        <Text style={[styles.planDuration, { color: c.ink500 }]}>/ {durationShort}</Text>
      </View>

      <View style={[styles.planFeatureList, { borderTopColor: c.ink100 }]}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.planFeatureRow}>
            <FontAwesome name="check" size={12} color={c.azure500} style={styles.planFeatureIcon} />
            <Text style={[styles.planFeatureText, { color: c.ink700 }]}>{feature}</Text>
          </View>
        ))}
      </View>

      <Button
        title={chooseLabel}
        variant={onMembershipDetails || popular ? 'primary' : 'secondary'}
        style={{ marginTop: 16 }}
        onPress={onChoose}
      />
      {onMembershipDetails ? (
        <>
          <Text style={[styles.planActiveHint, { color: c.ink500 }]}>
            Live hall map — payment stays hidden while your plan is active.
          </Text>
          <Pressable onPress={onMembershipDetails} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={[styles.planDetailsLink, { color: c.azure600 }]}>Membership details →</Text>
          </Pressable>
        </>
      ) : null}
    </Card>
  );
}

function ContactItem({
  icon,
  title,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  value: string;
  onPress?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.contactRow,
        { backgroundColor: c.surface },
        pressed && onPress ? { backgroundColor: c.surfaceSunken } : null,
      ]}
    >
      <View style={[styles.contactIcon, { backgroundColor: c.azure50 }]}>
        <FontAwesome name={icon} size={18} color={c.azure600} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.contactTitle, { color: c.ink500 }]}>{title}</Text>
        <Text numberOfLines={title === 'Address' ? 3 : 1} style={[styles.contactValue, { color: c.ink900 }]}>
          {value}
        </Text>
      </View>
      {onPress ? <FontAwesome name="chevron-right" size={14} color={c.ink400} /> : null}
    </Pressable>
  );
}

function Divider() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return <View style={{ height: 1, backgroundColor: c.ink100, marginLeft: 56 }} />;
}

const styles = StyleSheet.create({
  nav: {
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestRibbon: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  guestRibbonText: { fontSize: 12, fontWeight: '600', lineHeight: 17, textAlign: 'center' },
  navLink: { fontSize: 14, fontWeight: '500', paddingVertical: 8, paddingHorizontal: 8 },
  navCta: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 },
  navCtaText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  navAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '58%',
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
  },
  navAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  navAccountLabel: { flex: 1, fontSize: 14, fontWeight: '600', minWidth: 0 },

  heroBg: { height: 420, position: 'absolute', left: 0, right: 0, top: 0 },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderStyle: 'dotted',
  },
  heroInner: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18, alignItems: 'center' },

  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },

  h1: {
    marginTop: 14,
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: -0.6,
    lineHeight: 40,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  lead: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    alignSelf: 'stretch',
  },

  trustLine: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.2,
    alignSelf: 'center',
    paddingHorizontal: 12,
  },

  heroSecondaryRow: { flexDirection: 'row', gap: 10 },
  heroSecondaryBtn: { flex: 1 },

  tagRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  tagText: { fontSize: 10, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase' },

  heroStatsCard: { marginTop: 16, borderRadius: 20, borderWidth: 1, padding: 6 },
  heroStatsGrid: { borderRadius: 14, overflow: 'hidden', flexDirection: 'row', gap: 1 },
  heroStatCell: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatValue: { fontSize: 28, fontWeight: '600', letterSpacing: -0.3, textAlign: 'center' },
  heroStatLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  cellDivider: { position: 'absolute', right: -1, top: 0, bottom: 0, width: 1 },

  statsWrap: { marginTop: 8, borderTopWidth: 1, borderBottomWidth: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1 },
  statItem: {
    width: '49.6%',
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '600', textAlign: 'center' },
  statLabel: { marginTop: 4, fontSize: 12, fontWeight: '500', textAlign: 'center' },

  kicker: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase' },
  h2: { marginTop: 6, fontSize: 24, fontWeight: '600', letterSpacing: -0.4, lineHeight: 28 },
  sectionP: { marginTop: 10, fontSize: 14, lineHeight: 21 },

  facIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  facTitle: { marginTop: 12, fontSize: 16, fontWeight: '600' },
  facDesc: { marginTop: 6, fontSize: 13, lineHeight: 19 },

  facGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  facCell: { width: '33.3333%', paddingHorizontal: 6, paddingVertical: 6 },
  facCard: {
    padding: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 112,
  },
  facTitleGrid: { fontSize: 12, fontWeight: '500', textAlign: 'center', lineHeight: 16 },

  planGrid: { marginTop: 14, gap: 14 },
  planCard: { padding: 18, borderRadius: 18, overflow: 'visible' },
  planPopularBadge: {
    position: 'absolute',
    top: -10,
    left: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  planPopularText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#fff',
  },
  planHoursRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planHours: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase' },
  planName: { marginTop: 8, fontSize: 20, fontWeight: '600', letterSpacing: -0.3 },
  planPriceRow: { marginTop: 12, flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  planPrice: { fontSize: 32, fontWeight: '600', letterSpacing: -0.5 },
  planDuration: { fontSize: 14, fontWeight: '500' },
  planFeatureList: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 10 },
  planFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  planFeatureIcon: { marginTop: 2 },
  planFeatureText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  planActiveHint: { marginTop: 10, fontSize: 11, lineHeight: 16, textAlign: 'center', fontWeight: '500' },
  planDetailsLink: { marginTop: 8, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  aboutMetaRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  aboutMetaPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  aboutMetaLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  aboutMetaValue: { marginTop: 6, fontSize: 13, fontWeight: '600' },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contactIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactTitle: { fontSize: 10, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase' },
  contactValue: { marginTop: 6, fontSize: 13, fontWeight: '500', lineHeight: 18 },

  footerShell: {
    marginTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
  },
  footerInner: {
    paddingHorizontal: 16,
    paddingTop: 26,
  },
  footerBrandBlock: {
    gap: 12,
    alignItems: 'flex-start',
  },
  footerMetaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footerMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  footerMetaPillText: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  footerKicker: {
    marginTop: 22,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  footerQuickRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  footerQuickTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  footerQuickLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  footer: { marginTop: 24, gap: 14 },
  footerSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: -4,
  },
  footerSectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  footerSectionSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 2, marginBottom: 2 },
  footerInfoCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  footerPersonBlock: { gap: 4 },
  footerPersonName: { fontSize: 16, fontWeight: '600' },
  footerPersonRole: { fontSize: 13, lineHeight: 18 },
  footerPersonActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  footerChipText: { fontSize: 12, fontWeight: '600' },
  footerDevRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerDevName: { fontSize: 14, fontWeight: '600' },
  footerDevRole: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  footerLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  footerLinkPillText: { fontSize: 12, fontWeight: '600' },
  footerLegal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
  },
  footerLegalText: { fontSize: 12, fontWeight: '500', flex: 1, minWidth: 0 },
  footerLegalLink: { fontSize: 13, fontWeight: '700' },
  footerLegalCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

