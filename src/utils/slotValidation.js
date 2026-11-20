const FORMAT = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

// Accepts "YYYY-MM-DD HH:MM" or "YYYY-MM-DDTHH:MM" (clinic local time).
// Last valid start is 16:30 because the slot must end by 17:00.
function validateSlot(input, now = new Date()) {
  if (typeof input !== 'string') return { valid: false, reason: 'Date/time is required' };
  const m = FORMAT.exec(input.trim());
  if (!m) return { valid: false, reason: 'Use format YYYY-MM-DD HH:MM' };

  const [y, mo, d, h, mi, s] = m.slice(1).map((v) => (v === undefined ? 0 : Number(v)));
  const date = new Date(y, mo - 1, d, h, mi, s);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d
      || date.getHours() !== h) {
    return { valid: false, reason: 'Not a real calendar date/time' };
  }
  if (s !== 0 || (mi !== 0 && mi !== 30)) {
    return { valid: false, reason: 'Slots start on the hour or half hour' };
  }
  const minutes = h * 60 + mi;
  if (minutes < 9 * 60 || minutes > 16 * 60 + 30) {
    return { valid: false, reason: 'Working hours are 09:00-17:00 (last slot 16:30)' };
  }
  if (date <= now) return { valid: false, reason: 'Appointment must be in the future' };
  return { valid: true, date };
}

module.exports = { validateSlot };
