import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { PRIVACY, PRIVACY_CONTACT, PRIVACY_UPDATED } from '../data/privacy';
import { colors, space } from '../theme';

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.updated}>Last updated {PRIVACY_UPDATED}</Text>
      {PRIVACY.map(s => (
        <Text key={s.heading} style={styles.p}><Text style={styles.h}>{s.heading}. </Text>{s.body}</Text>
      ))}
      <Text style={styles.p}>
        <Text style={styles.h}>Contact. </Text>Questions go to{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_CONTACT)} accessibilityRole="link">the project&apos;s GitHub page</Text>.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  updated: { color: colors.muted, fontSize: 13 },
  p: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  h: { color: colors.ink, fontWeight: '700' },
  link: { color: colors.brass, textDecorationLine: 'underline' },
});
