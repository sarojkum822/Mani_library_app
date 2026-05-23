import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import {
  adminCardChrome,
  CLARITY_BODY_SM,
  CLARITY_HINT_META,
  CLARITY_METRIC_LABEL,
  CLARITY_SECTION_TITLE,
  useAdminPalette,
} from '@/components/admin/clarityTokens';

type Props = {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  paddedBody?: boolean;
  accent?: 'default' | 'warning';
  /** `metric` = web card intro (ink-500 caps + ink-600 body). */
  headerVariant?: 'title' | 'metric';
  style?: ViewStyle;
};

/** Inset grouped section — white card, hairline border, subtle lift (iOS + Android). */
export function AdminSectionCard({
  title,
  description,
  right,
  children,
  paddedBody = true,
  accent = 'default',
  headerVariant = 'title',
  style,
}: Props) {
  const c = useAdminPalette();
  const chrome =
    accent === 'warning'
      ? {
          ...adminCardChrome(c),
          borderColor: c.amber800,
          backgroundColor: c.amber100,
        }
      : adminCardChrome(c);

  return (
    <View style={[styles.wrap, chrome, style]}>
      <View style={[styles.head, { borderBottomColor: c.border }]}>
        <View style={styles.headText}>
          <Text
            style={[
              styles.title,
              headerVariant === 'metric' ? CLARITY_METRIC_LABEL : CLARITY_SECTION_TITLE,
              { color: headerVariant === 'metric' ? c.ink500 : c.ink900 },
            ]}
          >
            {headerVariant === 'metric' ? title.toUpperCase() : title}
          </Text>
          {description ? (
            <Text
              style={[
                headerVariant === 'metric' ? CLARITY_BODY_SM : CLARITY_HINT_META,
                styles.desc,
                { color: c.ink600 },
              ]}
              numberOfLines={4}
            >
              {description}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      <View style={paddedBody ? styles.body : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headText: { flex: 1, minWidth: 0 },
  title: {},
  desc: { marginTop: 4 },
  body: { paddingHorizontal: 0, paddingBottom: 2 },
});
