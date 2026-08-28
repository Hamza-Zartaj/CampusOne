import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, RefreshCw, Sparkles, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { markComponentAPI } from '../../../utils/api';

const KIND_LABEL = {
  ASSIGNMENT: 'Assignment',
  QUIZ: 'Quiz',
  MID: 'Mid Term',
  FINAL: 'Final Term',
  PROJECT_PRESENTATION: 'Project / Presentation',
  PARTICIPATION: 'Participation',
  LAB_WORK: 'Lab Work',
};

const ASSESSMENT_KINDS = ['PROJECT_PRESENTATION', 'MID', 'FINAL', 'PARTICIPATION', 'LAB_WORK'];

const formatNumber = (value, fractionDigits = 2) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '-';
  const rounded = Number(value).toFixed(fractionDigits);
  return rounded.replace(/\.?0+$/, '');
};

const getComponents = (data) => (
  data?.course?.gradeComponents?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || []
);

const hasMarkValue = (mark) => mark?.obtainedMarks !== null && mark?.obtainedMarks !== undefined;

const isAssessmentSlotCreated = (enrollments, kind, index) => (
  enrollments.some((enrollment) => {
    const mark = enrollment.markComponents?.find((entry) => entry.kind === kind && entry.index === index);
    return !!(mark?.title || mark?.date || hasMarkValue(mark));
  })
);

const computeWeightedSummary = (components, markComponents = []) => {
  let earned = 0;
  let gradedWeight = 0;

  for (const component of components) {
    const marks = markComponents.filter((mark) => mark.kind === component.kind);
    const graded = marks.filter(hasMarkValue);
    if (!graded.length) continue;

    const ratios = graded.map((mark) => (
      Number(mark.totalMarks) > 0 ? Number(mark.obtainedMarks) / Number(mark.totalMarks) : 0
    ));
    const ratio = component.aggregation === 'AVERAGE'
      ? ratios.reduce((sum, item) => sum + item, 0) / ratios.length
      : ratios[0];

    earned += ratio * Number(component.weightPercent || 0);
    gradedWeight += Number(component.weightPercent || 0);
  }

  return {
    earned,
    gradedWeight,
    runningPercent: gradedWeight ? (earned / gradedWeight) * 100 : null,
  };
};

const groupColumns = (columns) => {
  const groups = [];
  for (const column of columns) {
    const last = groups[groups.length - 1];
    if (last?.kind === column.kind) {
      last.columns.push(column);
    } else {
      groups.push({ kind: column.kind, component: column.component, columns: [column] });
    }
  }
  return groups;
};

const defaultAssessmentTitle = (option) => (
  option?.component.count > 1
    ? `${option.component.label} ${option.index}`
    : option?.component.label || ''
);

