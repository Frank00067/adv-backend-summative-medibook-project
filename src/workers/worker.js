require('dotenv').config();
const redis = require('../redis');
const pool = require('../db');
const Appointment = require('../models/appointmentModel');
const { audit } = require('../utils/auditLogger');
const queue = require('../utils/queue');

const PROCESSING = 'waitlist:processing';
const MAX_ATTEMPTS = 3;
let running = true;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Atomically return a patient to the FRONT of their waitlist.
async function giveBack(key, entry) {
  await redis.multi().lpush(key, entry).lrem(PROCESSING, 1, entry).exec();
}

// After a crash, anything left in the processing list goes back to its waitlist.
async function recoverStuck() {
  let entry;
  while ((entry = await redis.rpop(PROCESSING))) {
    const e = JSON.parse(entry);
    await redis.lpush(queue.waitlistKey(e.doctor_id, e.appt_datetime.slice(0, 10)), entry);
    console.log('Recovered waitlist entry for patient', e.patient_id);
  }
}

async function promote(job) {
  const key = queue.waitlistKey(job.doctor_id, job.appt_datetime.slice(0, 10));
  for (;;) {
    // Move, don't pop: the patient is never in neither list.
    const entry = await redis.lmove(key, PROCESSING, 'LEFT', 'RIGHT');
    if (!entry) return; // nobody waiting
    const w = JSON.parse(entry);

    let result;
    try {
      result = await Appointment.book({
        patientId: w.patient_id,
        doctorId: w.doctor_id,
        apptDatetime: job.appt_datetime,
      });
    } catch (err) {
      await giveBack(key, entry); // e.g. database down: keep the patient queued
      throw err;
    }

    if (result.appointmentId) {
      await redis.lrem(PROCESSING, 1, entry); // success: now it is safe to drop
      const appt = await Appointment.findById(result.appointmentId);
      await audit('booking', {
        appointment_id: appt.appointment_id,
        patient_id: w.patient_id,
        doctor_id: w.doctor_id,
        appt_datetime: appt.appt_datetime,
        amount_paid: appt.amount_paid,
        promoted_from_waitlist: true,
      });
      await queue.enqueueNotify({
        type: 'confirmation',
        appointment_id: appt.appointment_id,
        patient_id: w.patient_id,
        doctor_id: w.doctor_id,
        appt_datetime: appt.appt_datetime,
      });
      console.log('Promoted patient', w.patient_id, 'into', appt.appt_datetime);
      return;
    }

    if (result.noPatient || result.noDoctor) {
      // Patient or doctor was deleted: the entry can never succeed, so drop it and try the next.
      await redis.lrem(PROCESSING, 1, entry);
      await audit('waitlist_dropped', { patient_id: w.patient_id, doctor_id: w.doctor_id });
      continue;
    }

    // Slot retaken or day full again: the patient keeps their place at the front.
    await giveBack(key, entry);
    await audit('promotion_failed', {
      patient_id: w.patient_id,
      doctor_id: w.doctor_id,
      appt_datetime: job.appt_datetime,
      reason: result.slotTaken ? 'slot_taken' : 'day_full',
    });
    console.log('Promotion failed for patient', w.patient_id, '- returned to waitlist');
    return;
  }
}

async function notify(job) {
  await audit('notification', {
    channel: 'email',
    appointment_id: job.appointment_id,
    patient_id: job.patient_id,
    message: `Confirmation: appointment #${job.appointment_id} with doctor ${job.doctor_id} at ${job.appt_datetime} is confirmed.`,
  });
  console.log('Notification written for appointment', job.appointment_id);
}

async function main() {
  await recoverStuck();
  const blocking = redis.duplicate(); // blocking commands need their own connection
  console.log('Worker started, waiting for jobs...');

  while (running) {
    let item;
    try {
      item = await blocking.blpop(queue.PROMOTE_QUEUE, queue.NOTIFY_QUEUE, 5);
    } catch (err) {
      console.error('Queue read failed:', err.message);
      await sleep(1000);
      continue;
    }
    if (!item) continue;

    const [q, raw] = item;
    let job;
    try {
      job = JSON.parse(raw);
      if (q === queue.PROMOTE_QUEUE) await promote(job);
      else await notify(job);
    } catch (err) {
      console.error('Job failed:', err.message);
      if (job && (job.attempts || 0) + 1 < MAX_ATTEMPTS) {
        job.attempts = (job.attempts || 0) + 1;
        await redis.rpush(q, JSON.stringify(job));
      } else {
        await audit('job_failed', { queue: q, job: job || raw, error: err.message });
      }
    }
  }

  blocking.disconnect();
  redis.disconnect();
  await pool.end();
  console.log('Worker stopped');
}

process.on('SIGINT', () => { running = false; });
process.on('SIGTERM', () => { running = false; });

main().catch((err) => { console.error(err); process.exit(1); });
