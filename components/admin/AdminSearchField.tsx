import React from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { adminSearchChrome, CLARITY_MIN_TOUCH, useAdminPalette } from '@/components/admin/clarityTokens';

type Props = TextInputProps & {
  containerStyle?: object;
};

/** Rounded search field — identical chrome on iOS and Android. */
export function AdminSearchField({ containerStyle, style, ...rest }: Props) {
  const c = useAdminPalette();

  return (
    <View style={[styles.wrap, adminSearchChrome(c), containerStyle]}>
      <FontAwesome name="search" size={15} color={c.ink400} style={styles.icon} />
      <TextInput
        placeholderTextColor={c.ink400}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[
          styles.input,
          { color: c.ink900 },
          Platform.OS === 'android' ? styles.inputAndroid : null,
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: CLARITY_MIN_TOUCH,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 11,
    minHeight: CLARITY_MIN_TOUCH,
  },
  inputAndroid: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
