const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  optionId: { type: String, required: true },
  votedAt: { type: Date, default: Date.now }
});

// Unique compound index prevents duplicate votes by same user on same poll
voteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
