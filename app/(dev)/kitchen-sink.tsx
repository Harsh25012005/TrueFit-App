import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  Avatar,
  Banner,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  Icon,
  IconButton,
  Input,
  ListRow,
  MoneyInput,
  PhoneInput,
  PinDots,
  PinPad,
  SearchInput,
  SectionHeader,
  Segmented,
  Sheet,
  Skeleton,
  StatusPill,
  Stepper,
  Switch,
  TabBar,
  Text,
  TopBar,
  type TabKey,
} from '@/components/ui';
import { LANGUAGES, setLanguage } from '@/i18n';
import { sendTestError } from '@/lib/sentry';
import { showToast } from '@/stores/ui.store';

// Dev-only "kitchen sink" (PLAN 0.6/0.7): every primitive in every state, in light/dark and
// EN/GU/HI. Sample values are fixtures, not product copy, so they are not translated.
export default function KitchenSink() {
  const { t, i18n } = useTranslation();
  const { colorScheme, setColorScheme } = useColorScheme();
  const [text, setText] = useState('');
  const [phone, setPhone] = useState('');
  const [rate, setRate] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'cash' | 'upi' | 'card'>('cash');
  const [qty, setQty] = useState(0);
  const [on, setOn] = useState(false);
  const [pin, setPin] = useState('');
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [tab, setTab] = useState<TabKey>('home');

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 112 }}>
      <SectionHeader title="Theme & language" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['light', 'dark'] as const).map((s) => (
          <Chip key={s} label={s} selected={colorScheme === s} onPress={() => setColorScheme(s)} />
        ))}
        {LANGUAGES.map((lang) => (
          <Chip
            key={lang}
            label={t(`language.${lang}`)}
            selected={i18n.language === lang}
            onPress={() => setLanguage(lang)}
          />
        ))}
      </View>

      <SectionHeader title="Type" />
      <Text variant="display">TrueFit</Text>
      <Text variant="title-1">{t('common.save')}</Text>
      <Text variant="title-3">{t('errors.generic')}</Text>
      <Text>{t('common.loading')}</Text>
      <Text variant="caption" color="text-muted">
        {t('common.tryAgain')}
      </Text>
      <Text variant="title-2" numeric color="primary">
        ₹1,25,000
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Icon name="home" size="sm" />
        <Icon name="receipt" />
        <Icon name="users" size="lg" color="primary" />
        <Icon name="alert-circle" size="lg" color="error" />
      </View>

      <SectionHeader title="Button" />
      <Button label={t('common.save')} icon="check" onPress={() => {}} />
      <Button label={t('common.save')} loading />
      <Button label={t('common.save')} disabled />
      <Button label={t('common.cancel')} variant="secondary" />
      <Button label={t('common.cancel')} variant="secondary" disabled />
      <Button label={t('common.tryAgain')} variant="ghost" />
      <Button label="Delete" variant="destructive" icon="trash" />
      <Button label={t('common.back')} size="sm" variant="secondary" fullWidth />
      <View style={{ flexDirection: 'row' }}>
        <IconButton icon="search" accessibilityLabel={t('common.search')} onPress={() => {}} />
        <IconButton icon="bell" accessibilityLabel="Notifications" disabled />
      </View>

      <SectionHeader title="Input" />
      <Input label="Full name" placeholder="Amit Shah" value={text} onChangeText={setText} />
      <Input label="Mobile" prefix="+91" keyboardType="number-pad" hint="10 digits" />
      <Input label="Mobile" prefix="+91" value="12345" error="Enter 10-digit mobile number" />
      <Input label="Book no." value="101" disabled />
      <Input label="Phone" loading />
      <Input label="Chest" suffix="in" keyboardType="decimal-pad" />
      <Input label="Note" multiline />

      <SectionHeader title="Chip" />
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
        <Chip label="Active" count={11} selected />
        <Chip label="Due today" count={2} />
        <Chip label="Overdue" count={1} />
        <Chip label="Cancelled" disabled />
      </ScrollView>

      <SectionHeader title="Card & ListRow" />
      <Card>
        <Text variant="title-3">Default card</Text>
      </Card>
      <Card variant="summary">
        <View style={{ padding: 12 }}>
          <Text variant="title-2" numeric color="primary">
            ₹2,400
          </Text>
        </View>
        <View style={{ padding: 12 }}>
          <Text variant="title-2" numeric>
            3
          </Text>
        </View>
        <View style={{ padding: 12 }}>
          <Text variant="title-2" numeric>
            5
          </Text>
        </View>
      </Card>
      <Card variant="list">
        <ListRow title="Karan Trivedi #1234" subtitle="3 shirts · 2 days late" value="₹950 due" />
        <ListRow title="Amit Shah" subtitle="Book no. 101 · 98240 12345" onPress={() => {}} />
        <ListRow title="Priya Desai" subtitle="Disabled row" onPress={() => {}} disabled />
      </Card>
      <Card variant="inset">
        <Text color="text-muted">Inset card</Text>
      </Card>
      <Card onPress={() => {}} accessibilityLabel="Pressable card">
        <Text>Pressable card</Text>
      </Card>
      <Card loading />
      <Card error={t('errors.generic')} onRetry={() => {}} />

      <SectionHeader title="Skeleton & empty" />
      <Skeleton width="70%" />
      <Skeleton width="40%" height={12} />
      <EmptyState
        icon="users"
        title="No customers yet"
        text="Add your first customer"
        action={{ label: 'Add customer', onPress: () => {} }}
      />

      <SectionHeader title="Toast" />
      <Button
        label="Success toast"
        variant="secondary"
        onPress={() => showToast({ message: 'Shirt measurement saved', kind: 'success' })}
      />
      <Button
        label="Toast with Undo"
        variant="secondary"
        onPress={() =>
          showToast({
            message: 'Customer deleted',
            action: { label: t('common.undo'), onPress: () => {} },
          })
        }
      />
      <SectionHeader title="Sentry" />
      <Button
        label="Send test error"
        variant="secondary"
        onPress={() =>
          showToast({
            message: sendTestError() ? 'Sent to Sentry' : 'Sentry off: no DSN',
            kind: 'info',
          })
        }
      />

      <SectionHeader title="Batch 2" />
      <TopBar title="Order #1234" onBack={() => {}} scrolled />
      <TopBar root title={t('tabs.orders')} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <StatusPill status="received" />
        <StatusPill status="ready" />
        <StatusPill status="delivered" />
        <StatusPill status="cancelled" />
      </View>
      <Banner message="Trial ends in 3 days" />
      <Banner variant="warning" message="Due today" />
      <Banner
        variant="error"
        message={t('errors.generic')}
        action={{ label: t('common.tryAgain'), onPress: () => {} }}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Avatar name="Karan Trivedi" />
        <Avatar name="કિરણ પટેલ" />
        <Avatar name="राहुल मेहता" />
      </View>
      <SearchInput value={query} onChangeText={setQuery} />
      <PhoneInput label="Mobile" value={phone} onChangeText={setPhone} />
      <MoneyInput label="Rate" value={rate} onChangeValue={setRate} />
      <Segmented
        accessibilityLabel="Payment mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'cash', label: 'Cash' },
          { value: 'upi', label: 'UPI' },
          { value: 'card', label: 'Card' },
        ]}
      />
      <Segmented
        accessibilityLabel="Language"
        value={i18n.language as 'en' | 'gu' | 'hi'}
        onChange={setLanguage}
        options={[
          { value: 'en', label: 'EN', script: 'latin' },
          { value: 'gu', label: 'ગુ', script: 'gujarati' },
          { value: 'hi', label: 'हि', script: 'devanagari' },
        ]}
      />
      <Stepper value={qty} onChange={setQty} max={50} accessibilityLabel="Shirt" />
      <Switch value={on} onValueChange={setOn} accessibilityLabel="Dark mode" />
      <PinDots count={pin.length} />
      <PinPad value={pin} onChange={setPin} onComplete={() => setPin('')} onBiometric={() => {}} />
      <Button label="Open sheet" variant="secondary" onPress={() => setSheet(true)} />
      <Button label="Open dialog" variant="secondary" onPress={() => setDialog(true)} />
      <Sheet
        visible={sheet}
        title="Add payment"
        dirty={rate !== null}
        onClose={() => setSheet(false)}
        footer={
          <>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => setSheet(false)}
            />
            <Button label={t('common.save')} onPress={() => setSheet(false)} />
          </>
        }
      >
        <MoneyInput label="Amount" value={rate} onChangeValue={setRate} />
      </Sheet>
      <Dialog
        visible={dialog}
        title="₹950 still due on #1234"
        actions={[
          { label: 'Collect cash & deliver', onPress: () => setDialog(false) },
          {
            label: 'Deliver without payment',
            variant: 'secondary',
            onPress: () => setDialog(false),
          },
        ]}
        cancelLabel={t('common.cancel')}
        onCancel={() => setDialog(false)}
      />
      <View style={{ height: 96 }}>
        <TabBar active={tab} onTabPress={setTab} onAddPress={() => {}} badges={{ orders: 2 }} />
      </View>
    </ScrollView>
  );
}
