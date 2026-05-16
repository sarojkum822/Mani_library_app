import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Platform, Pressable, StyleProp, Text, ViewStyle } from 'react-native';

export function ExternalLink(
  props: React.PropsWithChildren<{ href: string; style?: StyleProp<ViewStyle> }>
) {
  const { href, children, style } = props;

  if (Platform.OS === 'web') {
    // Keep web behavior simple: open in new tab.
    return (
      <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
        <Text>{children}</Text>
      </a>
    );
  }

  return (
    <Pressable onPress={() => WebBrowser.openBrowserAsync(href)} style={style}>
      <Text>{children}</Text>
    </Pressable>
  );
}
