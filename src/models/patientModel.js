const pool = require('../db');

async function create({ full_name, email, phone }) {
  const [r] = await pool.query(
    'INSERT INTO patients (full_name, email, phone) VALUES (?, ?, ?)',
    [full_name, email, phone]
  );
  return r.insertId;
}

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM patients ORDER BY patient_id');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM patients WHERE patient_id = ?', [id]);
  return rows[0] || null;
}

async function update(id, { full_name, email, phone }) {
  await pool.query(
    'UPDATE patients SET full_name = ?, email = ?, phone = ? WHERE patient_id = ?',
    [full_name, email, phone, id]
  );
}

async function remove(id) {
  await pool.query('DELETE FROM patients WHERE patient_id = ?', [id]);
}

module.exports = { create, findAll, findById, update, remove };
