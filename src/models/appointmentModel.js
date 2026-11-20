const pool = require('../db');

// Books a slot atomically. Returns { appointmentId } or { full } / { slotTaken } / { noDoctor } / { noPatient }.
async function book({ patientId, doctorId, apptDatetime }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the doctor row: bookings for the same doctor are serialized,
    // so the daily count below cannot be raced.
    const [docs] = await conn.query(
      'SELECT doctor_id, consultation_fee FROM doctors WHERE doctor_id = ? FOR UPDATE',
      [doctorId]
    );
    if (docs.length === 0) { await conn.rollback(); return { noDoctor: true }; }

    const [pats] = await conn.query(
      'SELECT patient_id FROM patients WHERE patient_id = ?', [patientId]
    );
    if (pats.length === 0) { await conn.rollback(); return { noPatient: true }; }

    const [[{ cnt }]] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM appointments
       WHERE doctor_id = ? AND status = 'booked' AND DATE(appt_datetime) = DATE(?)`,
      [doctorId, apptDatetime]
    );
    if (cnt >= 12) { await conn.rollback(); return { full: true }; }

    try {
      const [r] = await conn.query(
        `INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid)
         VALUES (?, ?, ?, ?)`,
        [patientId, doctorId, apptDatetime, docs[0].consultation_fee]
      );
      await conn.commit();
      return { appointmentId: r.insertId };
    } catch (err) {
      await conn.rollback();
      // Unique index on (doctor_id, active_slot): slot already held
      if (err.code === 'ER_DUP_ENTRY') return { slotTaken: true };
      throw err;
    }
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    throw err;
  } finally {
    conn.release();
  }
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM appointments WHERE appointment_id = ?', [id]
  );
  return rows[0] || null;
}

module.exports = { book, findById };
