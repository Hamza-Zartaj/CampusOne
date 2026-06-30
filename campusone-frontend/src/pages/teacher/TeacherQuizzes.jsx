import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  HelpCircle, Plus, Search, Calendar, Clock, Users, Edit3, Trash2,
  Eye, X, Loader2, Award, FileSpreadsheet, ListChecks, Download,
  Sparkles, ChevronDown, ChevronUp, Printer,
} from 'lucide-react';
import { quizAPI, offeringAPI, taAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const printQuiz = async (quiz) => {
  try {
    const response = quiz.questions ? { data: { data: quiz } } : await quizAPI.getById(quiz.id);
    const fullQuiz = response.data.data;
    const questions = fullQuiz.questions || [];
    const course = `${fullQuiz.offering?.course?.code || ''} ${fullQuiz.offering?.course?.title || ''}`.trim();
    const html = `<!doctype html>
<html>
<head>
  <title>${escapeHtml(fullQuiz.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
    header { border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 24px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    .meta, .student-line { color: #475569; font-size: 13px; }
    .student-line { display: flex; gap: 24px; margin: 18px 0 26px; }
    .blank { border-bottom: 1px solid #111827; min-width: 220px; display: inline-block; height: 18px; }
    .question { break-inside: avoid; margin: 0 0 22px; }
    .question-title { font-weight: 700; margin-bottom: 8px; }
    .options { margin-top: 8px; display: grid; gap: 6px; }
    .option { display: flex; gap: 8px; align-items: flex-start; }
    .box { width: 12px; height: 12px; border: 1px solid #111827; margin-top: 2px; flex: 0 0 auto; }
    .answer-lines { margin-top: 10px; display: grid; gap: 12px; }
    .line { border-bottom: 1px solid #94a3b8; height: 22px; }
    @page { margin: 18mm; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(fullQuiz.title)}</h1>
    <div class="meta">${escapeHtml(course)}${fullQuiz.offering?.section ? ` - Section ${escapeHtml(fullQuiz.offering.section)}` : ''} - ${escapeHtml(fullQuiz.totalMarks)} marks</div>
  </header>
  <div class="student-line">
    <span>Name: <span class="blank"></span></span>
    <span>Student ID: <span class="blank"></span></span>
  </div>
  ${questions.map((question, index) => `
    <section class="question">
      <div class="question-title">Q${index + 1}. ${escapeHtml(question.questionText)} (${escapeHtml(question.marks)} mark${Number(question.marks) === 1 ? '' : 's'})</div>
      ${question.type === 'SHORT'
        ? '<div class="answer-lines"><div class="line"></div><div class="line"></div><div class="line"></div></div>'
        : `<div class="options">${(question.options || []).map((option, optionIndex) => `<div class="option"><span class="box"></span><span>${String.fromCharCode(65 + optionIndex)}. ${escapeHtml(option)}</span></div>`).join('')}</div>`}
    </section>
  `).join('')}
</body>
</html>`;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Allow pop-ups to print this quiz');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to prepare quiz for printing');
  }
};

