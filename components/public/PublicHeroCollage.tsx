import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';
import { api, type GalleryImage, type PublicHeroSettings, type PublicHeroSlot } from '@/lib/api';
import {
  PUBLIC_GALLERY_CACHE_KEY,
  PUBLIC_HERO_CACHE_KEY,
  readPublicCache,
  writePublicCache,
} from '@/lib/publicContentCache';

type Props = {
  style?: ViewStyle;
};

function slotIcon(slot: 1 | 2 | 3): React.ComponentProps<typeof FontAwesome>['name'] {
  if (slot === 1) return 'users';
  if (slot === 2) return 'clock-o';
  return 'wifi';
}

function mergeGalleryFallback(hero: PublicHeroSettings, galleryUrls: string[]): PublicHeroSettings {
  const slots = hero.slots.map((s) => ({ ...s }));
  let gi = 0;
  for (const slot of slots) {
    if (!slot.imageUrl && galleryUrls[gi]) {
      slot.imageUrl = galleryUrls[gi];
      gi += 1;
    }
  }
  return { slots };
}

function CaptionPill({ slot, tagline, taglineSub }: { slot: 1 | 2 | 3; tagline: string | null; taglineSub: string | null }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  if (!tagline?.trim() && !taglineSub?.trim()) return null;

  return (
    <View style={[styles.captionPill, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}>
      <View style={[styles.captionIcon, { backgroundColor: c.azure50 }]}>
        <FontAwesome name={slotIcon(slot)} size={12} color={c.azure500} />
      </View>
      <View style={styles.captionText}>
        {tagline?.trim() ? (
          <Text style={[styles.captionTitle, { color: c.ink900 }]} numberOfLines={1}>
            {tagline}
          </Text>
        ) : null}
        {taglineSub?.trim() ? (
          <Text style={[styles.captionSub, { color: c.ink500 }]} numberOfLines={1}>
            {taglineSub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PhotoTile({ imageUrl, tall }: { imageUrl: string; tall?: boolean }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View style={[styles.tileFrame, tall ? styles.tileTall : styles.tileShort, { borderColor: c.ink100, backgroundColor: c.ink50 }]}>
      <Image source={{ uri: imageUrl }} style={styles.tileImg} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}

export function PublicHeroCollage({ style }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const cachedHero = readPublicCache<PublicHeroSettings>(PUBLIC_HERO_CACHE_KEY);
  const [hero, setHero] = useState<PublicHeroSettings | null>(cachedHero);
  const [visible, setVisible] = useState(() => Boolean(cachedHero?.slots.some((s) => s.imageUrl)));

  const load = useCallback(async () => {
    try {
      const [heroData, gallery] = await Promise.all([api.publicHero(), api.publicGallery()]);
      writePublicCache(PUBLIC_HERO_CACHE_KEY, heroData);
      writePublicCache(PUBLIC_GALLERY_CACHE_KEY, gallery);
      const galleryUrls = gallery.map((g) => g.url).filter(Boolean);
      const merged = mergeGalleryFallback(heroData, galleryUrls);
      setHero(merged);
      setVisible(merged.slots.some((s) => s.imageUrl));
    } catch {
      const cachedGallery = readPublicCache<GalleryImage[]>(PUBLIC_GALLERY_CACHE_KEY) ?? [];
      const urls = cachedGallery.map((g) => g.url).filter(Boolean);
      if (urls.length > 0) {
        setHero({
          slots: [1, 2, 3].map((slot, i) => ({
            slot: slot as 1 | 2 | 3,
            galleryImageId: null,
            imageUrl: urls[i] ?? null,
            tagline: null,
            taglineSub: null,
          })),
        });
        setVisible(true);
      } else {
        setVisible(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const slots = useMemo(() => {
    const list = hero?.slots ?? [];
    const pick = (n: 1 | 2 | 3) => list.find((s) => s.slot === n) as PublicHeroSlot | undefined;
    return { s1: pick(1), s2: pick(2), s3: pick(3) };
  }, [hero]);

  const withImage = [slots.s1, slots.s2, slots.s3].filter((s): s is PublicHeroSlot => Boolean(s?.imageUrl));
  const featured = slots.s2?.imageUrl ? slots.s2 : withImage[0];
  const secondary = [slots.s1, slots.s3].filter((s): s is PublicHeroSlot => Boolean(s?.imageUrl && s !== featured));

  if (!visible || !featured?.imageUrl) return null;

  const captionSlots = withImage.filter((s) => s.tagline?.trim() || s.taglineSub?.trim());

  return (
    <View style={[styles.wrap, { borderColor: c.ink100, backgroundColor: c.surface }, style]}>
      <PhotoTile imageUrl={featured.imageUrl} tall />

      {secondary.length > 0 ? (
        <View style={styles.pairRow}>
          {secondary.map((s) => (
            <View key={s.slot} style={styles.pairCell}>
              <PhotoTile imageUrl={s.imageUrl!} />
            </View>
          ))}
        </View>
      ) : null}

      {captionSlots.length > 0 ? (
        <View style={styles.captionRow}>
          {captionSlots.map((s) => (
            <CaptionPill key={s.slot} slot={s.slot} tagline={s.tagline} taglineSub={s.taglineSub} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
    gap: 8,
  },
  tileFrame: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tileTall: { width: '100%', aspectRatio: 16 / 10 },
  tileShort: { width: '100%', aspectRatio: 4 / 3 },
  tileImg: { width: '100%', height: '100%' },
  pairRow: { flexDirection: 'row', gap: 8 },
  pairCell: { flex: 1, minWidth: 0 },
  captionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  captionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  captionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionText: { flexShrink: 1, minWidth: 0 },
  captionTitle: { fontFamily: FONT_SANS.semibold, fontSize: 12, lineHeight: 16 },
  captionSub: { fontFamily: FONT_SANS.regular, fontSize: 11, lineHeight: 14, marginTop: 1 },
});
