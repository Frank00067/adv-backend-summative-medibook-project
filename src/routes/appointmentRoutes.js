const router = require('express').Router();
const c = require('../controllers/appointmentController');
const wrap = require('../utils/asyncHandler');

router.post('/', wrap(c.book));
router.post('/:id/cancel', wrap(c.cancel));

module.exports = router;
