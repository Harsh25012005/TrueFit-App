import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FieldRow } from '@/components/garments/FieldRow';
import { GarmentSheet } from '@/components/garments/GarmentSheet';
import {
  Avatar,
  Button,
  Card,
  Dialog,
  Input,
  SectionHeader,
  Sheet,
  Text,
  TopBar,
} from '@/components/ui';
import type { FieldRow as Field } from '@/features/garments/garments.repo';
import { garmentActions, garmentErrorKey, useGarmentDetail } from '@/features/garments/useGarments';
import { showToast } from '@/stores/ui.store';
import { useColors } from '@/theme/colors';

/** S26 Cloth type detail (DESIGN.md §7): fields with ↑↓ reorder, add field, rename & styles. */
export default function ClothTypeDetailScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { garment, fields, customerCount } = useGarmentDetail(id);

  const [newField, setNewField] = useState('');
  const [addError, setAddError] = useState<string | undefined>();
  const [editing, setEditing] = useState<Field | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | undefined>();
  const [confirmDeleteField, setConfirmDeleteField] = useState<Field | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDeleteCloth, setConfirmDeleteCloth] = useState(false);
  const [clothError, setClothError] = useState<string | undefined>();

  if (!garment) {
    // Deleted (or not loaded yet): nothing to show.
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  function addField() {
    if (!newField.trim()) return;
    try {
      garmentActions.addField(garment!.id, newField);
      setNewField('');
      setAddError(undefined);
    } catch (e) {
      setAddError(t(garmentErrorKey(e)));
    }
  }

  function openEdit(field: Field) {
    setEditing(field);
    setEditName(field.name);
    setEditError(undefined);
  }

  function saveEdit() {
    if (!editing) return;
    try {
      garmentActions.renameField(editing.id, editName);
      setEditing(null);
    } catch (e) {
      setEditError(t(garmentErrorKey(e)));
    }
  }

  function deleteField() {
    if (!confirmDeleteField) return;
    garmentActions.deleteField(confirmDeleteField.id);
    setConfirmDeleteField(null);
    setEditing(null);
  }

  function deleteCloth() {
    try {
      garmentActions.deleteGarment(garment!.id);
      setConfirmDeleteCloth(false);
      showToast({ message: t('common.done'), kind: 'success' });
      router.back();
    } catch (e) {
      setConfirmDeleteCloth(false);
      setClothError(t(garmentErrorKey(e)));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title={garment.name} onBack={() => router.back()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 112 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={garment.name} />
          <View style={{ flex: 1 }}>
            <Text variant="title-1" accessibilityRole="header" numberOfLines={1}>
              {garment.name}
            </Text>
            <Text variant="label" color="text-muted">
              {t('garments.counts', { fields: fields.length, customers: customerCount })}
            </Text>
          </View>
        </View>

        <Text variant="label" color="text-muted">
          {t('garments.hint')}
        </Text>

        <View>
          <SectionHeader title={t('garments.fieldsHeader')} />
          <Card variant="list">
            {fields.map(({ field, measurementCount }, index) => (
              <FieldRow
                key={field.id}
                number={index + 1}
                name={field.name}
                measurementCount={measurementCount}
                canMoveUp={index > 0}
                canMoveDown={index < fields.length - 1}
                onMoveUp={() => garmentActions.moveField(field.id, 'up')}
                onMoveDown={() => garmentActions.moveField(field.id, 'down')}
                onEdit={() => openEdit(field)}
                testID={`field-${field.name}`}
              />
            ))}
          </Card>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Input
              label={t('garments.newField')}
              placeholder={t('garments.newFieldPlaceholder')}
              value={newField}
              onChangeText={(v) => {
                setNewField(v);
                setAddError(undefined);
              }}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={addField}
              error={addError}
              testID="new-field"
            />
          </View>
          <View style={{ marginTop: 26 }}>
            <Button label={t('common.add')} onPress={addField} testID="add-field" />
          </View>
        </View>

        <Button
          label={t('garments.moreButton')}
          variant="secondary"
          fullWidth
          onPress={() => setDetailsOpen(true)}
          testID="more-button"
        />
        <Button
          label={t('garments.deleteCloth')}
          icon="trash"
          variant="destructive"
          fullWidth
          onPress={() => setConfirmDeleteCloth(true)}
        />
        {clothError ? (
          <Text variant="caption" color="error" accessibilityLiveRegion="polite">
            {clothError}
          </Text>
        ) : null}
      </ScrollView>

      <Sheet
        visible={editing !== null}
        title={t('garments.renameFieldTitle')}
        onClose={() => setEditing(null)}
        dirty={editing !== null && editName !== editing.name}
        footer={
          <>
            <Button
              label={t('common.delete')}
              variant="destructive"
              onPress={() => setConfirmDeleteField(editing)}
              testID="delete-field"
            />
            <Button label={t('common.save')} onPress={saveEdit} testID="save-field" />
          </>
        }
      >
        <Input
          label={t('garments.fieldName')}
          value={editName}
          onChangeText={(v) => {
            setEditName(v);
            setEditError(undefined);
          }}
          maxLength={30}
          error={editError}
          testID="edit-field-name"
        />
      </Sheet>

      <GarmentSheet
        visible={detailsOpen}
        garment={garment}
        onClose={() => setDetailsOpen(false)}
        onSave={(patch) => garmentActions.updateGarment(garment.id, patch)}
      />

      <Dialog
        visible={confirmDeleteField !== null}
        title={t('garments.deleteFieldTitle')}
        message={t('garments.deleteFieldText')}
        actions={[{ label: t('common.delete'), variant: 'destructive', onPress: deleteField }]}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirmDeleteField(null)}
      />
      <Dialog
        visible={confirmDeleteCloth}
        title={t('garments.deleteClothTitle')}
        message={t('garments.deleteClothText')}
        actions={[{ label: t('common.delete'), variant: 'destructive', onPress: deleteCloth }]}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirmDeleteCloth(false)}
      />
    </View>
  );
}
