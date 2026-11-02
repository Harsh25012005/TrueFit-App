import { ScrollView, Text, View } from 'react-native';

import { COLOR_TOKENS, themeStyle } from '@/theme/colors';
import { palette, type ColorScheme } from '@/theme/tokens';

// Dev-only token check (PLAN 0.3): every DESIGN.md §2 colour, light and dark side by side.
// Labels are token identifiers, not user-facing copy, so they are not translated.
function SchemeColumn({ scheme }: { scheme: ColorScheme }) {
  return (
    <View style={[{ flex: 1 }, themeStyle(scheme)]} className="bg-background p-3">
      <Text className="text-label text-text-muted mb-2">{scheme}</Text>
      {COLOR_TOKENS.map((token) => (
        <View key={token} className="mb-2 flex-row items-center">
          <View
            style={{ width: 32, height: 32, backgroundColor: palette[scheme][token] }}
            className="border-border rounded-sm border"
          />
          <Text className="text-caption text-text ml-2" numberOfLines={1}>
            {token}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function TokensScreen() {
  return (
    <ScrollView contentContainerStyle={{ flexDirection: 'row' }}>
      <SchemeColumn scheme="light" />
      <SchemeColumn scheme="dark" />
    </ScrollView>
  );
}
