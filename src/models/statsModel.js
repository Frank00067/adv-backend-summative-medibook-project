const pool = require('../db');

const DAILY_CAP = 12;

// Revenue = amount_paid of booked appointments minus refunds on cancelled ones.
async function summary(doctorId) {
  const [rows] = await pool.query(
    `SELECT d.doctor_id, d.full_name,
            COALESCE(SUM(a.amount_paid), 0) - COALESCE(SUM(a.refund_amount), 0)
              AS revenue_collected,
            COALESCE(SUM(a.status = 'booked' AND a.appt_datetime > NOW()), 0)
              AS upcoming_appointments
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
     WHERE d.doctor_id = ?
     GROUP BY d.doctor_id, d.full_name`,
    [doctorId]
  );
  return rows[0] || null;
}

async function nextSevenDays(doctorId) {
  const [rows] = await pool.query(
    `SELECT DATE(a.appt_datetime) AS day,
            COUNT(*) AS appointments,
            ROUND(COUNT(*) / ? * 100, 1) AS utilization_percent
     FROM appointments a
     WHERE a.doctor_id = ? AND a.status = 'booked'
       AND a.appt_datetime >= CURDATE()
       AND a.appt_datetime < DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     GROUP BY DATE(a.appt_datetime)
     ORDER BY day`,
    [DAILY_CAP, doctorId]
  );
  return rows;
}

async function doctorsReport() {
  const [rows] = await pool.query(
    `SELECT d.doctor_id, d.full_name, d.specialty,
            COALESCE(SUM(a.status = 'booked'), 0) AS total_appointments,
            COALESCE(SUM(a.amount_paid), 0) - COALESCE(SUM(a.refund_amount), 0)
              AS revenue_collected
     FROM doctors d
     LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
     GROUP BY d.doctor_id, d.full_name, d.specialty
     ORDER BY d.doctor_id`
  );
  return rows;
}

async function busyDays() {
  const [rows] = await pool.query(
    `SELECT d.doctor_id, d.full_name, DATE(a.appt_datetime) AS day,
            COUNT(*) AS booked,
            ROUND(COUNT(*) / ? * 100, 1) AS utilization_percent
     FROM appointments a
     JOIN doctors d ON d.doctor_id = a.doctor_id
     WHERE a.status = 'booked'
     GROUP BY d.doctor_id, d.full_name, DATE(a.appt_datetime)
     HAVING COUNT(*) > ? * 0.8
     ORDER BY day, d.doctor_id`,
    [DAILY_CAP, DAILY_CAP]
  );
  return rows;
}

module.exports = { summary, nextSevenDays, doctorsReport, busyDays };

