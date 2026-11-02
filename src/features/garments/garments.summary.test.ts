import type { FieldRow, GarmentRow } from './garments.repo';
import { summarizeFields, summarizeGarments } from './garments.summary';

const g = (id: string, name: string) => ({ id, name }) as GarmentRow;
const f = (id: string, garmentTypeId: string) => ({ id, garmentTypeId }) as FieldRow;

describe('garment summaries (S25 / S26 counts)', () => {
  it('counts fields and distinct customers per cloth', () => {
    const out = summarizeGarments(
      [g('shirt', 'Shirt'), g('pant', 'Pant'), g('kurta', 'Kurta')],
      [f('1', 'shirt'), f('2', 'shirt'), f('3', 'pant')],
      [
        { customerId: 'a', garmentTypeId: 'shirt' },
        { customerId: 'a', garmentTypeId: 'shirt' }, // same customer twice → once
        { customerId: 'b', garmentTypeId: 'shirt' },
        { customerId: 'a', garmentTypeId: 'pant' },
      ],
    );
    expect(out.map((s) => [s.garment.name, s.fieldCount, s.customerCount])).toEqual([
      ['Shirt', 2, 2],
      ['Pant', 1, 1],
      ['Kurta', 0, 0],
    ]);
  });

  it('counts saved measurements per field', () => {
    const out = summarizeFields(
      [f('chest', 'shirt'), f('waist', 'shirt')],
      [{ fieldId: 'chest' }, { fieldId: 'chest' }, { fieldId: 'other' }],
    );
    expect(out.map((s) => [s.field.id, s.measurementCount])).toEqual([
      ['chest', 2],
      ['waist', 0],
    ]);
  });
});
