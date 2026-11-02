import { formatMoney, groupIndian, parseMoney } from './money';

describe('money (FEATURES.md M13, TESTING.md L2)', () => {
  it('L2: lakh grouping', () => {
    expect(formatMoney(125000)).toBe('₹1,25,000');
    expect(formatMoney(0)).toBe('₹0');
    expect(formatMoney(950)).toBe('₹950');
    expect(formatMoney(1000)).toBe('₹1,000');
    expect(formatMoney(100000)).toBe('₹1,00,000');
    expect(formatMoney(12345678)).toBe('₹1,23,45,678');
  });

  it('refunds are shown with a minus sign', () => {
    expect(formatMoney(-500)).toBe('−₹500');
    expect(formatMoney(-0)).toBe('₹0');
  });

  it('groups digit strings and parses amounts from text', () => {
    expect(groupIndian('99')).toBe('99');
    expect(groupIndian('1234')).toBe('1,234');
    expect(parseMoney('₹1,250')).toBe(1250);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });
});
