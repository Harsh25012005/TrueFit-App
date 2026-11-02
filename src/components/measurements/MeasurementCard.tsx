import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, Text } from '@/components/ui';
import type { MeasurementCardData } from '@/features/measurements/useMeasurements';
import { formatDate } from '@/lib/dates';
import { formatMeasurement, type Unit } from '@/lib/units';

import { ValueGrid } from './ValueGrid';

export interface MeasurementCardProps {
  data: MeasurementCardData;
  unit: Unit;
  onUpdate: () => void;
  onHistory: () => void;
  onDelete: () => void;
}

/** One cloth's current measurement on S21: name, date, 3-column grid, Update / History / Delete. */
export function MeasurementCard({
  data,
  unit,
  onUpdate,
  onHistory,
  onDelete,
}: MeasurementCardProps) {
  const { t } = useTranslation();
  const { measurement, garmentName, rows } = data;
  return (
    <Card testID={`measurement-${garmentName}`}>
      <View style={{ gap: 12 }}>
        <View>
          <Text variant="title-3" accessibilityRole="header">
            {garmentName}
          </Text>
          <Text variant="caption" color="text-muted">
            {t('measurements.measuredOn', { date: formatDate(measurement.measuredOn) })} ·{' '}
            {t(`common.${unit}`)}
          </Text>
        </View>
        <ValueGrid
          cells={rows.map((r) => ({
            key: r.fieldId,
            label: r.name,
            value: r.valueIn === null ? '—' : formatMeasurement(r.valueIn, unit),
          }))}
        />
        {measurement.notes ? (
          <Text variant="label" color="text-muted">
            {measurement.notes}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label={t('measurements.update')} size="sm" onPress={onUpdate} testID="m-update" />
          <Button
            label={t('measurements.history')}
            size="sm"
            variant="secondary"
            onPress={onHistory}
            testID="m-history"
          />
          <Button
            label={t('measurements.delete')}
            size="sm"
            variant="destructive"
            onPress={onDelete}
            testID="m-delete"
          />
        </View>
      </View>
    </Card>
  );
}
