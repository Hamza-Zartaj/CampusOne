import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare, Search, CheckCircle, Clock, Send, Trash2, Loader2,
  ArrowLeft, AlertCircle, Filter,
} from 'lucide-react';
import { qnaAPI, offeringAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const AuthorBadge = ({ author }) => {
  if (author?.qnaIdentity?.isTA) {
    return <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">TA</span>;
  }
  if (author?.role) {
    return <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{author.role}</span>;
  }
  return null;
};

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
      toast.error('Failed to update status');
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Delete this reply?')) return;
    try {
      await qnaAPI.deleteReply(replyId);
      toast.success('Reply deleted');
      load();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <div className="text-center py-20"><Loader2 className="animate-spin inline w-8 h-8 text-blue-600" /></div>;
  if (!thread) return null;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
        <ArrowLeft size={16} /> Back to threads
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
              <AuthorBadge author={thread.askedBy} />
              · {fmtDateTime(thread.createdAt)}
            </p>
          </div>
          <button onClick={toggleStatus} className={`px-3 py-1.5 text-sm rounded-lg ${thread.status === 'OPEN' ? 'bg-green-600 text-white hover:bg-green-700' : 'border border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
            {thread.status === 'OPEN' ? 'Mark Resolved' : 'Reopen'}
          </button>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg whitespace-pre-wrap text-slate-700">{thread.body}</div>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-800">Replies ({thread.replies.length})</h3>
        {thread.replies.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No replies yet — be the first to respond
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
                <button onClick={() => handleDeleteReply(r.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="text-slate-700 whitespace-pre-wrap">{r.body}</div>
            </div>
          );
        })}
      </div>

      {thread.status === 'OPEN' && (
        <form onSubmit={handleReply} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-800 mb-2">Post a Reply</label>
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

const TeacherQnA = () => {
  const [searchParams] = useSearchParams();
  const initialOfferingId = searchParams.get('offeringId') || '';
  const [threads, setThreads] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOffering, setFilterOffering] = useState(initialOfferingId);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedThread, setSelectedThread] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterOffering ? { offeringId: filterOffering } : {};
      const [tRes, oRes] = await Promise.all([
        qnaAPI.getThreads(params),
        offeringAPI.getMy({ taPermission: 'ANSWER_QNA' }),
      ]);
      setThreads(tRes.data.data);
      setOfferings(oRes.data.data);
    } catch (err) {
      toast.error('Failed to load Q&A');
    } finally {
      setLoading(false);
    }
  }, [filterOffering]);

  useEffect(() => { load(); }, [load]);

  // Open thread directly via URL ?thread=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('thread');
    if (tid) setSelectedThread(tid);
  }, []);

  const filtered = threads.filter((t) => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase());
    const matchOffering = !filterOffering || t.offeringId === filterOffering;
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchOffering && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900 m-0">Q&A Forum</h1>
            <p className="text-slate-600 m-0">Answer questions from your students</p>
          </div>
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
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>{o.course?.code} (Sec {o.section})</option>
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
                <p className="text-slate-500">No questions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((t) => (
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
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {t.offering?.course?.code} · {t.offering?.course?.title} (Sec {t.offering?.section})
                        </p>
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{t.body}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                          <span>Asked by <span className="font-medium text-slate-700">{t.askedBy?.name || 'Unknown'}</span><AuthorBadge author={t.askedBy} /></span>
                          <span className="inline-flex items-center gap-1"><MessageSquare size={12} /> {t._count?.replies ?? 0} replies</span>
                          <span className="inline-flex items-center gap-1"><Clock size={12} /> {fmtDateTime(t.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TeacherQnA;
