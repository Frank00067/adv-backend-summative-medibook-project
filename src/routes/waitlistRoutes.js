const router = require('express').Router();
const c = require('../controllers/waitlistController');
const wrap = require('../utils/asyncHandler');

router.post('/', wrap(c.join));

module.exports = router;
