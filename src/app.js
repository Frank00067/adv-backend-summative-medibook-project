const express = require('express');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

app.use((req, res, next) => next(new AppError(404, 'Route not found')));
app.use(errorHandler);

module.exports = app;
