import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { FONT_SANS } from '@/constants/Fonts';
import { useColorScheme } from '@/components/useColorScheme';
import { Card } from '@/components/ui/Card';
import { api, type PublicTestimonial } from '@/lib/api';
import {
  PUBLIC_TESTIMONIALS_CACHE_KEY,
  readPublicCache,
  writePublicCache,
} from '@/lib/publicContentCache';

function Stars({ rating, color }: { rating: number; color: string }) {
  return (
    <Text style={{ color, fontSize: 14, letterSpacing: 1 }}>
      {'★'.repeat(Math.min(5, Math.max(0, Math.round(rating))))}
      {'☆'.repeat(5 - Math.min(5, Math.max(0, Math.round(rating))))}
    </Text>
  );
}

export function TestimonialsSection() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [items, setItems] = useState<PublicTestimonial[]>(
    () => readPublicCache<PublicTestimonial[]>(PUBLIC_TESTIMONIALS_CACHE_KEY) ?? [],
  );
  const [loading, setLoading] = useState(items.length === 0);

  const load = useCallback(async () => {
    const cached = readPublicCache<PublicTestimonial[]>(PUBLIC_TESTIMONIALS_CACHE_KEY);
    if (cached?.length) {
      setItems(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await api.publicTestimonials();
      setItems(list);
      writePublicCache(PUBLIC_TESTIMONIALS_CACHE_KEY, list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <Text style={[styles.muted, { color: c.ink500 }]}>Loading feedback…</Text>;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.grid}>
      {items.slice(0, 6).map((t) => (
        <Card key={`${t.fullName}-${t.comment.slice(0, 24)}`} style={styles.card}>
          <Stars rating={t.rating} color="#f59e0b" />
          <Text style={[styles.quote, { color: c.ink800 }]} numberOfLines={5}>
            “{t.comment}”
          </Text>
          <Text style={[styles.name, { color: c.ink900 }]}>{t.fullName}</Text>
          <Text style={[styles.sub, { color: c.ink500 }]} numberOfLines={1}>
            {t.subtitle}
          </Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 10 },
  card: { padding: 14, gap: 6 },
  quote: { fontSize: 14, lineHeight: 20, fontFamily: FONT_SANS.regular, marginTop: 4 },
  name: { fontSize: 13, fontWeight: '600', fontFamily: FONT_SANS.semibold, marginTop: 6 },
  sub: { fontSize: 11, fontFamily: FONT_SANS.regular },
  muted: { fontSize: 14, textAlign: 'center' },
});
