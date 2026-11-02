import migrations from './migrations/migrations';

describe('bundled device migrations', () => {
  it('loads every journal entry as SQL text (as Metro bundles it)', () => {
    const { journal, migrations: files } = migrations;
    expect(journal.entries.length).toBeGreaterThan(0);
    for (const entry of journal.entries) {
      const key = `m${String(entry.idx).padStart(4, '0')}`;
      expect(typeof files[key as keyof typeof files]).toBe('string');
      expect(files[key as keyof typeof files]).toContain('CREATE TABLE');
    }
  });
});
