const Patient = require('../models/patientModel');
const AppError = require('../utils/AppError');

function validate(body) {
  const { full_name, email, phone } = body || {};
  if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.length > 100) {
    throw new AppError(400, 'full_name is required (2-100 characters)');
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
    throw new AppError(400, 'email is required and must be a valid address');
  }
  if (typeof phone !== 'string' || !/^[0-9+\-\s]{7,20}$/.test(phone)) {
    throw new AppError(400, 'phone is required (7-20 digits, spaces, + or -)');
  }
  return { full_name: full_name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() };
}

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'id must be a positive integer');
  return id;
}

async function getOrThrow(id) {
  const patient = await Patient.findById(id);
  if (!patient) throw new AppError(404, 'Patient not found');
  return patient;
}

exports.create = async (req, res) => {
  const data = validate(req.body);
  const id = await Patient.create(data);
  res.status(201).json(await Patient.findById(id));
};

exports.list = async (req, res) => {
  res.json(await Patient.findAll());
};

exports.get = async (req, res) => {
  res.json(await getOrThrow(parseId(req.params.id)));
};

exports.update = async (req, res) => {
  const id = parseId(req.params.id);
  const data = validate(req.body);
  await getOrThrow(id);
  await Patient.update(id, data);
  res.json(await Patient.findById(id));
};

exports.remove = async (req, res) => {
  const id = parseId(req.params.id);
  await getOrThrow(id);
  await Patient.remove(id);
  res.status(204).end();
};
