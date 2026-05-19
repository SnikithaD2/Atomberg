const express = require('express');
const Goal = require('../models/Goal');
const AuditLog = require('../models/AuditLog');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();
const MAX_GOALS = 8;
const CURRENT_CYCLE = '2025';

// ── Helper ──────────────────────────────────────────────────────────────────
async function logAudit(goalId, action, userId, note = '', metadata = {}) {
  await AuditLog.create({ goalId, action, performedBy: userId, note, metadata });
}

// ── GET /api/goals  (role-aware) ─────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'employee') {
      query.employeeId = req.user._id;
    } else if (req.user.role === 'manager') {
      // manager sees goals of their direct reports
      const { User } = require('../models/User') || {};
      const mongoose = require('mongoose');
      // find employees whose managerId = current manager
      const UserModel = require('../models/User');
      const team = await UserModel.find({ managerId: req.user._id }).select('_id');
      const teamIds = team.map(u => u._id);
      query.employeeId = { $in: teamIds };
    }
    // admin sees all
    const goals = await Goal.find(query)
      .populate('employeeId', 'name email initials department role')
      .sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/goals ──────────────────────────────────────────────────────────
router.post('/', protect, requireRole('employee'), async (req, res) => {
  try {
    const { thrustArea, title, description, uom, target, weightage, status } = req.body;
    const employeeId = req.user._id;
    const cycle = CURRENT_CYCLE;

    // Count goals
    const count = await Goal.countDocuments({ employeeId, cycle });
    if (count >= MAX_GOALS) return res.status(400).json({ message: `Maximum ${MAX_GOALS} goals allowed per cycle` });

    // Check weightage
    const usedWeight = await Goal.getTotalWeightage(employeeId, cycle);
    if (usedWeight + Number(weightage) > 100) {
      return res.status(400).json({ message: `Weightage exceeds 100%. Available: ${100 - usedWeight}%` });
    }

    const goal = await Goal.create({
      employeeId, thrustArea, title, description, uom,
      target: uom === 'Timeline' ? target : Number(target),
      weightage: Number(weightage),
      status: status || 'draft',
      cycle,
    });

    if (status === 'submitted') {
      await logAudit(goal._id, 'Goal submitted for approval', employeeId, 'Employee submitted goal');
    }

    const populated = await goal.populate('employeeId', 'name email initials department');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/goals/:id ───────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    // Employees can only edit their own non-approved goals
    if (req.user.role === 'employee') {
      if (goal.employeeId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not your goal' });
      }
      if (goal.status === 'approved') {
        return res.status(403).json({ message: 'Approved goals are locked. Contact admin.' });
      }
    }

    const { thrustArea, title, description, uom, target, weightage, status } = req.body;

    if (weightage) {
      const usedWeight = await Goal.getTotalWeightage(goal.employeeId, goal.cycle, goal._id);
      if (usedWeight + Number(weightage) > 100) {
        return res.status(400).json({ message: `Weightage exceeds 100%. Available: ${100 - usedWeight}%` });
      }
    }

    const prevStatus = goal.status;
    Object.assign(goal, {
      thrustArea: thrustArea ?? goal.thrustArea,
      title: title ?? goal.title,
      description: description ?? goal.description,
      uom: uom ?? goal.uom,
      target: target !== undefined ? (uom === 'Timeline' ? target : Number(target)) : goal.target,
      weightage: weightage ? Number(weightage) : goal.weightage,
      status: status ?? goal.status,
    });

    await goal.save();

    if (prevStatus !== goal.status) {
      await logAudit(goal._id, `Status changed: ${prevStatus} → ${goal.status}`, req.user._id, req.body.note || '');
    }

    const populated = await goal.populate('employeeId', 'name email initials department');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/goals/:id ────────────────────────────────────────────────────
router.delete('/:id', protect, requireRole('employee', 'admin'), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    if (req.user.role === 'employee') {
      if (goal.employeeId.toString() !== req.user._id.toString())
        return res.status(403).json({ message: 'Not your goal' });
      if (goal.status === 'approved')
        return res.status(403).json({ message: 'Cannot delete approved goals' });
    }

    await goal.deleteOne();
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/goals/:id/achievement ────────────────────────────────────────
router.patch('/:id/achievement', protect, requireRole('employee'), async (req, res) => {
  try {
    const { quarter, actual, status, comment } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, employeeId: req.user._id, status: 'approved' });
    if (!goal) return res.status(404).json({ message: 'Goal not found or not approved' });

    goal.achievements[quarter] = { actual, status, comment, updatedAt: new Date() };
    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/goals/:id/checkin ─────────────────────────────────────────────
router.patch('/:id/checkin', protect, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { quarter, managerComment } = req.body;
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    goal.checkIns[quarter] = { managerComment, date: new Date() };
    await goal.save();
    await logAudit(goal._id, `${quarter} check-in recorded`, req.user._id, managerComment);
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/goals/:id/approve ─────────────────────────────────────────────
router.patch('/:id/approve', protect, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { note, newTarget } = req.body;
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (goal.status !== 'submitted') return res.status(400).json({ message: 'Goal must be in submitted state' });

    goal.status = 'approved';
    if (newTarget !== undefined && newTarget !== '') goal.target = newTarget;
    await goal.save();
    await logAudit(goal._id, 'Goal approved', req.user._id, note || 'Approved');
    const populated = await goal.populate('employeeId', 'name email initials department');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/goals/:id/rework ──────────────────────────────────────────────
router.patch('/:id/rework', protect, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { note } = req.body;
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    goal.status = 'rework';
    await goal.save();
    await logAudit(goal._id, 'Returned for rework', req.user._id, note);
    const populated = await goal.populate('employeeId', 'name email initials department');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/goals/:id/unlock ──────────────────────────────────────────────
router.patch('/:id/unlock', protect, requireRole('admin'), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    goal.status = 'draft';
    await goal.save();
    await logAudit(goal._id, 'Goal unlocked by Admin', req.user._id, 'Admin override — reverted to draft');
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/goals/shared ───────────────────────────────────────────────────
router.post('/shared', protect, requireRole('admin'), async (req, res) => {
  try {
    const { thrustArea, title, description, uom, target, defaultWeightage, employeeIds } = req.body;
    const cycle = CURRENT_CYCLE;

    const created = [];
    for (const empId of employeeIds) {
      const usedWeight = await Goal.getTotalWeightage(empId, cycle);
      const wt = Math.min(Number(defaultWeightage), 100 - usedWeight);
      if (wt < 10) continue; // skip if can't fit

      const goal = await Goal.create({
        employeeId: empId, thrustArea, title, description, uom,
        target: uom === 'Timeline' ? target : Number(target),
        weightage: wt, status: 'approved', sharedGoal: true, cycle,
      });
      await logAudit(goal._id, 'Shared goal pushed by Admin', req.user._id, `Dept-wide KPI assigned`);
      created.push(goal);
    }

    res.status(201).json({ created: created.length, goals: created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
