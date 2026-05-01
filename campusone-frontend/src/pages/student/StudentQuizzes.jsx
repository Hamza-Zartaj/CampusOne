import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HelpCircle, Clock, CheckCircle, AlertTriangle, Award, Calendar,
  Loader2, ChevronRight, Send, Maximize, X,
} from 'lucide-react';
import { quizAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Quiz Taking Screen (with anti-cheat) ───────────────────────────────────
const QuizTaker = ({ session, onExit, onSubmit }) => {
  const { attemptId, quiz, questions: initialQuestions, savedAnswers, deadline } = session;
  const [questions] = useState(initialQuestions);
  const [answers, setAnswers] = useState(() => {
    const m = {};
    (savedAnswers || []).forEach((a) => { m[a.questionId] = a.answer; });
    return m;
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)));
  const [violations, setViolations] = useState(session.violations || 0);
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const containerRef = useRef(null);
  const submittedRef = useRef(false);

  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
      const res = await quizAPI.submit(attemptId, { answers: payload });
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      onSubmit(res.data.data, auto);
    } catch (err) {
      toast.error('Failed to submit');
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [answers, attemptId, onSubmit]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          handleSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [handleSubmit]);

  // Anti-cheat: log violation, auto-submit if exceeded
  const reportViolation = useCallback(async (type) => {
    if (submittedRef.current) return;
    try {
      const res = await quizAPI.logViolation(attemptId, { type });
      const data = res.data.data;
      if (data.autoSubmitted) {
        setAutoSubmitted(true);
        submittedRef.current = true;
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        onSubmit({ totalScore: data.totalScore, status: 'AUTO_SUBMITTED' }, true);
      } else {
        setViolations(data.violations);
        toast.error(`⚠ ${type.replace(/_/g, ' ')} detected — ${data.violations}/${data.max} violations`, { duration: 4000 });
      }
    } catch (err) {
      console.error('Violation log failed:', err);
    }
  }, [attemptId, onSubmit]);

  // Tab switch / window blur detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) reportViolation('TAB_SWITCH');
    };
    const handleBlur = () => reportViolation('WINDOW_BLUR');
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [reportViolation]);

  // Disable right-click + dev-tools shortcuts
  useEffect(() => {
    const handleContextMenu = (e) => { e.preventDefault(); reportViolation('RIGHT_CLICK'); };
    const handleKeyDown = (e) => {
      const blocked =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && (e.key === 'p' || e.key === 'P')) ||
        (e.ctrlKey && (e.key === 's' || e.key === 'S'));
      if (blocked) {
        e.preventDefault();
        reportViolation('DEVTOOLS_SHORTCUT');
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [reportViolation]);

  // Block copy/paste/cut
  useEffect(() => {
    const blockEvent = (e) => { e.preventDefault(); reportViolation('COPY_PASTE'); };
    document.addEventListener('copy', blockEvent);
    document.addEventListener('paste', blockEvent);
    document.addEventListener('cut', blockEvent);
    return () => {
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('paste', blockEvent);
      document.removeEventListener('cut', blockEvent);
    };
  }, [reportViolation]);

  // Fullscreen enforcement
  useEffect(() => {
    const enterFs = async () => {
      if (containerRef.current && !document.fullscreenElement) {
        try { await containerRef.current.requestFullscreen(); } catch {}
      }
    };
    enterFs();

    const handleFsChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        reportViolation('FULLSCREEN_EXIT');
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [reportViolation]);

  // Save answer (debounced via simple delay)
  const saveAnswer = async (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    try {
      await quizAPI.saveAnswer(attemptId, { questionId, answer });
    } catch (err) {
      // silent fail; will be persisted on submit
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const timeWarning = timeLeft < 60;
  const q = questions[currentIdx];

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-100 select-none" style={{ userSelect: 'none' }}>
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-slate-800 m-0">{quiz.title}</h1>
          <p className="text-sm text-slate-500 m-0">Question {currentIdx + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg ${timeWarning ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'}`}>
            <Clock size={18} /> {formatTime(timeLeft)}
          </div>
          {violations > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium">
              <AlertTriangle size={16} /> {violations}/{quiz.maxViolations} violations
            </div>
          )}
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Question Navigator */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-24">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 m-0">Questions</h3>
            <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
              {questions.map((qq, i) => {
                const answered = answers[qq.id] !== undefined && answers[qq.id] !== null && answers[qq.id] !== '';
                return (
                  <button
                    key={qq.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                      i === currentIdx
                        ? 'bg-blue-600 text-white'
                        : answered
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <div><span className="inline-block w-3 h-3 bg-green-100 rounded mr-1"></span> Answered</div>
              <div><span className="inline-block w-3 h-3 bg-slate-100 rounded mr-1"></span> Unanswered</div>
            </div>
          </div>
        </div>

        {/* Question Body */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Question {currentIdx + 1} · {q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{q.type}</span>
            </div>
            <p className="text-lg text-slate-800 mb-6 whitespace-pre-wrap">{q.questionText}</p>

            {q.type === 'MCQ' && (
              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      answers[q.id] === i ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio" name={q.id}
                      checked={answers[q.id] === i}
                      onChange={() => saveAnswer(q.id, i)}
                    />
                    <span className="font-medium text-slate-700">{String.fromCharCode(65 + i)}.</span>
                    <span className="text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'TRUE_FALSE' && (
              <div className="space-y-2">
                {['True', 'False'].map((opt, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      answers[q.id] === i ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input type="radio" name={q.id} checked={answers[q.id] === i} onChange={() => saveAnswer(q.id, i)} />
                    <span className="text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'SHORT' && (
              <textarea
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                onBlur={(e) => saveAnswer(q.id, e.target.value)}
                rows={6}
                placeholder="Type your answer here…"
                className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
              />
            )}

            <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                disabled={currentIdx === questions.length - 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Result Screen ──────────────────────────────────────────────────────────
const ResultScreen = ({ attemptId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quizAPI.getMyResult(attemptId).then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
  if (!data) return null;

  const pct = data.totalMarks > 0 ? ((data.totalScore / data.totalMarks) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-slate-800 m-0">
            {data.status === 'AUTO_SUBMITTED' ? 'Quiz Auto-Submitted' : 'Quiz Submitted'}
          </h1>
          <p className="text-slate-500 mt-2 m-0">
            {data.status === 'AUTO_SUBMITTED' ? 'Submitted automatically due to violations or time-out' : 'Your responses have been recorded'}
          </p>
          <div className="mt-6 inline-block">
            <div className="text-5xl font-bold text-blue-600">{data.totalScore ?? '—'} <span className="text-2xl text-slate-400">/ {data.totalMarks}</span></div>
            <div className="text-lg text-slate-600 mt-1">{pct}%</div>
          </div>
          {data.violations > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm">
              <AlertTriangle size={16} /> {data.violations} violations recorded
            </div>
          )}
          <div className="mt-6">
            <button onClick={onClose} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Back to Quizzes</button>
          </div>
        </div>

        {data.allowReview && data.questions && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Review</h2>
            {data.questions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex justify-between mb-2">
                  <div className="font-semibold text-slate-800">Q{idx + 1} · {q.type}</div>
                  <div className={`text-sm font-medium ${q.isCorrect ? 'text-green-700' : q.isCorrect === false ? 'text-red-700' : 'text-amber-700'}`}>
                    {q.marksAwarded ?? 0} / {q.marks}
                  </div>
                </div>
                <p className="text-slate-700 mb-3">{q.questionText}</p>

                {q.type !== 'SHORT' && q.options && (
                  <div className="text-sm space-y-1">
                    {q.options.map((o, i) => (
                      <div key={i} className={`px-2 py-1 rounded ${i === q.correctAnswer ? 'bg-green-50 text-green-800' : ''} ${q.yourAnswer === i && i !== q.correctAnswer ? 'bg-red-50 text-red-800' : ''}`}>
                        {String.fromCharCode(65 + i)}. {o} {i === q.correctAnswer && '✓'} {q.yourAnswer === i && '(your answer)'}
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'SHORT' && (
                  <div className="space-y-2 text-sm">
                    <div className="bg-slate-50 p-2 rounded">Your answer: {q.yourAnswer || <em className="text-slate-400">No answer</em>}</div>
                    <div className="bg-green-50 text-green-800 p-2 rounded">Expected: {q.correctAnswer}</div>
                    {q.feedback && <div className="bg-blue-50 text-blue-800 p-2 rounded">Feedback: {q.feedback}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Pre-Quiz Confirmation Screen ──────────────────────────────────────────
const PreQuizScreen = ({ quiz, onStart, onCancel }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
    <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <h1 className="text-2xl font-bold text-slate-800 m-0">{quiz.title}</h1>
      <p className="text-sm text-slate-500 mt-1">{quiz.offering?.course?.code} · {quiz.offering?.course?.title}</p>

      {quiz.description && <p className="mt-4 text-slate-700">{quiz.description}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div><div className="text-slate-500">Duration</div><div className="font-semibold text-slate-800">{quiz.durationMinutes} minutes</div></div>
        <div><div className="text-slate-500">Total Marks</div><div className="font-semibold text-slate-800">{quiz.totalMarks}</div></div>
        <div><div className="text-slate-500">Questions</div><div className="font-semibold text-slate-800">{quiz._count?.questions || 0}</div></div>
        <div><div className="text-slate-500">Max Violations</div><div className="font-semibold text-slate-800">{quiz.maxViolations}</div></div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <div className="font-semibold flex items-center gap-2 mb-2"><AlertTriangle size={16} /> Anti-cheat is enabled</div>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Quiz runs in fullscreen — exiting counts as a violation</li>
          <li>Switching tabs / minimizing the window counts as a violation</li>
          <li>Right-click, dev tools, copy & paste are blocked</li>
          <li>Reaching <strong>{quiz.maxViolations}</strong> violations will auto-submit your quiz</li>
          <li>The timer continues even if you reload the page</li>
        </ul>
      </div>

      <div className="mt-6 flex gap-3 justify-end">
        <button onClick={onCancel} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
        <button onClick={onStart} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2">
          <Maximize size={16} /> Enter Fullscreen & Start
        </button>
      </div>
    </div>
  </div>
);

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
const StudentQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preQuiz, setPreQuiz] = useState(null);     // quiz object before start
  const [session, setSession] = useState(null);     // { attemptId, quiz, questions, ... }
  const [resultId, setResultId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    quizAPI.getMy().then((r) => setQuizzes(r.data.data)).catch(() => toast.error('Failed to load quizzes')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStart = async () => {
    try {
      const res = await quizAPI.start(preQuiz.id);
      setSession(res.data.data);
      setPreQuiz(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start quiz');
    }
  };

  const handleSubmitted = (result, auto) => {
    setSession(null);
    if (auto) toast.error('Quiz auto-submitted');
    else toast.success('Quiz submitted');
    setResultId(result.id || result.attemptId);
    load();
  };

  if (session) return <QuizTaker session={session} onExit={() => setSession(null)} onSubmit={handleSubmitted} />;
  if (resultId) return <ResultScreen attemptId={resultId} onClose={() => { setResultId(null); load(); }} />;
  if (preQuiz) return <PreQuizScreen quiz={preQuiz} onStart={handleStart} onCancel={() => setPreQuiz(null)} />;

  const now = Date.now();
  const categorize = (q) => {
    const a = q.attempts?.[0];
    if (a) return a.status === 'IN_PROGRESS' ? 'inprogress' : 'completed';
    const start = new Date(q.startAt).getTime();
    const end = new Date(q.endAt).getTime();
    if (now < start) return 'upcoming';
    if (now > end || q.status === 'CLOSED') return 'expired';
    return 'available';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <HelpCircle className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900 m-0">My Quizzes</h1>
            <p className="text-slate-600 m-0">Take quizzes and review your results</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20"><Loader2 className="animate-spin inline w-8 h-8 text-blue-600" /></div>
        ) : quizzes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <HelpCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No quizzes assigned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((q) => {
              const cat = categorize(q);
              const attempt = q.attempts?.[0];
              const config = {
                available:  { tag: 'Available', tagClass: 'bg-green-100 text-green-700', action: 'Start Quiz', actionClass: 'bg-blue-600 hover:bg-blue-700 text-white' },
                inprogress: { tag: 'In Progress', tagClass: 'bg-amber-100 text-amber-700', action: 'Resume', actionClass: 'bg-amber-600 hover:bg-amber-700 text-white' },
                upcoming:   { tag: 'Upcoming', tagClass: 'bg-blue-100 text-blue-700', action: null },
                expired:    { tag: 'Closed', tagClass: 'bg-slate-100 text-slate-600', action: null },
                completed:  { tag: 'Submitted', tagClass: 'bg-green-100 text-green-700', action: 'View Result', actionClass: 'border border-blue-200 text-blue-700 hover:bg-blue-50' },
              }[cat];

              return (
                <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-lg font-semibold text-slate-900 m-0">{q.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.tagClass}`}>{config.tag}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {q.offering?.course?.code} · {q.offering?.course?.title} (Sec {q.offering?.section})
                      </p>
                      <div className="flex items-center flex-wrap gap-4 mt-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1"><Award size={14} /> {q.totalMarks} marks</span>
                        <span className="inline-flex items-center gap-1"><Clock size={14} /> {q.durationMinutes} min</span>
                        <span className="inline-flex items-center gap-1">{q._count?.questions || 0} questions</span>
                        <span className="inline-flex items-center gap-1"><Calendar size={14} /> Closes {fmtDateTime(q.endAt)}</span>
                      </div>
                      {attempt && cat === 'completed' && (
                        <div className="mt-2 text-sm">
                          <span className="font-semibold text-slate-800">Score: {attempt.totalScore ?? '—'} / {q.totalMarks}</span>
                          {attempt.violations > 0 && <span className="ml-3 text-amber-700">{attempt.violations} violations</span>}
                        </div>
                      )}
                    </div>
                    {config.action && (
                      <button
                        onClick={() => cat === 'completed' ? setResultId(attempt.id) : setPreQuiz(q)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${config.actionClass}`}
                      >
                        {config.action}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentQuizzes;
