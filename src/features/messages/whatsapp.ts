import { Linking, Share } from 'react-native';

/**
 * Call and WhatsApp share links (PRD M11, INTEGRATIONS.md §6). No Business API: opens the chat
 * with `wa.me`, falling back to the system share sheet when WhatsApp is not installed. Message
 * templates and the share sheet arrive in Phase 8.
 */

/** Opens the phone dialler for a 10-digit Indian number. */
export function openCall(phone: string): Promise<void> {
  return Linking.openURL(`tel:+91${phone}`);
}

/** wa.me link for a 10-digit Indian number, with optional pre-filled text. */
export function whatsAppUrl(phone: string, text = ''): string {
  const base = `https://wa.me/91${phone}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export async function openWhatsApp(phone: string, text = ''): Promise<void> {
  try {
    await Linking.openURL(whatsAppUrl(phone, text));
  } catch {
    await Share.share({ message: text || phone });
  }
}
