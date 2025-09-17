const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/pollController');

router.post('/', auth, ctrl.createPoll);
router.get('/', ctrl.listPolls); // ?status=active|closed
router.get('/:pollId', ctrl.getPoll);
router.put('/:pollId', auth, ctrl.updatePoll);
router.delete('/:pollId', auth, ctrl.deletePoll);

router.post('/:pollId/vote', auth, ctrl.voteOnPoll);
router.get('/:pollId/results', ctrl.pollResults); // closed polls only

module.exports = router;
