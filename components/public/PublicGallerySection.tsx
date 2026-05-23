import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { api, type GalleryImage } from '@/lib/api';
import {
  PUBLIC_GALLERY_CACHE_KEY,
  readPublicCache,
  writePublicCache,
} from '@/lib/publicContentCache';

type Props = {
  maxCount?: number;
};

export function PublicGallerySection({ maxCount = 8 }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [images, setImages] = useState<GalleryImage[]>(() => readPublicCache<GalleryImage[]>(PUBLIC_GALLERY_CACHE_KEY) ?? []);
  const [loading, setLoading] = useState(images.length === 0);

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = readPublicCache<GalleryImage[]>(PUBLIC_GALLERY_CACHE_KEY);
      if (cached?.length) {
        setImages(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const list = await api.publicGallery();
      setImages(list);
      writePublicCache(PUBLIC_GALLERY_CACHE_KEY, list);
    } catch {
      if (!images.length) setImages([]);
    } finally {
      setLoading(false);
    }
  }, [images.length]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = maxCount != null ? images.slice(0, maxCount) : images;

  if (loading && visible.length === 0) {
    return <Text style={[styles.muted, { color: c.ink500 }]}>Loading gallery…</Text>;
  }

  if (visible.length === 0) {
    return (
      <Text style={[styles.muted, { color: c.ink600 }]}>
        Gallery photos coming soon.
      </Text>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {visible.map((img) => (
        <View key={img.id} style={[styles.tile, { borderColor: c.ink100, backgroundColor: c.ink50 }]}>
          <Image source={{ uri: img.url }} style={styles.img} resizeMode="cover" accessibilityIgnoresInvertColors />
        </View>
      ))}
      {images.length > (maxCount ?? images.length) ? (
        <Pressable
          onPress={() => void load(true)}
          style={[styles.more, { borderColor: c.ink200, backgroundColor: c.surface }]}
        >
          <Text style={[styles.moreText, { color: c.azure600 }]}>+{images.length - visible.length} more</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 4 },
  tile: { width: 140, height: 105, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  muted: { fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  more: {
    width: 100,
    height: 105,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  moreText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
