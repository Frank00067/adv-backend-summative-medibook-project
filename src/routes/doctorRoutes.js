const router = require('express').Router();
const c = require('../controllers/doctorController');
const wrap = require('../utils/asyncHandler');

router.get('/', wrap(c.list));
router.post('/', wrap(c.create));
router.get('/:id', wrap(c.get));
router.put('/:id', wrap(c.update));
router.delete('/:id', wrap(c.remove));

module.exports = router;
