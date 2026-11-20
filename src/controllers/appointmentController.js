const Appointment = require('../models/appointmentModel');
const AppError = require('../utils/AppError');
const { validateSlot } = require('../utils/slotValidation');

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

  // Normalise to "YYYY-MM-DD HH:MM:00" for MySQL
  const normalised = appt_datetime.trim().replace('T', ' ').slice(0, 16) + ':00';

  const result = await Appointment.book({
    patientId, doctorId, apptDatetime: normalised,
  });

  if (result.noDoctor) throw new AppError(404, 'Doctor not found');
  if (result.noPatient) throw new AppError(404, 'Patient not found');
  if (result.slotTaken) throw new AppError(409, 'This slot is already booked');
  if (result.full) throw new AppError(409, 'Doctor is fully booked for that day');

  res.status(201).json(await Appointment.findById(result.appointmentId));
};
