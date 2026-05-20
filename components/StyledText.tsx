import { Text, TextProps } from './Themed';

import { FONT_MONO_DEFAULT } from '@/constants/Fonts';

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: FONT_MONO_DEFAULT }]} />;
}
