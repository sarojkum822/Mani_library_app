import React from 'react';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { CLARITY_METRIC_LABEL, clarityPageTitle, CLARITY_BODY, useAdminPalette } from '@/components/admin/clarityTokens';
import { scaled } from '@/lib/fontScale';

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  style?: ViewStyle;
  /** Larger title + extra top spacing (e.g. dashboard home). */
  hero?: boolean;
};

/**
 * Staff screen title block — iOS-like hierarchy: small caps section label, prominent title, secondary body.
 */
export function AdminPageHeader({ eyebrow, title, description, actions, style, hero = false }: Props) {
  const c = useAdminPalette();

  const stackActions = hero || Boolean(actions);

  return (
    <View
      style={[stackActions ? styles.stack : styles.row, style]}
      accessibilityRole="header"
      accessibilityLabel={`${title}${description ? `. ${description}` : ''}`}
    >
      <View style={styles.textBlock}>
        {eyebrow ? (
          <Text
            style={[styles.eyebrow, CLARITY_METRIC_LABEL, { color: c.ink500, fontSize: scaled(10) }]}
            maxFontSizeMultiplier={1.5}
            accessibilityLabel={eyebrow}
          >
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <Text
          style={[
            clarityPageTitle(scaled(hero ? 32 : 26)),
            { color: c.ink900 },
            Platform.OS === 'ios' && styles.titleIos,
          ]}
          maxFontSizeMultiplier={1.35}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={[CLARITY_BODY, { color: c.ink600, fontSize: scaled(15) }]}
            maxFontSizeMultiplier={1.65}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {actions ? (
        <View style={[styles.actions, stackActions && styles.actionsStacked]}>{actions}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
    paddingBottom: 4,
    marginBottom: 2,
  },
  stack: {
    gap: 14,
    paddingBottom: 4,
    marginBottom: 2,
  },
  textBlock: { flex: 1, minWidth: 0, gap: 6 },
  eyebrow: {},
  titleIos: { letterSpacing: -1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  actionsStacked: { justifyContent: 'flex-start' },
});
