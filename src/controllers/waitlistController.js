const Doctor = require('../models/doctorModel');
const Patient = require('../models/patientModel');
const AppError = require('../utils/AppError');
const { validateSlot } = require('../utils/slotValidation');
const queue = require('../utils/queue');

exports.join = async (req, res) => {
  const { patient_id, doctor_id, appt_datetime } = req.body || {};
  const patientId = Number(patient_id);
  const doctorId = Number(doctor_id);
  if (!Number.isInteger(patientId) || patientId < 1) throw new AppError(400, 'patient_id must be a positive integer');
  if (!Number.isInteger(doctorId) || doctorId < 1) throw new AppError(400, 'doctor_id must be a positive integer');
  const check = validateSlot(appt_datetime);
  if (!check.valid) throw new AppError(422, check.reason);
  if (!(await Doctor.findById(doctorId))) throw new AppError(404, 'Doctor not found');
  if (!(await Patient.findById(patientId))) throw new AppError(404, 'Patient not found');

  const normalised = appt_datetime.trim().replace('T', ' ').slice(0, 16) + ':00';
  const r = await queue.joinWaitlist({ patientId, doctorId, apptDatetime: normalised });
  if (r.duplicate) throw new AppError(409, 'Patient is already on this waitlist');
  res.status(201).json({ waitlisted: true, position: r.position });
};
