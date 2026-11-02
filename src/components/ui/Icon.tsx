import IconAlertCircle from '@tabler/icons-react-native/IconAlertCircle';
import IconArrowLeft from '@tabler/icons-react-native/IconArrowLeft';
import IconArrowsSort from '@tabler/icons-react-native/IconArrowsSort';
import IconBackspace from '@tabler/icons-react-native/IconBackspace';
import IconBell from '@tabler/icons-react-native/IconBell';
import IconBrandGoogle from '@tabler/icons-react-native/IconBrandGoogle';
import IconBrandWhatsapp from '@tabler/icons-react-native/IconBrandWhatsapp';
import IconCalendar from '@tabler/icons-react-native/IconCalendar';
import IconCash from '@tabler/icons-react-native/IconCash';
import IconCheck from '@tabler/icons-react-native/IconCheck';
import IconChevronDown from '@tabler/icons-react-native/IconChevronDown';
import IconChevronRight from '@tabler/icons-react-native/IconChevronRight';
import IconChevronUp from '@tabler/icons-react-native/IconChevronUp';
import IconCircleCheck from '@tabler/icons-react-native/IconCircleCheck';
import IconCloudCheck from '@tabler/icons-react-native/IconCloudCheck';
import IconCloudOff from '@tabler/icons-react-native/IconCloudOff';
import IconCloudUp from '@tabler/icons-react-native/IconCloudUp';
import IconDots from '@tabler/icons-react-native/IconDots';
import IconEdit from '@tabler/icons-react-native/IconEdit';
import IconEye from '@tabler/icons-react-native/IconEye';
import IconEyeOff from '@tabler/icons-react-native/IconEyeOff';
import IconFingerprint from '@tabler/icons-react-native/IconFingerprint';
import IconHome from '@tabler/icons-react-native/IconHome';
import IconInfoCircle from '@tabler/icons-react-native/IconInfoCircle';
import IconMail from '@tabler/icons-react-native/IconMail';
import IconMinus from '@tabler/icons-react-native/IconMinus';
import IconPhone from '@tabler/icons-react-native/IconPhone';
import IconPlus from '@tabler/icons-react-native/IconPlus';
import IconReceipt from '@tabler/icons-react-native/IconReceipt';
import IconRuler from '@tabler/icons-react-native/IconRuler';
import IconSearch from '@tabler/icons-react-native/IconSearch';
import IconSettings from '@tabler/icons-react-native/IconSettings';
import IconTrash from '@tabler/icons-react-native/IconTrash';
import IconUsers from '@tabler/icons-react-native/IconUsers';
import IconX from '@tabler/icons-react-native/IconX';

import { useColors } from '@/theme/colors';
import { iconSize, type ColorToken } from '@/theme/tokens';

// Tabler outline icons (DESIGN.md §5). Each icon is imported on its own so the bundle stays small;
// add new ones here when a screen needs them.
const ICONS = {
  'alert-circle': IconAlertCircle,
  'arrow-left': IconArrowLeft,
  'arrows-sort': IconArrowsSort,
  backspace: IconBackspace,
  bell: IconBell,
  'brand-google': IconBrandGoogle,
  'brand-whatsapp': IconBrandWhatsapp,
  calendar: IconCalendar,
  cash: IconCash,
  check: IconCheck,
  'chevron-down': IconChevronDown,
  'chevron-right': IconChevronRight,
  'chevron-up': IconChevronUp,
  'circle-check': IconCircleCheck,
  'cloud-check': IconCloudCheck,
  'cloud-off': IconCloudOff,
  'cloud-up': IconCloudUp,
  dots: IconDots,
  edit: IconEdit,
  eye: IconEye,
  'eye-off': IconEyeOff,
  fingerprint: IconFingerprint,
  home: IconHome,
  'info-circle': IconInfoCircle,
  mail: IconMail,
  minus: IconMinus,
  phone: IconPhone,
  plus: IconPlus,
  receipt: IconReceipt,
  ruler: IconRuler,
  search: IconSearch,
  settings: IconSettings,
  trash: IconTrash,
  users: IconUsers,
  x: IconX,
} as const;

export type IconName = keyof typeof ICONS;

export const ICON_STROKE = 1.8;

export interface IconProps {
  name: IconName;
  /** 16 / 20 / 24 per DESIGN.md §5; a few components use their own size (tab bar 22, Add 28). */
  size?: keyof typeof iconSize | number;
  color?: ColorToken;
  /** Set only when the icon stands alone; decorative icons are hidden from TalkBack. */
  accessibilityLabel?: string;
  testID?: string;
}

export function Icon({ name, size = 'md', color = 'text', accessibilityLabel, testID }: IconProps) {
  const colors = useColors();
  const Component = ICONS[name];
  const px = typeof size === 'number' ? size : iconSize[size];
  const a11y = accessibilityLabel
    ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel }
    : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <Component
      size={px}
      strokeWidth={ICON_STROKE}
      color={colors[color]}
      testID={testID}
      {...a11y}
    />
  );
}
