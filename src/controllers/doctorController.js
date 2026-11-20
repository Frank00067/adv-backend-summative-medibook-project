const Doctor = require('../models/doctorModel');
const AppError = require('../utils/AppError');

function validate(body) {
  const { full_name, specialty, consultation_fee, room } = body || {};
  if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.length > 100) {
    throw new AppError(400, 'full_name is required (2-100 characters)');
  }
  if (typeof specialty !== 'string' || specialty.trim().length < 2 || specialty.length > 80) {
    throw new AppError(400, 'specialty is required (2-80 characters)');
  }
  const fee = Number(consultation_fee);
  if (consultation_fee === undefined || consultation_fee === null || consultation_fee === ''
      || !Number.isFinite(fee) || fee < 0 || fee > 99999999) {
    throw new AppError(400, 'consultation_fee is required and must be a number >= 0');
  }
  if (typeof room !== 'string' || room.trim().length < 1 || room.length > 10) {
    throw new AppError(400, 'room is required (1-10 characters)');
  }
  return {
    full_name: full_name.trim(),
    specialty: specialty.trim(),
    consultation_fee: Math.round(fee * 100) / 100,
    room: room.trim(),
  };
}

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'id must be a positive integer');
  return id;
}

async function getOrThrow(id) {
  const doctor = await Doctor.findById(id);
  if (!doctor) throw new AppError(404, 'Doctor not found');
  return doctor;
}

exports.create = async (req, res) => {
  const id = await Doctor.create(validate(req.body));
  res.status(201).json(await Doctor.findById(id));
};

exports.list = async (req, res) => {
  res.json(await Doctor.findAll());
};

exports.get = async (req, res) => {
  res.json(await getOrThrow(parseId(req.params.id)));
};

exports.update = async (req, res) => {
  const id = parseId(req.params.id);
  const data = validate(req.body);
  await getOrThrow(id);
  await Doctor.update(id, data);
  res.json(await Doctor.findById(id));
};

exports.remove = async (req, res) => {
  const id = parseId(req.params.id);
  await getOrThrow(id);
  await Doctor.remove(id);
  res.status(204).end();
};
