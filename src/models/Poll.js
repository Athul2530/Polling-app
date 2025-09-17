const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  optionId: { type: String, required: true },
  text: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [optionSchema], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// index for querying active/closed quickly
pollSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Poll', pollSchema);
