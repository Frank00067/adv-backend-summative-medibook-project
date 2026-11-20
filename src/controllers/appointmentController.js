const Appointment = require('../models/appointmentModel');
const AppError = require('../utils/AppError');
const { validateSlot } = require('../utils/slotValidation');
const { calculateRefund } = require('../utils/refund');
const { audit } = require('../utils/auditLogger');
const queue = require('../utils/queue');

function fullError(message) {
  const e = new AppError(409, message);
  e.waitlistOffered = true;
  return e;
}

exports.book = async (req, res) => {
  const { patient_id, doctor_id, appt_datetime } = req.body || {};
  const patientId = Number(patient_id);
  const doctorId = Number(doctor_id);
  if (!Number.isInteger(patientId) || patientId < 1) {
    throw new AppError(400, 'patient_id must be a positive integer');
  }
  if (!Number.isInteger(doctorId) || doctorId < 1) {
    throw new AppError(400, 'doctor_id must be a positive integer');
  }
  const check = validateSlot(appt_datetime);
  if (!check.valid) throw new AppError(422, check.reason);

  const normalised = appt_datetime.trim().replace('T', ' ').slice(0, 16) + ':00';

  const result = await Appointment.book({ patientId, doctorId, apptDatetime: normalised });

  if (result.noDoctor) throw new AppError(404, 'Doctor not found');
  if (result.noPatient) throw new AppError(404, 'Patient not found');
  if (result.slotTaken) throw fullError('This slot is already booked. Join the waitlist via POST /api/waitlist');
  if (result.full) throw fullError('Doctor is fully booked for that day. Join the waitlist via POST /api/waitlist');

  const appt = await Appointment.findById(result.appointmentId);
  audit('booking', {
    appointment_id: appt.appointment_id,
    patient_id: patientId,
    doctor_id: doctorId,
    appt_datetime: appt.appt_datetime,
    amount_paid: appt.amount_paid,
  });
  queue.enqueueNotify({
    type: 'confirmation',
    appointment_id: appt.appointment_id,
    patient_id: patientId,
    doctor_id: doctorId,
    appt_datetime: appt.appt_datetime,
  }).catch((e) => console.error('Notify enqueue failed:', e.message));
  res.status(201).json(appt);
};

exports.cancel = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'id must be a positive integer');

  const result = await Appointment.cancel(id, (a) =>
    calculateRefund(a.amount_paid, a.appt_datetime.replace(' ', 'T'))
  );
  if (result.notFound) throw new AppError(404, 'Appointment not found');
  if (result.already) throw new AppError(409, 'Appointment is already cancelled');

  audit('cancellation', {
    appointment_id: id,
    patient_id: result.appt.patient_id,
    doctor_id: result.appt.doctor_id,
    refund_percent: result.percent,
    refund_amount: result.amount,
  });
  queue.enqueuePromote(result.appt.doctor_id, result.appt.appt_datetime)
    .catch((e) => console.error('Promote enqueue failed:', e.message));
  res.json({
    appointment_id: id,
    status: 'cancelled',
    refund_percent: result.percent,
    refund_amount: result.amount,
  });
};
