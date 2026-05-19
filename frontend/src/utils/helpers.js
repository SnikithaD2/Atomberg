export function computeScore(goal, achievement) {
  if (!achievement || achievement.actual == null) return null;
  const { uom, target } = goal;
  const actual = parseFloat(achievement.actual);
  if (uom === 'Numeric (Min)' || uom === 'Percentage (Min)') return Math.min(1, actual / target) * 100;
  if (uom === 'Numeric (Max)' || uom === 'Percentage (Max)') return Math.min(1, target / actual) * 100;
  if (uom === 'Zero-based') return actual === 0 ? 100 : 0;
  if (uom === 'Timeline') return achievement.status === 'Completed' ? 100 : 50;
  return 0;
}

export const THRUST_AREAS = [
  'Customer Satisfaction', 'Revenue Growth', 'Operational Excellence',
  'People Development', 'Digital Transformation', 'Cost Reduction',
  'Quality & Compliance', 'Innovation',
];

export const UOM_TYPES = [
  'Numeric (Min)', 'Numeric (Max)', 'Percentage (Min)',
  'Percentage (Max)', 'Timeline', 'Zero-based',
];

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
export const CURRENT_CYCLE = '2025';
