const { getRefundPercent, calculateRefund } = require('../src/utils/refund');

const appt = new Date('2026-12-10T10:00:00');
const hoursBefore = (h) => new Date(appt.getTime() - h * 36e5);

describe('refund calculator', () => {
  test('more than 48h gives 100%', () => {
    expect(calculateRefund(150, appt, hoursBefore(72))).toEqual({ percent: 100, amount: 150 });
  });
  test('just over 48h (48h + 1 min) gives 100%', () => {
    expect(getRefundPercent(appt, new Date(appt - (48 * 60 + 1) * 6e4))).toBe(100);
  });
  test('exactly 48h gives 50% (policy: "more than 48" for full refund)', () => {
    expect(getRefundPercent(appt, hoursBefore(48))).toBe(50);
  });
  test('between 24h and 48h gives 50%', () => {
    expect(calculateRefund(150, appt, hoursBefore(36))).toEqual({ percent: 50, amount: 75 });
  });
  test('exactly 24h gives 50% (policy: only "less than 24" gets nothing)', () => {
    expect(getRefundPercent(appt, hoursBefore(24))).toBe(50);
  });
  test('under 24h gives 0%', () => {
    expect(calculateRefund(150, appt, new Date(appt - (24 * 60 - 1) * 6e4)))
      .toEqual({ percent: 0, amount: 0 });
  });
});