const STATUS_CONFIG = {
  DRAFT:     { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Draft' },
  PUBLISHED: { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Published' },
  CLOSED:    { bg: 'bg-slate-50',  text: 'text-slate-700',  label: 'Closed' },
};

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Question Editor ────────────────────────────────────────────────────────
const QuestionEditor = ({ question, index, onChange, onRemove }) => {
  const set = (k, v) => onChange({ ...question, [k]: v });
  const setOption = (i, v) => {
    const opts = [...(question.options || ['', '', '', ''])];
    opts[i] = v;
    set('options', opts);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="font-semibold text-slate-700">Q{index + 1}</div>
        <button type="button" onClick={onRemove} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <select
          value={question.type}
          onChange={(e) => {
            const newType = e.target.value;
            const opts = newType === 'TRUE_FALSE' ? ['True', 'False'] : (newType === 'MCQ' ? ['', '', '', ''] : []);
            onChange({ ...question, type: newType, options: opts, correctAnswer: newType === 'SHORT' ? '' : 0 });
          }}
          className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="MCQ">Multiple Choice</option>
          <option value="TRUE_FALSE">True / False</option>
          <option value="SHORT">Short Answer</option>
        </select>
        <input
          type="number" min="1" step="0.5"
          value={question.marks}
          onChange={(e) => set('marks', +e.target.value)}
          placeholder="Marks"
          className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      <textarea
        value={question.questionText}
        onChange={(e) => set('questionText', e.target.value)}
        placeholder="Question text…"
        rows={2}
        className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-blue-500 resize-none"
      />

      {question.type === 'MCQ' && (
        <div className="space-y-2">
          {(question.options || ['', '', '', '']).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio" name={`correct-${index}`}
                checked={question.correctAnswer === i}
                onChange={() => set('correctAnswer', i)}
              />
              <input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="flex-1 py-1.5 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
          <p className="text-xs text-slate-500">Select the radio next to the correct answer.</p>
        </div>
      )}

      {question.type === 'TRUE_FALSE' && (
        <div className="flex gap-4">
          <label className="flex items-center gap-2"><input type="radio" name={`tf-${index}`} checked={question.correctAnswer === 0} onChange={() => set('correctAnswer', 0)} /> True</label>
          <label className="flex items-center gap-2"><input type="radio" name={`tf-${index}`} checked={question.correctAnswer === 1} onChange={() => set('correctAnswer', 1)} /> False</label>
        </div>
      )}

      {question.type === 'SHORT' && (
        <input
          value={question.correctAnswer || ''}
          onChange={(e) => set('correctAnswer', e.target.value)}
          placeholder="Expected answer (for grading reference)…"
          className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
      )}
    </div>
  );
};

// ─── Quiz Modal ─────────────────────────────────────────────────────────────
const QuizModal = ({ offerings, quizzes = [], initial, onClose, onSave }) => {
  const [form, setForm] = useState({
    offeringId: initial?.offeringId ?? '',
    componentIndex: initial?.componentIndex ?? '',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    durationMinutes: initial?.durationMinutes ?? 30,
    startAt: toDateTimeLocal(initial?.startAt),
    endAt: toDateTimeLocal(initial?.endAt),
    status: initial?.status ?? 'DRAFT',
    deliveryMode: initial?.deliveryMode ?? 'ONLINE',
    shuffleQuestions: initial?.shuffleQuestions ?? false,
    maxViolations: initial?.maxViolations ?? 3,
    allowReview: initial?.allowReview ?? true,
  });
  const [questions, setQuestions] = useState(initial?.questions || []);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiOptions, setAIOptions] = useState({
    questionCount: 5,
    mix: 'BALANCED',
    difficulty: 'MIXED',
    marksPerQuestion: 1,
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, saving]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addQuestion = (type = 'MCQ') => {
    const base = { type, questionText: '', marks: 1, options: [], correctAnswer: type === 'SHORT' ? '' : 0 };
    if (type === 'MCQ') base.options = ['', '', '', ''];
    if (type === 'TRUE_FALSE') base.options = ['True', 'False'];
    setQuestions([...questions, base]);
  };

  const updateQuestion = (i, q) => {
    const next = [...questions];
    next[i] = q;
    setQuestions(next);
  };

  const removeQuestion = (i) => setQuestions(questions.filter((_, idx) => idx !== i));

  const handleImportExcel = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await quizAPI.importExcel(fd);
      setQuestions((prev) => [...prev, ...res.data.data]);
      toast.success(`Imported ${res.data.count} questions`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await quizAPI.downloadImportTemplate();
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'campusone_quiz_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Quiz import template downloaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const selectedOffering = offerings.find((offering) => offering.id === form.offeringId);
  const quizComponent = selectedOffering?.course?.gradeComponents?.find((component) => component.kind === 'QUIZ');
  const existingCount = quizzes.filter((quiz) => quiz.offeringId === form.offeringId && quiz.id !== initial?.id).length;
  const usedIndexes = new Set(
    quizzes
      .filter((quiz) => quiz.offeringId === form.offeringId && quiz.id !== initial?.id)
      .map((quiz) => Number(quiz.componentIndex))
      .filter(Boolean)
  );
  const slotOptions = quizComponent
    ? Array.from({ length: quizComponent.count }, (_, index) => index + 1)
    : [];
  const limitReached = Boolean(quizComponent) && existingCount >= quizComponent.count;

  const handleOfferingChange = (offeringId) => {
    const offering = offerings.find((item) => item.id === offeringId);
    const component = offering?.course?.gradeComponents?.find((item) => item.kind === 'QUIZ');
    const existing = quizzes.filter((quiz) => quiz.offeringId === offeringId && quiz.id !== initial?.id);
    const taken = new Set(existing.map((quiz) => Number(quiz.componentIndex)).filter(Boolean));
    const hasRoom = component && existing.length < component.count;
    const firstAvailable = component
      ? Array.from({ length: component.count }, (_, index) => index + 1).find((slot) => hasRoom && !taken.has(slot))
      : '';

    setForm((current) => ({
      ...current,
      offeringId,
      componentIndex: firstAvailable || '',
    }));
  };

  const handleAIGenerate = async () => {
    if (!form.offeringId) {
      toast.error('Select a course offering before using AI');
      return;
    }
    if (aiPrompt.trim().length < 10) {
      toast.error('Describe the quiz you want in at least 10 characters');
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await quizAPI.generateWithAI({
        offeringId: form.offeringId,
        prompt: aiPrompt.trim(),
        ...aiOptions,
        existingQuestionTexts: questions.map((question) => question.questionText),
      });
      const generated = response.data.data.questions || [];
      const existingTexts = new Set(questions.map((question) => question.questionText.trim().toLocaleLowerCase()));
      const uniqueGenerated = generated.filter(
        (question) => !existingTexts.has(question.questionText.trim().toLocaleLowerCase())
      );
      setQuestions((current) => [...current, ...uniqueGenerated]);
      setShowAIGenerator(false);
      toast.success(`Added ${uniqueGenerated.length} AI-generated question${uniqueGenerated.length === 1 ? '' : 's'}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'AI generation failed');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.offeringId || !form.title || !form.startAt || !form.endAt) {
      toast.error('Course, title, start, and end times are required');
      return;
    }
    if (quizComponent && !form.componentIndex) {
      toast.error('Select a quiz number');
      return;
    }
    if (questions.length === 0) {
      toast.error('Add at least one question');
      return;
    }
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      toast.error('End time must be after start time');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        questions,
      });
    } finally {
      setSaving(false);
    }
  };

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <ListChecks size={20} />
            </div>
            <div>
              <h2 className="m-0 text-xl font-bold text-slate-900">{initial ? 'Edit Quiz' : 'Create Quiz'}</h2>
              <p className="m-0 mt-0.5 text-sm text-slate-500">Configure availability, rules, and questions.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close quiz editor"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-slate-50/60 p-5 sm:p-6">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div>
                <h3 className="m-0 text-base font-semibold text-slate-900">Quiz details</h3>
                <p className="m-0 mt-1 text-xs text-slate-500">Choose the course and explain what students should expect.</p>
              </div>
              <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Course Offering</label>
              <select
                value={form.offeringId}
                onChange={(e) => handleOfferingChange(e.target.value)}
                required disabled={!!initial}
                className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 disabled:bg-slate-50"
              >
                <option value="">Select course…</option>
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.course?.code} — {o.course?.title} (Sec {o.section}) · {o.term?.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Quiz Number</label>
              <select
                value={form.componentIndex}
                onChange={(e) => set('componentIndex', e.target.value)}
                required={!!quizComponent}
                disabled={!quizComponent}
                className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 disabled:bg-slate-50"
              >
                <option value="">
                  {quizComponent
                    ? (limitReached ? 'Quiz limit reached' : 'Select quiz number...')
                    : 'No quiz component configured'}
                </option>
                {slotOptions.map((slot) => (
                  <option key={slot} value={slot} disabled={limitReached || usedIndexes.has(slot)}>
                    Quiz {slot}{limitReached || usedIndexes.has(slot) ? ' (used)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Title</label>
              <input
                value={form.title} onChange={(e) => set('title', e.target.value)} required
                placeholder="Quiz title…"
                className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Description (optional)</label>
              <textarea
                value={form.description} onChange={(e) => set('description', e.target.value)}
                rows={2}
                placeholder="Brief instructions for students…"
                className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Delivery Mode</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                  form.deliveryMode === 'ONLINE'
                    ? 'border-blue-300 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200'
                }`}>
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="ONLINE"
                    checked={form.deliveryMode === 'ONLINE'}
                    onChange={(event) => set('deliveryMode', event.target.value)}
                  />
                  <span>
                    <strong className="block">Online quiz</strong>
                    <span className="text-xs text-slate-500">Students attempt it in CampusOne.</span>
                  </span>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                  form.deliveryMode === 'OFFLINE'
                    ? 'border-blue-300 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200'
                }`}>
                  <input
                    type="radio"
                    name="deliveryMode"
                    value="OFFLINE"
                    checked={form.deliveryMode === 'OFFLINE'}
                    onChange={(event) => set('deliveryMode', event.target.value)}
                  />
                  <span>
                    <strong className="block">Printed / offline quiz</strong>
                    <span className="text-xs text-slate-500">Print it and enter marks manually.</span>
                  </span>
                </label>
              </div>
            </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div>
                <h3 className="m-0 text-base font-semibold text-slate-900">Schedule and rules</h3>
                <p className="m-0 mt-1 text-xs text-slate-500">Times are shown in your local timezone.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Start At</label>
                <input
                  type="datetime-local" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} required
                  className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">End At</label>
                <input
                  type="datetime-local" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} required
                  className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Duration (min)</label>
                <input
                  type="number" min="1" value={form.durationMinutes}
                  onChange={(e) => set('durationMinutes', +e.target.value)}
                  className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Max Violations</label>
                <input
                  type="number" min="1" value={form.maxViolations}
                  onChange={(e) => set('maxViolations', +e.target.value)}
                  className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Status</label>
                <select
                  value={form.status} onChange={(e) => set('status', e.target.value)}
                  className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

              <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/50">
                <input type="checkbox" checked={form.shuffleQuestions} onChange={(e) => set('shuffleQuestions', e.target.checked)} />
                <span><strong className="block text-slate-800">Shuffle questions</strong><span className="text-xs text-slate-500">Each attempt keeps its generated order.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/50">
                <input type="checkbox" checked={form.allowReview} onChange={(e) => set('allowReview', e.target.checked)} />
                <span><strong className="block text-slate-800">Release answers</strong><span className="text-xs text-slate-500">Students can review answers after closing.</span></span>
              </label>
            </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 m-0">Questions ({questions.length})</h3>
                  <p className="text-xs text-slate-500">
                    Question paper: {totalMarks} marks{quizComponent ? ` - marks grid scale: /${quizComponent.totalPerInstance}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAIGenerator((open) => !open)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      showAIGenerator
                        ? 'border-violet-300 bg-violet-50 text-violet-700'
                        : 'border-violet-200 text-violet-700 hover:bg-violet-50'
                    }`}
                  >
                    <Sparkles size={14} />
                    Generate with AI
                    {showAIGenerator ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    disabled={downloadingTemplate}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {downloadingTemplate
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Download size={14} />}
                    Sample Excel
                  </button>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    {importing ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                    Import Excel
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      hidden
                      onChange={(event) => {
                        handleImportExcel(event.target.files[0]);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  <button type="button" onClick={() => addQuestion('MCQ')} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus size={14} /> Add Question
                  </button>
                </div>
              </div>

              {showAIGenerator && (
                <div className="mb-4 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="m-0 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Sparkles size={15} className="text-violet-600" /> AI question generator
                      </h4>
                      <p className="m-0 mt-1 text-xs text-slate-500">
                        Context: {selectedOffering
                          ? `${selectedOffering.course?.code} — ${selectedOffering.course?.title}`
                          : 'Select a course offering above'}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-violet-700">Draft suggestions</span>
                  </div>

                  <textarea
                    value={aiPrompt}
                    onChange={(event) => setAIPrompt(event.target.value)}
                    maxLength={10_000}
                    rows={3}
                    placeholder="Example: Create conceptual questions about database normalization. Focus on identifying 1NF, 2NF, and 3NF violations."
                    className="w-full resize-y rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />

                  <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <label className="text-xs font-medium text-slate-600">
                      Questions
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={aiOptions.questionCount}
                        onChange={(event) => setAIOptions((current) => ({ ...current, questionCount: Number(event.target.value) }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-violet-400"
                      />
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      Type mix
                      <select
                        value={aiOptions.mix}
                        onChange={(event) => setAIOptions((current) => ({ ...current, mix: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-violet-400"
                      >
                        <option value="BALANCED">Balanced</option>
                        <option value="MCQ_ONLY">MCQ only</option>
                        <option value="MCQ_TRUE_FALSE">MCQ + True/False</option>
                        <option value="ALL_TYPES">All types</option>
                      </select>
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      Difficulty
                      <select
                        value={aiOptions.difficulty}
                        onChange={(event) => setAIOptions((current) => ({ ...current, difficulty: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-violet-400"
                      >
                        <option value="MIXED">Mixed</option>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      Marks each
                      <input
                        type="number"
                        min="0.5"
                        max="100"
                        step="0.5"
                        value={aiOptions.marksPerQuestion}
                        onChange={(event) => setAIOptions((current) => ({ ...current, marksPerQuestion: Number(event.target.value) }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-violet-400"
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="m-0 text-xs text-slate-500">Review and edit every generated question before publishing.</p>
                    <button
                      type="button"
                      onClick={handleAIGenerate}
                      disabled={generatingAI || !form.offeringId}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {generatingAI ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                      {generatingAI ? 'Generating…' : 'Generate'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {questions.map((q, i) => (
                  <QuestionEditor key={i} question={q} index={i} onChange={(nq) => updateQuestion(i, nq)} onRemove={() => removeQuestion(i)} />
                ))}
                {questions.length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-6 bg-slate-50 rounded-lg">No questions yet. Add one or import from Excel.</p>
                )}
              </div>
            </section>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <p className="m-0 hidden text-sm text-slate-500 sm:block">{questions.length} questions · {totalMarks} total marks</p>
            <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700 hover:shadow disabled:opacity-50">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {initial ? 'Update Quiz' : 'Create Quiz'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ─── Manual Grade Sub-component ─────────────────────────────────────────────
const ManualGrade = ({ ans, maxMarks, onSave }) => {
  const [marks, setMarks] = useState(ans?.marksAwarded ?? 0);
  const [feedback, setFeedback] = useState(ans?.feedback ?? '');
  if (!ans) return <p className="text-xs text-slate-400">No answer to grade</p>;
  return (
    <div className="flex gap-2 items-end">
      <div>
        <label className="block text-xs text-slate-500">Marks</label>
        <input type="number" min="0" max={maxMarks} step="0.5" value={marks} onChange={(e) => setMarks(+e.target.value)} className="w-20 py-1.5 px-2 border border-gray-200 rounded text-sm" />
      </div>
      <div className="flex-1">
        <label className="block text-xs text-slate-500">Feedback</label>
        <input value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full py-1.5 px-2 border border-gray-200 rounded text-sm" />
      </div>
      <button type="button" onClick={() => onSave(marks, feedback)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save</button>
    </div>
  );
};

// ─── Attempt Detail Modal ───────────────────────────────────────────────────
const AttemptDetailModal = ({ attemptId, onClose, onBack }) => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canReviewTAGrades = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    quizAPI.getAttemptDetail(attemptId).then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, [attemptId]);

  useEffect(() => { load(); }, [load]);

  const grade = async (answerId, marks, feedback) => {
    try {
      const response = await quizAPI.gradeAnswer(answerId, { marksAwarded: marks, feedback });
      toast.success(response.data.pendingApproval ? 'Saved for teacher approval' : 'Saved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grade');
    }
  };

  const approvePendingGrade = async (pendingId) => {
    try {
      await quizAPI.approvePendingGrade(pendingId);
      toast.success('TA quiz grade approved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const rejectPendingGrade = async (pendingId) => {
    try {
      await quizAPI.rejectPendingGrade(pendingId);
      toast.success('TA quiz grade rejected');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <button type="button" onClick={onBack} className="text-sm text-blue-600 mb-1 inline-flex items-center gap-1">← Back</button>
            <h2 className="text-xl font-bold text-slate-800 m-0">Attempt Detail</h2>
            {data && <p className="text-sm text-slate-500 mt-1">{data.student.user.name} · Score: {data.totalScore ?? '—'} / {data.quiz.totalMarks} · {data.violations} violations</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {loading ? <div className="py-10 text-center"><Loader2 className="animate-spin inline" /></div> : data?.quiz.questions.map((q, idx) => {
            const ans = data.answers.find((a) => a.questionId === q.id);
            const correct = q.correctAnswer;
            const opts = q.options || [];

            return (
              <div key={q.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-slate-800">Q{idx + 1} · {q.type} · {q.marks} marks</div>
                  <div className={`text-sm font-medium ${ans?.isCorrect ? 'text-green-700' : ans?.isCorrect === false ? 'text-red-700' : 'text-amber-700'}`}>
                    {ans?.marksAwarded ?? 0} / {q.marks}
                  </div>
                </div>
                <p className="text-slate-700 mb-3">{q.questionText}</p>

                {q.type !== 'SHORT' && (
                  <div className="text-sm space-y-1">
                    {opts.map((o, i) => (
                      <div key={i} className={`px-2 py-1 rounded ${i === correct ? 'bg-green-50 text-green-800' : ''} ${ans?.answer === i && i !== correct ? 'bg-red-50 text-red-800' : ''}`}>
                        {String.fromCharCode(65 + i)}. {o} {i === correct && '✓ correct'} {ans?.answer === i && '(student)'}
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'SHORT' && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500">Expected: <span className="text-slate-700">{q.correctAnswer}</span></div>
                    <div className="bg-slate-50 p-2 rounded text-sm">Student: {ans?.answer || <em className="text-slate-400">No answer</em>}</div>
                    {canReviewTAGrades && (ans?.taPendingGrades || []).filter((pending) => pending.status === 'PENDING').map((pending) => (
                      <div key={pending.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="m-0 text-xs font-semibold text-amber-800">
                              Pending TA grade: {pending.marksAwarded}/{q.marks}
                            </p>
                            <p className="m-0 mt-0.5 text-[11px] text-amber-700">
                              {pending.taStudent?.user?.name || 'TA'}{pending.feedback ? ` · ${pending.feedback}` : ''}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => approvePendingGrade(pending.id)}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectPendingGrade(pending.id)}
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <ManualGrade ans={ans} maxMarks={q.marks} onSave={(m, f) => grade(ans.id, m, f)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Attempts List Modal ────────────────────────────────────────────────────
const AttemptsModal = ({ quiz, onClose, onChanged }) => {
  const [rows, setRows] = useState([]);
  const [draftMarks, setDraftMarks] = useState({});
  const [savingStudentId, setSavingStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const isOffline = quiz.deliveryMode === 'OFFLINE';

  const loadRoster = useCallback(async () => {
    setLoading(true);
    try {
      const response = await quizAPI.getAttempts(quiz.id);
      const roster = response.data.data || [];
      setRows(roster);
      setDraftMarks(Object.fromEntries(roster.map((row) => [row.student.id, row.totalScore ?? ''])));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load quiz roster');
    } finally {
      setLoading(false);
    }
  }, [quiz.id]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  const saveOfflineMark = async (studentId) => {
    const marks = Number(draftMarks[studentId]);
    if (!Number.isFinite(marks) || marks < 0 || marks > quiz.totalMarks) {
      toast.error(`Marks must be between 0 and ${quiz.totalMarks}`);
      return;
    }
    setSavingStudentId(studentId);
    try {
      await quizAPI.saveOfflineMark(quiz.id, { studentId, marksAwarded: marks });
      toast.success('Offline quiz mark saved');
      await loadRoster();
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save mark');
    } finally {
      setSavingStudentId(null);
    }
  };

  const statusCopy = (row) => {
    if (row.status === 'IN_PROGRESS') return { label: 'Attempting now', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (row.status === 'SUBMITTED') return { label: 'Submitted', tone: 'bg-green-50 text-green-700 border-green-200' };
    if (row.status === 'AUTO_SUBMITTED') return { label: 'Auto-submitted', tone: 'bg-orange-50 text-orange-700 border-orange-200' };
    return { label: 'Not attempted', tone: 'bg-slate-50 text-slate-600 border-slate-200' };
  };

  if (selected) {
    return <AttemptDetailModal attemptId={selected} onClose={onClose} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 m-0">{quiz.title} - Student roster</h2>
            <p className="text-sm text-slate-500 mt-1">
              {rows.length} students - {rows.filter((row) => row.attempt).length} recorded {isOffline ? 'marks' : 'attempts'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="p-6">
          {loading ? <div className="py-10 text-center"><Loader2 className="animate-spin inline" /></div> : (
            <div className="space-y-2">
              {rows.length === 0 && <p className="text-center text-slate-500 py-8">No students enrolled in this offering</p>}
              {rows.map((row) => {
                const status = statusCopy(row);
                return (
                  <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <div>
                      <div className="font-medium text-slate-800">{row.student.user.name}</div>
                      <div className="text-xs text-slate-500">{row.student.studentId} - {row.student.user.email}</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      {isOffline ? (
                        <>
                          <label className="flex items-center gap-2 text-sm text-slate-600">
                            Marks
                            <input
                              type="number"
                              min="0"
                              max={quiz.totalMarks}
                              step="0.5"
                              value={draftMarks[row.student.id] ?? ''}
                              onChange={(event) => setDraftMarks((current) => ({ ...current, [row.student.id]: event.target.value }))}
                              className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                            />
                            <span className="text-xs text-slate-400">/ {quiz.totalMarks}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => saveOfflineMark(row.student.id)}
                            disabled={savingStudentId === row.student.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {savingStudentId === row.student.id && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                        </>
                      ) : (
                        <>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
                          <div className="text-right">
                            <div className="font-semibold text-slate-800">{row.totalScore ?? '—'} / {quiz.totalMarks}</div>
                            <div className="text-xs text-slate-500">{row.violations} violations</div>
                          </div>
                          {row.attempt && (
                            <button onClick={() => setSelected(row.attempt.id)} className="px-3 py-1.5 text-sm border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50">View</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// MAIN PAGE
const TeacherQuizzes = () => {
  const [searchParams] = useSearchParams();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canManageCoursework = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const initialOfferingId = searchParams.get('offeringId') || '';
  const [quizzes, setQuizzes] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOffering, setFilterOffering] = useState(initialOfferingId);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingAttempts, setViewingAttempts] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, oRes] = await Promise.all([
        quizAPI.getAll(filterOffering ? { offeringId: filterOffering } : {}),
        offeringAPI.getMy().catch(async () => {
          const active = await taAPI.getMyActive();
          return { data: { data: (active.data.data || []).map((assignment) => assignment.offering) } };
        }),
      ]);
      setQuizzes(qRes.data.data);
      setOfferings(oRes.data.data);
    } catch (err) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, [filterOffering]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    try {
      if (editing) {
        await quizAPI.update(editing.id, data);
        toast.success('Quiz updated');
      } else {
        await quizAPI.create(data);
        toast.success('Quiz created');
      }
      setShowModal(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save quiz');
    }
  };

  const handleEdit = async (quiz) => {
    try {
      const res = await quizAPI.getById(quiz.id);
      setEditing(res.data.data);
      setShowModal(true);
    } catch (err) {
      toast.error('Failed to load quiz');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quiz? All attempts will be lost.')) return;
    try {
      await quizAPI.delete(id);
      toast.success('Quiz deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = quizzes.filter((q) => {
    const matchesSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) || q.offering?.course?.code?.toLowerCase().includes(search.toLowerCase());
    const matchesOffering = !filterOffering || q.offeringId === filterOffering;
    return matchesSearch && matchesOffering;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 m-0">Quizzes</h1>
              <p className="text-slate-600 m-0">Create quizzes with anti-cheat protection</p>
            </div>
          </div>
          {canManageCoursework && <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} /> Create Quiz
          </button>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or course code…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterOffering} onChange={(e) => setFilterOffering(e.target.value)}
            className="py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All courses</option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>{o.course?.code} (Sec {o.section})</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20"><Loader2 className="animate-spin inline w-8 h-8 text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <HelpCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No quizzes yet. Create your first quiz.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((q) => {
              const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.DRAFT;
              return (
                <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-lg font-semibold text-slate-900 m-0">{q.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-medium text-slate-700">
                          {q.deliveryMode === 'OFFLINE' ? 'Printed / offline' : 'Online'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {q.offering?.course?.code} · {q.offering?.course?.title} (Sec {q.offering?.section})
                      </p>
                      <div className="flex items-center flex-wrap gap-4 mt-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1"><ListChecks size={14} /> {q._count?.questions ?? 0} questions</span>
                        {q.componentIndex && <span className="inline-flex items-center gap-1">Quiz {q.componentIndex}</span>}
                        <span className="inline-flex items-center gap-1"><Award size={14} /> {q.totalMarks} marks</span>
                        <span className="inline-flex items-center gap-1"><Clock size={14} /> {q.durationMinutes} min</span>
                        <span className="inline-flex items-center gap-1"><Users size={14} /> {q._count?.attempts ?? 0} recorded</span>
                        <span className="inline-flex items-center gap-1"><Calendar size={14} /> {fmtDateTime(q.startAt)} → {fmtDateTime(q.endAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {canManageCoursework && <button onClick={() => printQuiz(q)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg" title="Print quiz"><Printer size={16} /></button>}
                      <button onClick={() => setViewingAttempts(q)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg" title="Student roster"><Eye size={16} /></button>
                      {canManageCoursework && <button onClick={() => handleEdit(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit3 size={16} /></button>}
                      {canManageCoursework && <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canManageCoursework && showModal && (
        <QuizModal
          quizzes={quizzes}
          offerings={offerings}
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {viewingAttempts && (
        <AttemptsModal quiz={viewingAttempts} onClose={() => setViewingAttempts(null)} onChanged={load} />
      )}
    </div>
  );
};

export default TeacherQuizzes;
