const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  actual: { type: mongoose.Schema.Types.Mixed, default: null },
  status: { type: String, enum: ['Not Started', 'On Track', 'Completed'], default: 'Not Started' },
  comment: { type: String, default: '' },
  updatedAt: { type: Date },
}, { _id: false });

const checkInSchema = new mongoose.Schema({
  managerComment: { type: String, default: '' },
  date: { type: Date },
}, { _id: false });

const goalSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  thrustArea: {
    type: String,
    enum: ['Customer Satisfaction', 'Revenue Growth', 'Operational Excellence', 'People Development',
      'Digital Transformation', 'Cost Reduction', 'Quality & Compliance', 'Innovation'],
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  uom: {
    type: String,
    enum: ['Numeric (Min)', 'Numeric (Max)', 'Percentage (Min)', 'Percentage (Max)', 'Timeline', 'Zero-based'],
    required: true,
  },
  target: { type: mongoose.Schema.Types.Mixed, required: true },
  weightage: { type: Number, required: true, min: 10, max: 90 },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rework'],
    default: 'draft',
  },
  sharedGoal: { type: Boolean, default: false },
  cycle: { type: String, default: '2025' },
  achievements: {
    Q1: { type: achievementSchema, default: null },
    Q2: { type: achievementSchema, default: null },
    Q3: { type: achievementSchema, default: null },
    Q4: { type: achievementSchema, default: null },
  },
  checkIns: {
    Q1: { type: checkInSchema, default: null },
    Q2: { type: checkInSchema, default: null },
    Q3: { type: checkInSchema, default: null },
    Q4: { type: checkInSchema, default: null },
  },
}, { timestamps: true });

// Ensure total weightage per employee per cycle <= 100
goalSchema.statics.getTotalWeightage = async function (employeeId, cycle, excludeGoalId = null) {
  const match = { employeeId, cycle };
  if (excludeGoalId) match._id = { $ne: excludeGoalId };
  const result = await this.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$weightage' } } },
  ]);
  return result[0]?.total || 0;
};

module.exports = mongoose.model('Goal', goalSchema);
