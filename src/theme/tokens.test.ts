import { readFileSync } from 'fs';
import { join } from 'path';

import { palette, radius, spacing, typeScale } from './tokens';

const design = readFileSync(join(__dirname, '../../DESIGN.md'), 'utf8');

function section(title: string): string {
  const start = design.indexOf(title);
  const end = design.indexOf('\n## ', start + 1);
  return design.slice(start, end);
}

describe('tokens match DESIGN.md', () => {
  it('has every §2 colour with the exact light and dark value', () => {
    const rows = [
      ...section('## 2. Colour palette').matchAll(
        /^\| `([a-z-]+)` \|[^|]*\| `([^`]+)` \| `([^`]+)` \|$/gm,
      ),
    ];
    const fromDoc: Record<string, { light?: string; dark?: string }> = Object.fromEntries(
      rows.map(([, token, light, dark]) => [token, { light, dark }]),
    );
    delete fromDoc['ai-gradient']; // V2 only, not a flat colour

    expect(Object.keys(palette.light).sort()).toEqual(Object.keys(fromDoc).sort());
    for (const [token, { light, dark }] of Object.entries(fromDoc)) {
      const key = token as keyof typeof palette.light;
      expect([token, palette.light[key]]).toEqual([token, light]);
      expect([token, palette.dark[key]]).toEqual([token, dark]);
    }
  });

  it('has the §3 type scale', () => {
    const rows = [
      ...section('## 3. Typography').matchAll(/^\| `([a-z0-9-]+)` \| (\d+) \| (\d+) \| (\d+) \|/gm),
    ];
    expect(rows.length).toBe(Object.keys(typeScale).length);
    for (const [, token, size, lineHeight, weight] of rows) {
      expect(typeScale[token as keyof typeof typeScale]).toMatchObject({
        size: Number(size),
        lineHeight: Number(lineHeight),
        weight,
      });
    }
  });

  it('has the §4 spacing scale and radii', () => {
    const line = /\*\*Spacing \(4-pt grid\):\*\* (.+)\./.exec(design)?.[1] ?? '';
    const fromDoc = Object.fromEntries(
      [...line.matchAll(/`(\d+)` (\d+)/g)].map(([, k, v]) => [k, Number(v)]),
    );
    expect(spacing).toEqual(fromDoc);
    expect(radius).toEqual({ none: 0, sm: 2, md: 4 });
  });
});
