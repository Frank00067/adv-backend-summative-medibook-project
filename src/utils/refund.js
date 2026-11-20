// Policy: more than 48h -> 100%; 24h up to and including 48h -> 50%; under 24h -> 0%.
// Exactly 48h falls in the 50% tier ("more than 48" is not met).
// Exactly 24h falls in the 50% tier ("less than 24" is not met).
function getRefundPercent(apptDatetime, now = new Date()) {
  const hours = (new Date(apptDatetime) - new Date(now)) / 36e5;
  if (Number.isNaN(hours)) throw new Error('Invalid date');
  if (hours > 48) return 100;
  if (hours >= 24) return 50;
  return 0;
}

function calculateRefund(amountPaid, apptDatetime, now = new Date()) {
  const percent = getRefundPercent(apptDatetime, now);
  const cents = Math.round(Number(amountPaid) * 100);
  const refundCents = Math.round((cents * percent) / 100);
  return { percent, amount: refundCents / 100 };
}

module.exports = { getRefundPercent, calculateRefund };
