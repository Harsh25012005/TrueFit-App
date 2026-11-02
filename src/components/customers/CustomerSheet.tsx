import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Banner, Button, Input, PhoneInput, Sheet } from '@/components/ui';
import type { CustomerRow } from '@/features/customers/customers.repo';
import {
  customerActions,
  customerErrorKey,
  customerFieldErrors,
  customerLookups,
} from '@/features/customers/useCustomers';

export interface CustomerSheetProps {
  visible: boolean;
  shopId: string;
  /** Present when editing; absent when adding. */
  customer?: CustomerRow;
  onClose: () => void;
  onSaved: (customer: CustomerRow) => void;
  /** "Already saved as Amit Shah — open?" */
  onOpenExisting: (customerId: string) => void;
}

/** S22 Add / edit customer (DESIGN.md §7). The form mounts fresh each time it opens. */
export function CustomerSheet(props: CustomerSheetProps) {
  return props.visible ? <CustomerSheetForm {...props} /> : null;
}

function CustomerSheetForm({
  visible,
  shopId,
  customer,
  onClose,
  onSaved,
  onOpenExisting,
}: CustomerSheetProps) {
  const { t } = useTranslation();
  const [initialBookNo] = useState(() => customer?.bookNo ?? customerLookups.nextBookNo(shopId));
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [bookNo, setBookNo] = useState(initialBookNo);
  const [area, setArea] = useState(customer?.area ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();

  const duplicate = useMemo(
    () =>
      /^[6-9]\d{9}$/.test(phone)
        ? customerLookups.duplicatePhone(shopId, phone, customer?.id)
        : null,
    [shopId, phone, customer?.id],
  );
  const bookNoOwner = useMemo(
    () => customerLookups.bookNoOwner(shopId, bookNo, customer?.id),
    [shopId, bookNo, customer?.id],
  );

  const dirty =
    name !== (customer?.name ?? '') ||
    phone !== (customer?.phone ?? '') ||
    bookNo !== initialBookNo ||
    area !== (customer?.area ?? '');

  function save() {
    try {
      const input = { name, phone, bookNo, area };
      const saved = customer
        ? customerActions.updateCustomer(customer.id, input)
        : customerActions.addCustomer(shopId, input);
      onSaved(saved);
      onClose();
    } catch (e) {
      const fieldErrors = customerFieldErrors(e);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else setFormError(t(customerErrorKey(e)));
    }
  }

  const clear = (field: string) => setErrors((prev) => ({ ...prev, [field]: '' }));

  return (
    <Sheet
      visible={visible}
      title={customer ? t('customers.editTitle') : t('customers.addTitle')}
      onClose={onClose}
      dirty={dirty}
      error={formError}
      footer={
        <>
          <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
          <Button label={t('common.save')} onPress={save} testID="customer-save" />
        </>
      }
    >
      <Input
        label={t('customers.fullName')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          clear('name');
        }}
        maxLength={50}
        autoComplete="name"
        error={errors.name ? t(errors.name) : undefined}
        testID="customer-name"
      />
      <PhoneInput
        label={t('customers.mobile')}
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          clear('phone');
        }}
        error={errors.phone ? t(errors.phone) : undefined}
        testID="customer-phone"
      />
      {duplicate ? (
        <Banner
          variant="warning"
          message={t('customers.duplicatePhone', { name: duplicate.name })}
          action={{
            label: t('common.open'),
            onPress: () => {
              onClose();
              onOpenExisting(duplicate.id);
            },
          }}
          testID="duplicate-phone"
        />
      ) : null}
      <Input
        label={t('customers.bookNo')}
        value={bookNo}
        onChangeText={(v) => {
          setBookNo(v);
          clear('bookNo');
        }}
        maxLength={12}
        error={errors.bookNo ? t(errors.bookNo) : undefined}
        hint={
          bookNoOwner
            ? t('customers.bookNoTaken', { bookNo: bookNo.trim(), name: bookNoOwner.name })
            : undefined
        }
        testID="customer-bookno"
      />
      <Input
        label={`${t('customers.area')} (${t('common.optional')})`}
        value={area}
        onChangeText={(v) => {
          setArea(v);
          clear('area');
        }}
        maxLength={100}
        error={errors.area ? t(errors.area) : undefined}
        testID="customer-area"
      />
    </Sheet>
  );
}
