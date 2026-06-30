// Default grade-component templates per course sessionType.
// Weights MUST sum to 100 within each template.

export const TEMPLATES = {
  LECTURE: [
    { kind: 'ASSIGNMENT',           label: 'Assignment',            count: 4, totalPerInstance: 10,  weightPercent: 5,  aggregation: 'AVERAGE', orderIndex: 1 },
    { kind: 'QUIZ',                 label: 'Quiz',                  count: 4, totalPerInstance: 20,  weightPercent: 10, aggregation: 'AVERAGE', orderIndex: 2 },
    { kind: 'PROJECT_PRESENTATION', label: 'Project / Presentation', count: 1, totalPerInstance: 100, weightPercent: 10, aggregation: 'SINGLE',  orderIndex: 3 },
    { kind: 'MID',                  label: 'Mid Term',              count: 1, totalPerInstance: 30,  weightPercent: 30, aggregation: 'SINGLE',  orderIndex: 4 },
    { kind: 'FINAL',                label: 'Final Term',            count: 1, totalPerInstance: 40,  weightPercent: 40, aggregation: 'SINGLE',  orderIndex: 5 },
    { kind: 'PARTICIPATION',        label: 'Class Participation',   count: 2, totalPerInstance: 5,   weightPercent: 5,  aggregation: 'AVERAGE', orderIndex: 6 },
  ],

  LAB: [
    { kind: 'LAB_WORK', label: 'Lab Work',   count: 4, totalPerInstance: 100, weightPercent: 20, aggregation: 'AVERAGE', orderIndex: 1 },
    { kind: 'QUIZ',     label: 'Lab Quiz',   count: 4, totalPerInstance: 20,  weightPercent: 20, aggregation: 'AVERAGE', orderIndex: 2 },
    { kind: 'MID',      label: 'Mid Term',   count: 1, totalPerInstance: 30,  weightPercent: 10, aggregation: 'SINGLE',  orderIndex: 3 },
    { kind: 'FINAL',    label: 'Final Term', count: 1, totalPerInstance: 100, weightPercent: 50, aggregation: 'SINGLE',  orderIndex: 4 },
  ],

  PROJECT: [
    { kind: 'PROJECT_PRESENTATION', label: 'Project Submission & Final Defense', count: 1, totalPerInstance: 100, weightPercent: 100, aggregation: 'SINGLE', orderIndex: 1 },
  ],
};

export const getTemplate = (sessionType) => TEMPLATES[sessionType] || TEMPLATES.LECTURE;

export const validateWeights = (components) => {
  const sum = components.reduce((s, c) => s + Number(c.weightPercent || 0), 0);
  if (Math.abs(sum - 100) > 0.01) {
    return { valid: false, message: `Weights must sum to 100, got ${sum}` };
  }
  return { valid: true };
};
