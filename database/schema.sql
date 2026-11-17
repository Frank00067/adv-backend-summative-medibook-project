CREATE DATABASE IF NOT EXISTS medibook
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medibook;

CREATE TABLE patients (
  patient_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  phone      VARCHAR(20)  NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (patient_id),
  UNIQUE KEY uq_patients_email (email)
) ENGINE=InnoDB;

CREATE TABLE doctors (
  doctor_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name        VARCHAR(100) NOT NULL,
  specialty        VARCHAR(80)  NOT NULL,
  consultation_fee DECIMAL(10,2) NOT NULL,
  room             VARCHAR(10)  NOT NULL,
  PRIMARY KEY (doctor_id),
  CONSTRAINT chk_fee_nonneg CHECK (consultation_fee >= 0)
) ENGINE=InnoDB;

CREATE TABLE appointments (
  appointment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id     INT UNSIGNED NOT NULL,
  doctor_id      INT UNSIGNED NOT NULL,
  appt_datetime  DATETIME     NOT NULL,
  amount_paid    DECIMAL(10,2) NOT NULL,
  status         ENUM('booked','cancelled') NOT NULL DEFAULT 'booked',
  refund_amount  DECIMAL(10,2) NULL,
  cancelled_at   DATETIME NULL,
  booked_on      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- NULL when cancelled, so cancelled rows never block a slot
  active_slot DATETIME GENERATED ALWAYS AS
    (CASE WHEN status = 'booked' THEN appt_datetime END) STORED,
  PRIMARY KEY (appointment_id),
  UNIQUE KEY uq_doctor_active_slot (doctor_id, active_slot),
  KEY idx_appt_doctor_date (doctor_id, appt_datetime),
  KEY idx_appt_patient (patient_id),
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patients (patient_id),
  CONSTRAINT fk_appt_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctors (doctor_id),
  CONSTRAINT chk_amount_nonneg CHECK (amount_paid >= 0),
  CONSTRAINT chk_slot_boundary CHECK (
    MINUTE(appt_datetime) IN (0, 30) AND SECOND(appt_datetime) = 0),
  CONSTRAINT chk_working_hours CHECK (
    TIME(appt_datetime) >= '09:00:00' AND TIME(appt_datetime) <= '16:30:00'),
  CONSTRAINT chk_refund_consistency CHECK (
    (status = 'booked' AND refund_amount IS NULL AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND refund_amount IS NOT NULL AND cancelled_at IS NOT NULL))
) ENGINE=InnoDB;