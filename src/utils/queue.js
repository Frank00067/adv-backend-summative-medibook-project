const redis = require('../redis');

const waitlistKey = (doctorId, day) => `waitlist:${doctorId}:${day}`;
const PROMOTE_QUEUE = 'queue:promote';
const NOTIFY_QUEUE = 'queue:notify';

async function joinWaitlist({ patientId, doctorId, apptDatetime }) {
  const day = apptDatetime.slice(0, 10);
  const entry = JSON.stringify({ patient_id: patientId, doctor_id: doctorId, appt_datetime: apptDatetime });
  const items = await redis.lrange(waitlistKey(doctorId, day), 0, -1);
  if (items.includes(entry)) return { duplicate: true };
  const position = await redis.rpush(waitlistKey(doctorId, day), entry);
  return { position };
}

async function enqueuePromote(doctorId, apptDatetime) {
  await redis.rpush(PROMOTE_QUEUE, JSON.stringify({ doctor_id: doctorId, appt_datetime: apptDatetime }));
}

async function enqueueNotify(job) {
  await redis.rpush(NOTIFY_QUEUE, JSON.stringify(job));
}

module.exports = { joinWaitlist, enqueuePromote, enqueueNotify, waitlistKey, PROMOTE_QUEUE, NOTIFY_QUEUE };
