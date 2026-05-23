import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card } from '@/components/ui/Card';

type Props = {
  title: string;
  onEdit: () => void;
  onDocuments?: () => void;
  children: React.ReactNode;
};

export function EditableDetailsCard({ title, onEdit, onDocuments, children }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const openMenu = () => {
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Edit', onPress: onEdit },
    ];
    if (onDocuments) {
      buttons.push({ text: 'Documents & verification', onPress: onDocuments });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(title, undefined, buttons);
  };

  return (
    <Card style={{ padding: 0, overflow: 'hidden', marginTop: 6 }}>
      <View style={[styles.header, { borderBottomColor: c.ink100 }]}>
        <Text style={[styles.headerTitle, { color: c.ink500 }]}>{title}</Text>
        <Pressable
          onPress={openMenu}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
          style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.65 }]}
        >
          <FontAwesome name="ellipsis-h" size={18} color={c.ink600} />
        </Pressable>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
