const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  voterId: { type: String, required: true },
  voterName: { type: String, required: true },
  votedForId: { type: String, required: true },
  votedForName: { type: String, required: true }
}, { _id: false });

const teamScoreSchema = new mongoose.Schema({
  teamId: { type: String, required: true },
  teamName: { type: String, required: true },
  roundScore: { type: Number, default: 0 },
  cumulativeScore: { type: Number, default: 0 },
  wasImposter: { type: Boolean, default: false },
  wasIdentified: { type: Boolean, default: false },
  identifiedImposter: { type: Boolean, default: false },
  votedFor: { type: String, default: '' }
}, { _id: false });

const roundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  imposterIds: [{ type: String, required: true }],
  imposterNames: [{ type: String, required: true }],
  votes: [voteSchema],
  scores: [teamScoreSchema],
  imposterIdentified: { type: Boolean, default: false },
  identifiedByIds: [{ type: String }],
  identifiedByNames: [{ type: String }],
  fooledByNames: [{ type: String }],
  correctCount: { type: Number, default: 0 },
  missCount: { type: Number, default: 0 },
  completedAt: { type: Date, default: Date.now }
}, { _id: false });

const teamSchema = new mongoose.Schema({
  teamId: { type: String, required: true },
  name: { type: String, required: true },
  totalScore: { type: Number, default: 0 }
}, { _id: false });

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Speeds up user queries
  },
  gameName: {
    type: String,
    default: function () {
      return `Game ${new Date().toLocaleDateString()}`;
    }
  },
  teams: [teamSchema],
  rounds: [roundSchema],
  numberOfPlayers: {
    type: Number,
    required: true,
    min: 3,
    max: 100 // Sanity cap for memory safety
  },
  floorLimitEnabled: { type: Boolean, default: false },
  floorLimitValue: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  currentRound: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

// Door 12: Transform output to never send the __v property
gameSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

gameSchema.index({ userId: 1, createdAt: -1 });
gameSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Game', gameSchema);