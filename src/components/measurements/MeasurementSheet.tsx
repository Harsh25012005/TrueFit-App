import { useRef, useState } from 'react';
import { View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, Input, Segmented, Sheet } from '@/components/ui';
import type { FieldRow, GarmentRow } from '@/features/garments/garments.repo';
import {
  measurementActions,
  measurementErrorKey,
  type MeasurementCardData,
} from '@/features/measurements/useMeasurements';
import {
  formatMeasurement,
  MAX_VALUE_IN,
  MIN_VALUE_IN,
  parseNumber,
  toInches,
  type Unit,
} from '@/lib/units';

export interface MeasurementSheetProps {
  visible: boolean;
  customerId: string;
  customerName: string;
  garments: GarmentRow[];
  fields: FieldRow[];
  /** The customer's saved measurements (to prefill when updating). */
  cards: MeasurementCardData[];
  unit: Unit;
  /** Cloth to start on ("Update" on a card); default is the first cloth. */
  initialGarmentId?: string;
  onClose: () => void;
  onSaved: (garmentName: string) => void;
}

/** S23 Measurement form (DESIGN.md §7). Mounts fresh each time it opens. */
export function MeasurementSheet(props: MeasurementSheetProps) {
  return props.visible ? <MeasurementSheetForm {...props} /> : null;
}

function MeasurementSheetForm({
  visible,
  customerId,
  customerName,
  garments,
  fields,
  cards,
  unit,
  initialGarmentId,
  onClose,
  onSaved,
}: MeasurementSheetProps) {
  const { t } = useTranslation();
  const startGarment = initialGarmentId ?? garments[0]?.id ?? '';

  const fieldsOf = (garmentId: string) =>
    fields.filter((f) => f.garmentTypeId === garmentId).sort((a, b) => a.sortOrder - b.sortOrder);

  /** Saved sizes shown in the shop's unit; blank for fields not measured yet. */
  const textsFor = (garmentId: string): Record<string, string> => {
    const card = cards.find((c) => c.measurement.garmentTypeId === garmentId);
    return Object.fromEntries(
      fieldsOf(garmentId).map((f) => {
        const saved = card?.rows.find((r) => r.fieldId === f.id)?.valueIn;
        return [f.id, saved == null ? '' : formatMeasurement(saved, unit)];
      }),
    );
  };

  const [garmentId, setGarmentId] = useState(startGarment);
  const [texts, setTexts] = useState(() => textsFor(startGarment));
  const [initialTexts, setInitialTexts] = useState(() => textsFor(startGarment));
  const existing = cards.find((c) => c.measurement.garmentTypeId === garmentId);
  const [notes, setNotes] = useState(existing?.measurement.notes ?? '');
  const [initialNotes, setInitialNotes] = useState(existing?.measurement.notes ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const inputs = useRef<(TextInputInstance | null)[]>([]);

  const garment = garments.find((g) => g.id === garmentId);
  const list = fieldsOf(garmentId);

  const dirty =
    notes !== initialNotes || list.some((f) => (texts[f.id] ?? '') !== (initialTexts[f.id] ?? ''));

  function chooseGarment(id: string) {
    const card = cards.find((c) => c.measurement.garmentTypeId === id);
    const next = textsFor(id);
    setGarmentId(id);
    setTexts(next);
    setInitialTexts(next);
    setNotes(card?.measurement.notes ?? '');
    setInitialNotes(card?.measurement.notes ?? '');
    setFieldErrors({});
    setFormError(undefined);
  }

  function save() {
    const values: Record<string, number> = {};
    const errors: Record<string, string> = {};
    for (const f of list) {
      const raw = (texts[f.id] ?? '').trim();
      if (!raw) continue; // not measured
      const typed = parseNumber(raw);
      const inches = typed === null ? NaN : toInches(typed, unit);
      if (!(inches >= MIN_VALUE_IN && inches <= MAX_VALUE_IN)) {
        errors[f.id] = unit === 'cm' ? 'measurements.errors.valueCm' : 'measurements.errors.value';
      } else {
        values[f.id] = inches;
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (Object.keys(values).length === 0) {
      setFormError(t('measurements.errors.noValues'));
      return;
    }
    try {
      measurementActions.saveMeasurement(customerId, garmentId, { values, notes });
      onSaved(garment?.name ?? '');
      onClose();
    } catch (e) {
      setFormError(t(measurementErrorKey(e)));
    }
  }

  return (
    <Sheet
      visible={visible}
      title={`${t('measurements.sheetTitle')} · ${customerName}`}
      onClose={onClose}
      dirty={dirty}
      error={formError}
      footer={
        <>
          <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
          <Button
            label={t('measurements.save')}
            disabled={list.length === 0}
            onPress={save}
            testID="measurement-save"
          />
        </>
      }
    >
      {garments.length > 1 ? (
        <Segmented
          accessibilityLabel={t('measurements.cloth')}
          value={garmentId}
          onChange={chooseGarment}
          options={garments.map((g) => ({ value: g.id, label: g.name }))}
        />
      ) : null}
      <Banner
        variant="info"
        message={
          existing
            ? t('measurements.updateHint', { cloth: garment?.name ?? '' })
            : t('measurements.newHint', { cloth: garment?.name ?? '', name: customerName })
        }
      />
      {list.length === 0 ? (
        <Banner variant="warning" message={t('measurements.noFields')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
          {list.map((f, index) => {
            const last = index === list.length - 1;
            return (
              <View key={f.id} style={{ width: '33.333%', padding: 4 }}>
                <Input
                  ref={(el) => {
                    inputs.current[index] = el;
                  }}
                  label={f.name}
                  value={texts[f.id] ?? ''}
                  onChangeText={(v) => {
                    setTexts((prev) => ({ ...prev, [f.id]: v }));
                    setFieldErrors((prev) => ({ ...prev, [f.id]: '' }));
                  }}
                  keyboardType="decimal-pad"
                  // Enter jumps to the next box; Enter on the last one saves (PRD M6).
                  returnKeyType={last ? 'done' : 'next'}
                  submitBehavior={last ? 'blurAndSubmit' : 'submit'}
                  onSubmitEditing={() => (last ? save() : inputs.current[index + 1]?.focus())}
                  error={fieldErrors[f.id] ? t(fieldErrors[f.id] as string) : undefined}
                  testID={`value-${f.name}`}
                />
              </View>
            );
          })}
        </View>
      )}
      <Input
        label={t('measurements.notes')}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={300}
        hint={t('measurements.unitHint', { unit: t(`common.${unit}`) })}
        testID="measurement-notes"
      />
    </Sheet>
  );
}
