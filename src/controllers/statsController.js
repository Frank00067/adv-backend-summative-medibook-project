const Stats = require('../models/statsModel');
const Doctor = require('../models/doctorModel');
const AppError = require('../utils/AppError');

exports.doctorStats = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'id must be a positive integer');
  if (!(await Doctor.findById(id))) throw new AppError(404, 'Doctor not found');

  const [summary, days] = await Promise.all([Stats.summary(id), Stats.nextSevenDays(id)]);
  res.json({ ...summary, next_7_days: days });
};

exports.doctorsReport = async (req, res) => {
  res.json(await Stats.doctorsReport());
};

exports.busyDays = async (req, res) => {
  res.json(await Stats.busyDays());
};
