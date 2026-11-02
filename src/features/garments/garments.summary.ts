import type { FieldRow, GarmentRow } from './garments.repo';

export interface GarmentSummary {
  garment: GarmentRow;
  fieldCount: number;
  customerCount: number;
}

export interface FieldSummary {
  field: FieldRow;
  measurementCount: number;
}

/** "7 fields · 8 customers" for S25: customers = distinct customers with a saved measurement. */
export function summarizeGarments(
  garments: GarmentRow[],
  fields: Pick<FieldRow, 'garmentTypeId'>[],
  pairs: { customerId: string; garmentTypeId: string }[],
): GarmentSummary[] {
  const fieldCounts = new Map<string, number>();
  for (const f of fields)
    fieldCounts.set(f.garmentTypeId, (fieldCounts.get(f.garmentTypeId) ?? 0) + 1);
  const customers = new Map<string, Set<string>>();
  for (const p of pairs) {
    const set = customers.get(p.garmentTypeId) ?? new Set<string>();
    set.add(p.customerId);
    customers.set(p.garmentTypeId, set);
  }
  return garments.map((garment) => ({
    garment,
    fieldCount: fieldCounts.get(garment.id) ?? 0,
    customerCount: customers.get(garment.id)?.size ?? 0,
  }));
}

/** "8 measurements" per field on S26: live saved values for that field. */
export function summarizeFields(
  fields: FieldRow[],
  valueFieldIds: { fieldId: string }[],
): FieldSummary[] {
  const counts = new Map<string, number>();
  for (const v of valueFieldIds) counts.set(v.fieldId, (counts.get(v.fieldId) ?? 0) + 1);
  return fields.map((field) => ({ field, measurementCount: counts.get(field.id) ?? 0 }));
}
