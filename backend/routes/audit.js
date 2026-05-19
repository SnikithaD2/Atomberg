const express = require('express');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit
router.get('/', protect, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'name role initials')
      .populate('goalId', 'title employeeId')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/audit/goal/:goalId
router.get('/goal/:goalId', protect, async (req, res) => {
  try {
    const logs = await AuditLog.find({ goalId: req.params.goalId })
      .populate('performedBy', 'name role initials')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
