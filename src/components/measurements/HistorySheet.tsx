import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, EmptyState, Sheet, Text } from '@/components/ui';
import type { VersionRow } from '@/features/measurements/measurements.repo';
import { useVersions, type MeasurementCardData } from '@/features/measurements/useMeasurements';
import { formatDate } from '@/lib/dates';
import { formatMeasurement, type Unit } from '@/lib/units';

import { ValueGrid, type GridCell } from './ValueGrid';

export interface HistorySheetProps {
  visible: boolean;
  card: MeasurementCardData | null;
  unit: Unit;
  onClose: () => void;
  /** "Use this version": saves the old sizes as a new edit. */
  onUse: (version: VersionRow) => void;
}

type Sizes = Record<string, number>;

/**
 * Cells for one state of a measurement. A cell is highlighted — with "was 38" — when its value
 * changed compared with the older state (what this edit changed). `older` is null for the oldest.
 */
export function historyCells(
  fieldRows: { fieldId: string; name: string }[],
  sizes: Sizes,
  older: Sizes | null,
  unit: Unit,
): GridCell[] {
  const show = (n: number | undefined) => (n === undefined ? '—' : formatMeasurement(n, unit));
  return fieldRows.map((f) => {
    const now = sizes[f.fieldId];
    const before = older ? older[f.fieldId] : undefined;
    const changed = older !== null && now !== before;
    return {
      key: f.fieldId,
      label: f.name,
      value: show(now),
      changed,
      was: changed ? show(before) : undefined,
    };
  });
}

/** S24 Measurement history: current + older versions, newest first (max 10 kept). */
export function HistorySheet({ visible, card, unit, onClose, onUse }: HistorySheetProps) {
  const { t } = useTranslation();
  const versions = useVersions(visible && card ? card.measurement.id : null);
  if (!visible || !card) return null;

  const current: Sizes = Object.fromEntries(
    card.rows.filter((r) => r.valueIn !== null).map((r) => [r.fieldId, r.valueIn as number]),
  );
  const wasLabel = (v: string) => t('measurements.was', { value: v });

  return (
    <Sheet
      visible
      title={`${t('measurements.historyTitle')} · ${card.garmentName}`}
      onClose={onClose}
    >
      <Card>
        <View style={{ gap: 8 }}>
          <Text variant="title-3">{t('measurements.current')}</Text>
          <Text variant="caption" color="text-muted">
            {t('measurements.measuredOn', { date: formatDate(card.measurement.measuredOn) })}
          </Text>
          <ValueGrid
            cells={historyCells(card.rows, current, versions[0]?.values ?? null, unit)}
            wasLabel={wasLabel}
          />
        </View>
      </Card>
      {versions.length === 0 ? (
        <EmptyState
          icon="ruler"
          title={t('measurements.history')}
          text={t('measurements.historyEmpty')}
        />
      ) : (
        versions.map((v, i) => (
          <Card key={v.id} testID={`version-${i}`}>
            <View style={{ gap: 8 }}>
              <Text variant="title-3">
                {t('measurements.versionOf', { date: formatDate(v.measuredOn) })}
              </Text>
              {v.notes ? (
                <Text variant="label" color="text-muted">
                  {v.notes}
                </Text>
              ) : null}
              <ValueGrid
                cells={historyCells(card.rows, v.values, versions[i + 1]?.values ?? null, unit)}
                wasLabel={wasLabel}
              />
              <Button
                label={t('measurements.useVersion')}
                variant="secondary"
                size="sm"
                onPress={() => onUse(v)}
                testID={`use-version-${i}`}
              />
            </View>
          </Card>
        ))
      )}
    </Sheet>
  );
}
