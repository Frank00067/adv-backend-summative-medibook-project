const pool = require('../db');

async function create({ full_name, specialty, consultation_fee, room }) {
  const [r] = await pool.query(
    'INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES (?, ?, ?, ?)',
    [full_name, specialty, consultation_fee, room]
  );
  return r.insertId;
}

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM doctors ORDER BY doctor_id');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM doctors WHERE doctor_id = ?', [id]);
  return rows[0] || null;
}

async function update(id, { full_name, specialty, consultation_fee, room }) {
  await pool.query(
    'UPDATE doctors SET full_name = ?, specialty = ?, consultation_fee = ?, room = ? WHERE doctor_id = ?',
    [full_name, specialty, consultation_fee, room, id]
  );
}

async function remove(id) {
  await pool.query('DELETE FROM doctors WHERE doctor_id = ?', [id]);
}

module.exports = { create, findAll, findById, update, remove };
