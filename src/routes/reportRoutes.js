const router = require('express').Router();
const c = require('../controllers/statsController');
const wrap = require('../utils/asyncHandler');

router.get('/doctors', wrap(c.doctorsReport));
router.get('/busy-days', wrap(c.busyDays));

module.exports = router;