const MarksUpload = () => {
  const { offeringId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [edits, setEdits] = useState({});
  const [initing, setIniting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({ slot: '', title: '', date: '', totalMarks: '' });

  useEffect(() => { load(); }, [offeringId]);

  const load = async () => {
    try {
      setLoading(true);
      const r = await markComponentAPI.listForOffering(offeringId);
      setData(r.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const components = useMemo(() => getComponents(data), [data]);

  const componentByKind = useMemo(() => (
    Object.fromEntries(components.map((component) => [component.kind, component]))
  ), [components]);

  const configuredCellCount = useMemo(
    () => components.reduce((sum, component) => sum + Number(component.count || 0), 0),
    [components],
  );

  const columns = useMemo(() => {
    if (!data) return [];
    const cols = [];

    const assignments = (data.assignments || [])
      .filter((assignment) => assignment.componentIndex)
      .sort((a, b) => Number(a.componentIndex) - Number(b.componentIndex));
    for (const assignment of assignments) {
      const component = componentByKind.ASSIGNMENT;
      if (!component) continue;
      cols.push({
        kind: 'ASSIGNMENT',
        index: Number(assignment.componentIndex),
        component,
        header: `A${assignment.componentIndex}`,
        title: assignment.title,
        totalPerInstance: component.totalPerInstance,
      });
    }

    const quizzes = (data.quizzes || [])
      .filter((quiz) => quiz.componentIndex)
      .sort((a, b) => Number(a.componentIndex) - Number(b.componentIndex));
    for (const quiz of quizzes) {
      const component = componentByKind.QUIZ;
      if (!component) continue;
      cols.push({
        kind: 'QUIZ',
        index: Number(quiz.componentIndex),
        component,
        header: `Q${quiz.componentIndex}`,
        title: quiz.title,
        totalPerInstance: component.totalPerInstance,
      });
    }

    for (const component of components.filter((entry) => ASSESSMENT_KINDS.includes(entry.kind))) {
      for (let index = 1; index <= component.count; index++) {
        if (!isAssessmentSlotCreated(data.enrollments, component.kind, index)) continue;
        const firstMark = data.enrollments
          .flatMap((enrollment) => enrollment.markComponents || [])
          .find((mark) => mark.kind === component.kind && mark.index === index && (mark.title || mark.date || hasMarkValue(mark)));
        cols.push({
          kind: component.kind,
          index,
          component,
          header: component.count > 1 ? `${index}` : 'Score',
          title: firstMark?.title || (component.count > 1 ? `${component.label} ${index}` : component.label),
          totalPerInstance: firstMark?.totalMarks || component.totalPerInstance,
        });
      }
    }

    const order = Object.fromEntries(components.map((component, index) => [component.kind, index]));
    return cols.sort((a, b) => (order[a.kind] ?? 999) - (order[b.kind] ?? 999) || a.index - b.index);
  }, [data, components, componentByKind]);

  const columnGroups = useMemo(() => groupColumns(columns), [columns]);

  const availableAssessmentOptions = useMemo(() => {
    if (!data) return [];
    return components
      .filter((component) => ASSESSMENT_KINDS.includes(component.kind))
      .flatMap((component) => (
        Array.from({ length: component.count }, (_, offset) => {
          const index = offset + 1;
          return {
            key: `${component.kind}|${index}`,
            component,
            index,
            disabled: isAssessmentSlotCreated(data.enrollments, component.kind, index),
          };
        })
      ))
      .filter((option) => !option.disabled);
  }, [data, components]);

  const selectedAssessment = availableAssessmentOptions.find((option) => option.key === assessmentForm.slot);

  const allEnrollmentsHaveCells = data?.enrollments?.every((enrollment) =>
    enrollment.markComponents.length >= configuredCellCount,
  );

  const findCell = (enrollment, kind, index) =>
    enrollment.markComponents?.find((mark) => mark.kind === kind && mark.index === index);

  const setEdit = (markId, value) => {
    setEdits((prev) => ({ ...prev, [markId]: value }));
  };

  const init = async () => {
    setIniting(true);
    try {
      const r = await markComponentAPI.init(offeringId);
      toast.success(`Initialized ${r.data.created} mark cells`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setIniting(false);
    }
  };

  const openAssessmentModal = () => {
    const first = availableAssessmentOptions[0];
    setAssessmentForm({
      slot: first?.key || '',
      title: defaultAssessmentTitle(first),
      date: '',
      totalMarks: first?.component.totalPerInstance ?? '',
    });
    setModalOpen(true);
  };

  const updateAssessmentSlot = (slot) => {
    const option = availableAssessmentOptions.find((entry) => entry.key === slot);
    setAssessmentForm((prev) => ({
      ...prev,
      slot,
      title: defaultAssessmentTitle(option),
      totalMarks: option?.component.totalPerInstance ?? '',
    }));
  };

  const createAssessment = async (event) => {
    event.preventDefault();
    const option = selectedAssessment;
    if (!option) {
      toast.error('No configured assessment slot selected');
      return;
    }
    setCreating(true);
    try {
      await markComponentAPI.createAssessment(offeringId, {
        kind: option.component.kind,
        index: option.index,
        title: assessmentForm.title,
        date: assessmentForm.date || null,
        totalMarks: assessmentForm.totalMarks,
      });
      toast.success(`${assessmentForm.title} created`);
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create assessment');
    } finally {
      setCreating(false);
    }
  };

  const saveCell = async (markId) => {
    const value = edits[markId];
    if (value === undefined) return;
    setSaving((prev) => ({ ...prev, [markId]: true }));
    try {
      const payload = { obtainedMarks: value === '' ? null : Number(value) };
      await markComponentAPI.update(markId, payload);
      setData((prev) => ({
        ...prev,
        enrollments: prev.enrollments.map((enrollment) => ({
          ...enrollment,
          markComponents: enrollment.markComponents.map((mark) => (
            mark.id === markId ? { ...mark, obtainedMarks: payload.obtainedMarks } : mark
          )),
        })),
      }));
      setEdits((prev) => { const { [markId]: _, ...rest } = prev; return rest; });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving((prev) => { const { [markId]: _, ...rest } = prev; return rest; });
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Loading...</div>;
  if (!data) return <div className="p-12 text-center text-slate-400">No data</div>;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-3">
        <ArrowLeft size={14} />Back
      </button>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            <span className="font-mono text-blue-700">{data.course.code}</span> - {data.course.title}
          </h1>
          <p className="text-sm text-slate-500">Sec {data.section} - {data.term?.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAssessmentModal}
            disabled={availableAssessmentOptions.length === 0}
            className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm border border-blue-200 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <Plus size={14} />Add assessment
          </button>
          <button onClick={load} className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm border border-gray-200 bg-white text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} />Reload
          </button>
          <button
            onClick={init}
            disabled={initing}
            title="Create missing mark cells from the admin course configuration"
            className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            <Sparkles size={14} />{initing ? 'Initializing...' : (allEnrollmentsHaveCells ? 'Re-init cells' : 'Initialize cells')}
          </button>
        </div>
      </div>

      {data.enrollments.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border">No enrolled students.</div>
      ) : columns.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border">
          Create an assignment, quiz, or configured assessment to start entering marks.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th rowSpan={2} className="min-w-[170px] text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 align-middle">
                  Student
                </th>
                {columnGroups.map((group) => (
                  <th
                    key={group.kind}
                    colSpan={group.columns.length}
                    className="text-center px-3 py-2 border-r border-slate-200 last:border-r-0"
                    title={`${group.component.label}: ${formatNumber(group.component.weightPercent, 2)}% of final grade`}
                  >
                    <div className="font-semibold text-slate-800 whitespace-nowrap">{group.component.label}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {formatNumber(group.component.weightPercent, 2)}% - {group.component.aggregation === 'AVERAGE' ? 'Average' : 'Single'}
                    </div>
                  </th>
                ))}
                <th rowSpan={2} className="min-w-[120px] text-center px-3 py-3 font-semibold text-slate-700 bg-slate-100 border-l border-slate-200 align-middle">
                  <div>Weighted</div>
                  <div className="text-[11px] text-slate-500 font-normal">/100</div>
                </th>
                <th rowSpan={2} className="min-w-[115px] text-center px-3 py-3 font-semibold text-slate-700 bg-slate-100 align-middle">
                  <div>Graded</div>
                  <div className="text-[11px] text-slate-500 font-normal">weight</div>
                </th>
              </tr>
              <tr>
                {columns.map((column) => (
                  <th key={`${column.kind}-${column.index}`} className="min-w-[132px] max-w-[160px] text-center px-2 py-2 font-semibold text-xs border-r border-slate-100 last:border-r-0">
                    <div className="text-slate-700 whitespace-nowrap">{column.header}</div>
                    <div className="text-[10px] text-slate-500 font-medium truncate" title={column.title}>
                      {column.title}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">/{formatNumber(column.totalPerInstance, 2)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.enrollments.map((enrollment) => {
                const summary = computeWeightedSummary(components, enrollment.markComponents);
                return (
                  <tr key={enrollment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-slate-100">
                      <div className="font-semibold text-slate-900">{enrollment.student.user.name}</div>
                      <div className="text-xs text-slate-500">{enrollment.student.studentId}</div>
                    </td>
                    {columns.map((column) => {
                      const cell = findCell(enrollment, column.kind, column.index);
                      if (!cell) {
                        return <td key={`${column.kind}-${column.index}`} className="px-2 py-2 text-center text-xs text-slate-300">-</td>;
                      }
                      const editing = edits[cell.id] !== undefined;
                      const displayValue = editing ? edits[cell.id] : (cell.obtainedMarks ?? '');
                      return (
                        <td key={cell.id} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max={cell.totalMarks}
                            step="0.5"
                            value={displayValue}
                            onChange={(event) => setEdit(cell.id, event.target.value)}
                            onBlur={() => editing && saveCell(cell.id)}
                            className={`w-20 py-1.5 px-2 text-center border rounded-md text-sm tabular-nums ${editing ? 'border-blue-300 bg-blue-50' : 'border-slate-200'} ${saving[cell.id] ? 'opacity-50' : ''}`}
                            placeholder="-"
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center bg-slate-50 border-l border-slate-200">
                      <div className="font-semibold text-slate-900 tabular-nums">
                        {formatNumber(summary.earned, 2)}
                      </div>
                      {summary.runningPercent !== null && (
                        <div className="text-[10px] text-slate-500">
                          {formatNumber(summary.runningPercent, 2)}% current
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center bg-slate-50 text-slate-600 tabular-nums">
                      {formatNumber(summary.gradedWeight, 2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
          <form onSubmit={createAssessment} className="w-full max-w-md rounded-lg bg-white shadow-xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Add assessment</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1">Configured slot</span>
                <select
                  value={assessmentForm.slot}
                  onChange={(event) => updateAssessmentSlot(event.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  required
                >
                  {availableAssessmentOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.component.label}{option.component.count > 1 ? ` ${option.index}` : ''} - {formatNumber(option.component.weightPercent, 2)}%
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1">Title</span>
                <input
                  value={assessmentForm.title}
                  onChange={(event) => setAssessmentForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  required
                />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1">Date</span>
                <input
                  type="date"
                  value={assessmentForm.date}
                  onChange={(event) => setAssessmentForm((prev) => ({ ...prev, date: event.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1">Out of marks</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={assessmentForm.totalMarks}
                  onChange={(event) => setAssessmentForm((prev) => ({ ...prev, totalMarks: event.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  required
                />
              </label>
              {selectedAssessment && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                  Synced from admin configuration: {selectedAssessment.component.label} is worth {formatNumber(selectedAssessment.component.weightPercent, 2)}%. The score will be scaled automatically from the marks you enter.
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={creating || !selectedAssessment} className="px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MarksUpload;
