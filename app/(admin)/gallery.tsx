import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { adminScrollContentInsets } from '@/components/admin/layoutTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useStaleWhileRevalidate } from '@/hooks/useStaleWhileRevalidate';
import { api, type GalleryImage } from '@/lib/api';
import { cacheKeys } from '@/lib/dataCache';

type GalleryPayload = { images: GalleryImage[]; maxImages: number };

export default function AdminGalleryScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGallery = useCallback(async (): Promise<GalleryPayload> => {
    if (!token) throw new Error('Sign in as admin.');
    return api.adminGalleryList(token);
  }, [token]);

  const { data, loading, revalidating, error } = useStaleWhileRevalidate<GalleryPayload>({
    cacheKey: cacheKeys.adminGallery,
    fetcher: fetchGallery,
    refreshKey,
    enabled: !!token,
  });

  const images = data?.images ?? [];
  const maxImages = data?.maxImages ?? 50;
  const atLimit = images.length >= maxImages;

  const pickUpload = async () => {
    if (!token || atLimit) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload gallery images.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: Math.min(5, maxImages - images.length),
    });
    if (res.canceled || !res.assets.length) return;
    setUploading(true);
    try {
      for (const asset of res.assets) {
        const uri = asset.uri;
        const mime = asset.mimeType ?? 'image/jpeg';
        const name = asset.fileName ?? `gallery-${Date.now()}.jpg`;
        await api.adminGalleryUpload(token, { uri, mimeType: mime, name });
      }
      setRefreshKey((k) => k + 1);
    } catch (e: unknown) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.');
      setRefreshKey((k) => k + 1);
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!token || !pendingDeleteId) return;
    setDeleting(true);
    try {
      await api.adminGalleryDelete(token, pendingDeleteId);
      setPendingDeleteId(null);
      setRefreshKey((k) => k + 1);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={adminScrollContentInsets(insets.bottom)}
      data={images}
      numColumns={2}
      columnWrapperStyle={styles.col}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={revalidating} onRefresh={() => setRefreshKey((k) => k + 1)} />
      }
      ListHeaderComponent={
        <View style={{ gap: 12, paddingBottom: 12 }}>
          <AdminPageHeader
            eyebrow="content"
            title="Gallery"
            description={`${images.length} / ${maxImages} photos on homepage and gallery.`}
          />
          <Button
            title={uploading ? 'Uploading…' : atLimit ? 'Gallery full' : 'Add photos'}
            disabled={uploading || atLimit}
            onPress={pickUpload}
          />
          {error ? (
            <AdminEmptyState title="Could not load" body={error} actionLabel="Retry" onAction={() => setRefreshKey((k) => k + 1)} />
          ) : null}
        </View>
      }
      ListEmptyComponent={loading ? null : <AdminEmptyState title="No photos" body="Add images for the public gallery." />}
      renderItem={({ item }) => (
        <View style={[styles.tile, { borderColor: c.ink100, backgroundColor: c.surface }]}>
          <Image source={{ uri: item.url }} style={styles.img} resizeMode="cover" />
          <Pressable onPress={() => setPendingDeleteId(item.id)} style={styles.del}>
            <Text style={styles.delText}>Delete</Text>
          </Pressable>
        </View>
      )}
    />

    <Modal
      visible={pendingDeleteId != null}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!deleting) setPendingDeleteId(null);
      }}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => {
          if (!deleting) setPendingDeleteId(null);
        }}
      >
        <Pressable
          style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: c.ink900 }]}>Delete photo?</Text>
          <Text style={[styles.modalBody, { color: c.ink600 }]}>
            This will be removed from the homepage and public gallery. This cannot be undone.
          </Text>
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="secondary"
              disabled={deleting}
              onPress={() => setPendingDeleteId(null)}
              style={styles.modalBtn}
            />
            <Button
              title={deleting ? 'Deleting…' : 'Delete'}
              variant="primary"
              disabled={deleting}
              loading={deleting}
              onPress={() => void confirmDelete()}
              style={{ ...styles.modalBtn, backgroundColor: '#b91c1c', borderColor: '#b91c1c' }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  col: { gap: 10 },
  tile: { flex: 1, marginBottom: 10, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  img: { width: '100%', aspectRatio: 4 / 3 },
  del: { padding: 8, alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.06)' },
  delText: { fontSize: 12, fontWeight: '600', color: '#b91c1c' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { fontSize: 15, lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1 },
});
