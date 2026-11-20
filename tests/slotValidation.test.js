const { validateSlot } = require('../src/utils/slotValidation');

const now = new Date('2026-11-17T12:00:00');

describe('slot validation', () => {
  test('accepts a valid slot', () => {
    expect(validateSlot('2026-12-01 09:00', now).valid).toBe(true);
  });
  test('accepts the last slot, 16:30', () => {
    expect(validateSlot('2026-12-01 16:30', now).valid).toBe(true);
  });
  test('rejects 17:00 exactly (no time left for a slot)', () => {
    expect(validateSlot('2026-12-01 17:00', now).valid).toBe(false);
  });
  test('rejects 09:15 (not on a 30-minute boundary)', () => {
    expect(validateSlot('2026-12-01 09:15', now).valid).toBe(false);
  });
  test('rejects 08:30 (before opening)', () => {
    expect(validateSlot('2026-12-01 08:30', now).valid).toBe(false);
  });
  test('rejects malformed input', () => {
    expect(validateSlot('tomorrow at nine', now).valid).toBe(false);
    expect(validateSlot(null, now).valid).toBe(false);
  });
  test('rejects impossible dates like Feb 30', () => {
    expect(validateSlot('2026-02-30 10:00', now).valid).toBe(false);
  });
  test('rejects past times', () => {
    expect(validateSlot('2026-11-10 10:00', now).valid).toBe(false);
  });
});
