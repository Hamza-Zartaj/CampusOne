import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Search, Plus, CheckCircle, Clock, Send, Trash2, Loader2,
  ArrowLeft, X,
} from 'lucide-react';
import { qnaAPI, studentAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Ask Modal ───────────────────────────────────────────────────────────────
const AuthorBadge = ({ author }) => {
  if (author?.qnaIdentity?.isTA) {
    return <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">TA</span>;
  }
  if (author?.role) {
    return <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{author.role}</span>;
  }
  return null;
};

const AskModal = ({ enrollments, onClose, onCreated }) => {
  const [offeringId, setOfferingId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!offeringId || !title.trim() || !body.trim()) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await qnaAPI.createThread({ offeringId, title: title.trim(), body: body.trim() });
      toast.success('Question posted — your teacher has been notified');
      onCreated(res.data.data.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 m-0">Ask a Question</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-2">Course</label>
              <select
                value={offeringId} onChange={(e) => setOfferingId(e.target.value)} required
                className="w-full py-2.5 px-3.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Select a course…</option>
                {enrollments.map((e) => (
                  <option key={e.offering.id} value={e.offering.id}>
                    {e.offering.course?.code} — {e.offering.course?.title} (Sec {e.offering.section})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-2">Title</label>
              <input
                value={title} onChange={(e) => setTitle(e.target.value)} required
                placeholder="A clear, specific question…"
                className="w-full py-2.5 px-3.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-2">Details</label>
              <textarea
                value={body} onChange={(e) => setBody(e.target.value)} required
                rows={6} placeholder="Provide context, what you've tried, and what you need help with…"
                className="w-full py-2.5 px-3.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Post Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Thread Detail ────────────────────────────────────────────────────────────
const ThreadDetail = ({ threadId, currentUserId, onBack, onChange }) => {
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    qnaAPI.getThread(threadId).then((r) => setThread(r.data.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setReplying(true);
    try {
      await qnaAPI.reply(threadId, { body: replyBody });
      setReplyBody('');
      toast.success('Reply posted');
      load();
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reply');
    } finally {
      setReplying(false);
    }
  };

  const toggleStatus = async () => {
    const newStatus = thread.status === 'OPEN' ? 'RESOLVED' : 'OPEN';
    try {
      await qnaAPI.setStatus(threadId, newStatus);
      toast.success(`Marked ${newStatus.toLowerCase()}`);
      load();
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDeleteThread = async () => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await qnaAPI.deleteThread(threadId);
      toast.success('Question deleted');
      onBack();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <div className="text-center py-20"><Loader2 className="animate-spin inline w-8 h-8 text-blue-600" /></div>;
  if (!thread) return null;

  const isAsker = thread.askedById === currentUserId;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
        <ArrowLeft size={16} /> Back to questions
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-slate-900 m-0">{thread.title}</h2>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${thread.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {thread.status === 'OPEN' ? 'Open' : 'Resolved'}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {thread.offering?.course?.code} · {thread.offering?.course?.title} (Sec {thread.offering?.section})
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Asked by <span className="font-medium text-slate-700">{thread.askedBy?.name || 'Unknown'}</span>
              {isAsker && <span className="text-blue-600 ml-1">(you)</span>}
              <AuthorBadge author={thread.askedBy} />
              · {fmtDateTime(thread.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAsker && (
              <button onClick={toggleStatus} className={`px-3 py-1.5 text-sm rounded-lg ${thread.status === 'OPEN' ? 'bg-green-600 text-white hover:bg-green-700' : 'border border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
                {thread.status === 'OPEN' ? 'Mark Resolved' : 'Reopen'}
              </button>
            )}
            {isAsker && (
              <button onClick={handleDeleteThread} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete question">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg whitespace-pre-wrap text-slate-700">{thread.body}</div>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-800">Replies ({thread.replies.length})</h3>
        {thread.replies.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No replies yet
          </div>
        )}
        {thread.replies.map((r) => {
          const isTeacher = r.author?.role === 'teacher';
          const isTA = r.author?.qnaIdentity?.isTA;
          return (
            <div key={r.id} className={`bg-white rounded-xl border p-4 ${isTeacher || isTA ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-slate-800">{r.author?.name || 'Unknown'}</span>
                  <AuthorBadge author={r.author} />
                  <span className="ml-2 text-xs text-slate-500">{fmtDateTime(r.createdAt)}</span>
                </div>
              </div>
              <div className="text-slate-700 whitespace-pre-wrap">{r.body}</div>
            </div>
          );
        })}
      </div>

      {thread.status === 'OPEN' && (
        <form onSubmit={handleReply} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-800 mb-2">Add a Reply</label>
          <textarea
            value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
            rows={4} placeholder="Write your reply…"
            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex justify-end mt-3">
            <button type="submit" disabled={replying || !replyBody.trim()} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {replying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Post Reply
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const StudentQnA = () => {
  const [threads, setThreads] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOffering, setFilterOffering] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAsk, setShowAsk] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [threadsRes, enrollmentsRes] = await Promise.all([
        qnaAPI.getThreads(),
        studentAPI.myCourses(),
      ]);
      setThreads(threadsRes.data.data);
      setEnrollments(enrollmentsRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load Q&A');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (threadId) => {
    setShowAsk(false);
    setSelectedThread(threadId);
    load();
  };

  const filtered = threads.filter((t) => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase());
    const matchOffering = !filterOffering || t.offeringId === filterOffering;
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchOffering && matchStatus;
  });

  // Use enrollments for filter list (covers all enrolled courses, not just those with threads)
  const courseOptions = enrollments.map((e) => ({ id: e.offering.id, label: `${e.offering.course?.code} (Sec ${e.offering.section})` }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 m-0">Q&A</h1>
              <p className="text-slate-600 m-0">Ask questions and get answers from your teachers</p>
            </div>
          </div>
          <button
            onClick={() => setShowAsk(true)}
            disabled={enrollments.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Ask Question
          </button>
        </div>

        {selectedThread ? (
          <ThreadDetail
            threadId={selectedThread}
            currentUserId={currentUser.id}
            onBack={() => { setSelectedThread(null); load(); }}
            onChange={load}
          />
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions…"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <select value={filterOffering} onChange={(e) => setFilterOffering(e.target.value)} className="py-2.5 px-3.5 border border-slate-200 rounded-lg text-sm">
                <option value="">All courses</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="py-2.5 px-3.5 border border-slate-200 rounded-lg text-sm">
                <option value="">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-20"><Loader2 className="animate-spin inline w-8 h-8 text-blue-600" /></div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 mb-3">No questions yet</p>
                {enrollments.length > 0 && (
                  <button onClick={() => setShowAsk(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus size={16} /> Ask the first question
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((t) => {
                  const isMine = t.askedById === currentUser.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedThread(t.id)}
                      className="w-full text-left bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-blue-300 transition-all"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-lg font-semibold text-slate-900 m-0">{t.title}</h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                              {t.status === 'OPEN' ? 'Open' : 'Resolved'}
                            </span>
                            {isMine && <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Yours</span>}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {t.offering?.course?.code} · {t.offering?.course?.title} (Sec {t.offering?.section})
                          </p>
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{t.body}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                            <span>by <span className="font-medium text-slate-700">{t.askedBy?.name || 'Unknown'}</span><AuthorBadge author={t.askedBy} /></span>
                            <span className="inline-flex items-center gap-1"><MessageSquare size={12} /> {t._count?.replies ?? 0} replies</span>
                            <span className="inline-flex items-center gap-1"><Clock size={12} /> {fmtDateTime(t.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showAsk && (
        <AskModal
          enrollments={enrollments}
          onClose={() => setShowAsk(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default StudentQnA;
