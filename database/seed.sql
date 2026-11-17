USE medibook;

INSERT INTO patients (full_name, email, phone) VALUES
 ('Ama Mensah',   'ama@mail.com',   '0244-111-222'),
 ('Kojo Owusu',   'kojo@mail.com',  '0555-333-444'),
 ('Efua Quaye',   'efua@mail.com',  '0200-555-666'),
 ('Yaw Darko',    'yaw@mail.com',   '0277-777-888');

INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES
 ('Dr. Boateng', 'Dermatology', 150.00, 'R-12'),
 ('Dr. Adjei',   'Paediatrics', 100.00, 'R-03'),
 ('Dr. Asare',   'Cardiology',  200.00, 'R-07');

INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid) VALUES
 (1, 1, '2026-12-01 09:00:00', 150.00),
 (2, 1, '2026-12-01 09:30:00', 120.00),
 (3, 1, '2026-12-01 10:00:00', 150.00),
 (4, 1, '2026-12-01 10:30:00', 150.00),
 (1, 1, '2026-12-01 11:00:00', 150.00),
 (2, 1, '2026-12-01 11:30:00', 150.00),
 (3, 1, '2026-12-01 12:00:00', 150.00),
 (4, 1, '2026-12-01 12:30:00', 150.00),
 (1, 1, '2026-12-01 13:00:00', 150.00),
 (2, 1, '2026-12-01 13:30:00', 150.00),
 (3, 1, '2026-12-01 14:00:00', 150.00);

INSERT INTO appointments (patient_id, doctor_id, appt_datetime, amount_paid) VALUES
 (1, 2, '2026-12-05 10:00:00', 100.00),
 (4, 2, '2026-12-05 10:30:00', 100.00);

INSERT INTO appointments
 (patient_id, doctor_id, appt_datetime, amount_paid, status, refund_amount, cancelled_at) VALUES
 (2, 2, '2026-12-05 10:00:00', 100.00, 'cancelled', 100.00, '2026-11-20 08:00:00');
