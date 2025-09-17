const { v4: uuidv4 } = require('uuid');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const mongoose = require('mongoose');

const now = () => new Date();

exports.createPoll = async (req, res) => {
  try {
    const { question, options, startDate, endDate } = req.body;
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Question and at least 2 options required' });
    }
    if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate required' });
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (s >= e) return res.status(400).json({ message: 'startDate must be before endDate' });

    const opts = options.map(optText => ({ optionId: uuidv4(), text: optText, votes: 0 }));

    const poll = new Poll({
      question,
      options: opts,
      startDate: s,
      endDate: e,
      createdBy: req.user.id
    });

    await poll.save();
    return res.status(201).json(poll);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.listPolls = async (req, res) => {
  try {
    const status = req.query.status; // active | closed
    const today = now();

    let filter = {};
    if (status === 'active') {
      filter = { startDate: { $lte: today }, endDate: { $gte: today } };
    } else if (status === 'closed') {
      filter = { endDate: { $lt: today } };
    }

    const polls = await Poll.find(filter).sort({ createdAt: -1 }).select('-__v');
    return res.json(polls);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getPoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    const today = now();
    const isActive = poll.startDate <= today && poll.endDate >= today;

   
    const authHeader = req.header('Authorization') || '';
    let userId = null;
    if (authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        userId = null;
      }
    }

    const resp = poll.toObject();
    if (!isActive && !resp) {} 

    if (!isActive) {
     
      return res.json(resp);
    } else {
      // active poll: only authenticated users can view 
      if (!userId) {
        // hide votes counts but return options without votes
        resp.options = resp.options.map(o => ({ optionId: o.optionId, text: o.text }));
        return res.json({ poll: resp, message: 'Authenticate to see current tallies' });
      } else {
        return res.json(resp);
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const updates = req.body;
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    // only creator may update before it closes
    if (poll.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const nowDate = now();
    if (poll.endDate <= nowDate) return res.status(400).json({ message: 'Poll already closed; cannot update' });

    // allow updating question, options (replace options array), startDate, endDate if still open
    if (updates.question) poll.question = updates.question;
    if (updates.startDate) poll.startDate = new Date(updates.startDate);
    if (updates.endDate) poll.endDate = new Date(updates.endDate);
    if (updates.options && Array.isArray(updates.options)) {
      const newOpts = updates.options.map(t => ({ optionId: uuidv4(), text: t, votes: 0 }));
      poll.options = newOpts;
    }

    await poll.save();
    return res.json(poll);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    if (poll.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const nowDate = now();
    if (poll.endDate <= nowDate) return res.status(400).json({ message: 'Poll already closed; cannot delete' });

    await Poll.deleteOne({ _id: pollId });
    // optionally delete votes for this poll:
    await Vote.deleteMany({ pollId });
    return res.json({ message: 'Poll deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.voteOnPoll = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { pollId } = req.params;
    const { optionId } = req.body;
    const userId = req.user.id;

    if (!optionId) return res.status(400).json({ message: 'optionId required' });

    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    const nowDate = now();
    if (poll.startDate > nowDate || poll.endDate < nowDate) {
      return res.status(400).json({ message: 'Poll is not active' });
    }

    //  Try to insert vote record (unique index prevents duplicates)
    const voteDoc = new Vote({ pollId, userId, optionId });


    let usedTransaction = false;

    try {
      session.startTransaction();
      await voteDoc.save({ session });

     
      const result = await Poll.updateOne(
        { _id: pollId, 'options.optionId': optionId },
        { $inc: { 'options.$.votes': 1 } },
        { session }
      );

      if (result.modifiedCount === 0) {
      
        await session.abortTransaction();
        return res.status(400).json({ message: 'Invalid optionId' });
      }

      await session.commitTransaction();
      usedTransaction = true;
      return res.json({ message: 'Vote recorded' });
    } catch (errTx) {
      
      await session.abortTransaction();
    
      if (errTx.code === 11000) {
        return res.status(400).json({ message: 'You have already voted on this poll' });
      }
     
    } finally {
      session.endSession();
    }

    if (!usedTransaction) {
      
      try {
        await voteDoc.save(); // may throw duplicate key error 
      } catch (err) {
        if (err.code === 11000) {
          return res.status(400).json({ message: 'You have already voted on this poll' });
        }
        console.error('Vote insert error', err);
        return res.status(500).json({ message: 'Server error' });
      }

      const upd = await Poll.updateOne(
        { _id: pollId, 'options.optionId': optionId },
        { $inc: { 'options.$.votes': 1 } }
      );

      if (upd.modifiedCount === 0) {
        // Option not found: rollback vote insertion 
        await Vote.deleteOne({ pollId, userId });
        return res.status(400).json({ message: 'Invalid optionId' });
      }

      return res.json({ message: 'Vote recorded' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
   console.log("pollId:", req.params.pollId);
    console.log("userId:", req.user.id);
    console.log("optionId:", req.body.optionId);
};

exports.pollResults = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    const nowDate = now();
    if (poll.endDate > nowDate) return res.status(400).json({ message: 'Poll not closed yet' });

    return res.json(poll);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
