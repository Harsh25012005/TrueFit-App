import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Input, Sheet } from '@/components/ui';
import { garmentErrorKey } from '@/features/garments/useGarments';
import {
  formatStyleText,
  parseStyleText,
  type GarmentPatch,
} from '@/features/garments/garments.schema';
import type { GarmentRow } from '@/features/garments/garments.repo';

export interface GarmentSheetProps {
  visible: boolean;
  /** The cloth being edited ("Rename, styles & more", S26). */
  garment: GarmentRow;
  onClose: () => void;
  /** Saves the patch; throws an AppError on a validation or duplicate-name problem. */
  onSave: (patch: GarmentPatch) => void;
}

/**
 * Sheet with name, fabric per piece and style options (DESIGN.md S26). The form mounts fresh
 * every time it opens, so it always starts from the saved values.
 */
export function GarmentSheet(props: GarmentSheetProps) {
  return props.visible ? <GarmentSheetForm {...props} /> : null;
}

function GarmentSheetForm({ visible, garment, onClose, onSave }: GarmentSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(garment.name);
  const [fabric, setFabric] = useState(String(garment.fabricPerPieceM));
  const [styles, setStyles] = useState(formatStyleText(garment.styleOptions));
  const [error, setError] = useState<{ field: 'name' | 'fabric'; key: string } | null>(null);

  const dirty =
    name !== garment.name ||
    fabric !== String(garment.fabricPerPieceM) ||
    styles !== formatStyleText(garment.styleOptions);

  function save() {
    const fabricNumber = Number(fabric.replace(',', '.'));
    try {
      onSave({ name, fabricPerPieceM: fabricNumber, styleOptions: parseStyleText(styles) });
      onClose();
    } catch (e) {
      const key = garmentErrorKey(e);
      setError({ field: key === 'garments.errors.fabric' ? 'fabric' : 'name', key });
    }
  }

  return (
    <Sheet
      visible={visible}
      title={t('garments.sheetTitle')}
      onClose={onClose}
      dirty={dirty}
      footer={
        <>
          <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
          <Button label={t('common.save')} onPress={save} testID="garment-save" />
        </>
      }
    >
      <Input
        label={t('garments.clothName')}
        value={name}
        onChangeText={setName}
        maxLength={30}
        error={error?.field === 'name' ? t(error.key) : undefined}
        testID="garment-name"
      />
      <Input
        label={t('garments.fabric')}
        value={fabric}
        onChangeText={setFabric}
        keyboardType="decimal-pad"
        suffix="m"
        error={error?.field === 'fabric' ? t(error.key) : undefined}
        testID="garment-fabric"
      />
      <Input
        label={t('garments.styles')}
        value={styles}
        onChangeText={setStyles}
        multiline
        autoCapitalize="sentences"
        hint={t('garments.stylesHint')}
        testID="garment-styles"
      />
    </Sheet>
  );
}
