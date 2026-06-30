import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, CheckCircle2, XCircle, Clock, AlertCircle, Plus, X,
  BookOpen, Award, Users, Upload, Download, Trash2, Loader2, CalendarCheck,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { offeringAPI, taAPI } from '../../utils/api';

const STATUS_CHIP = {
  PENDING:  'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  RELIEVED: 'bg-slate-100 text-slate-600 border-slate-200',
};
const StatusIcon = ({ s }) => {
  if (s === 'APPROVED') return <CheckCircle2 size={14} className="text-green-600" />;
  if (s === 'REJECTED') return <XCircle size={14} className="text-red-600" />;
  if (s === 'RELIEVED') return <AlertCircle size={14} className="text-slate-500" />;
  return <Clock size={14} className="text-amber-600" />;
};

const TAResourcePanel = ({ assignment }) => {
  const [resources, setResources] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadResources = () => {
    setLoading(true);
    taAPI.listResources(assignment.offering.id)
      .then((response) => setResources(response.data.data || []))
      .catch(() => toast.error('Failed to load resources'))
      .finally(() => setLoading(false));
  };

  useEffect(loadResources, [assignment.offering.id]);

  const uploadResource = async (event) => {
    event.preventDefault();
    if (!title.trim() || !file) {
      toast.error('Title and file are required');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('offeringId', assignment.offering.id);
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());
      formData.append('file', file);
      await taAPI.uploadResource(formData);
      toast.success('Resource uploaded');
      setTitle('');
      setDescription('');
      setFile(null);
      loadResources();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (resourceId) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await taAPI.deleteResource(resourceId);
      toast.success('Resource deleted');
      loadResources();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <form onSubmit={uploadResource} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Resource title"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description optional"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          <Upload size={14} />
          {file?.name ? 'Change file' : 'Choose file'}
          <input type="file" className="sr-only" onChange={(event) => setFile(event.target.files[0])} />
        </label>
        {file?.name && <div className="text-xs text-slate-500 md:col-span-2">{file.name}</div>}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Upload
        </button>
      </form>
      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="py-3 text-xs text-slate-400">Loading resources...</div>
        ) : resources.length === 0 ? (
          <div className="py-3 text-xs text-slate-400">No TA resources uploaded yet.</div>
        ) : resources.map((resource) => (
          <div key={resource.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-medium text-slate-800">{resource.title}</p>
              <p className="m-0 text-xs text-slate-500">{resource.fileName}</p>
            </div>
            <div className="flex items-center gap-1">
              <a href={resource.fileUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Download">
                <Download size={15} />
              </a>
              <button type="button" onClick={() => deleteResource(resource.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Delete">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RosterModal = ({ assignment, onClose }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    offeringAPI.getStudents(assignment.offering.id)
      .then((response) => setRows(response.data.data || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Failed to load roster'))
      .finally(() => setLoading(false));
  }, [assignment.offering.id]);

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h3 className="m-0 text-lg font-bold text-slate-900">Class roster</h3>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {assignment.offering.course.code} - {assignment.offering.course.title} (Sec {assignment.offering.section})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close roster"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
              <Loader2 size={18} className="animate-spin" /> Loading roster...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No students are enrolled in this section.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Roll No', 'Student', 'Email', 'Semester', 'Status'].map((heading) => (
                      <th key={heading} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-3 text-sm font-semibold text-slate-800">{row.student.studentId}</td>
                      <td className="px-3 py-3 text-sm text-slate-700">{row.student.user.name}</td>
                      <td className="px-3 py-3 text-sm text-slate-500">{row.student.user.email}</td>
                      <td className="px-3 py-3 text-sm text-slate-500">{row.student.currentSemester ?? '-'}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MyTAAssignments = () => {
  const [eligibility, setEligibility] = useState(null);
  const [my, setMy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ courseId: '', offeringId: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [rosterAssignment, setRosterAssignment] = useState(null);
  const [resourcesOpen, setResourcesOpen] = useState({});

  const load = () => {
    setLoading(true);
    Promise.all([taAPI.getEligibility(), taAPI.getMy()])
      .then(([e, m]) => {
        setEligibility(e.data.data);
        setMy(m.data.data || []);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const eligibleCourse = eligibility?.eligibleCourses?.find((c) => c.courseId === form.courseId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.offeringId || !form.reason.trim()) {
      toast.error('Pick a section and write a reason'); return;
    }
    setSubmitting(true);
    try {
      await taAPI.apply({ offeringId: form.offeringId, reason: form.reason });
      toast.success('Application submitted');
      setModalOpen(false);
      setForm({ courseId: '', offeringId: '', reason: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="max-w-350 mx-auto">
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My TA Assignments</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

  const active = my.filter((a) => a.status === 'APPROVED');
  const pending = my.filter((a) => a.status === 'PENDING');
  const closed = my.filter((a) => a.status === 'REJECTED' || a.status === 'RELIEVED');

  return (
    <div className="max-w-350 mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My TA Assignments</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Manage your approved TA duties and course tools</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={!eligibility?.eligible || (eligibility?.eligibleCourses?.length || 0) === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Apply for TA
        </button>
      </div>

      {/* Eligibility card */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <GraduationCap size={20} />
          </div>
          <h2 className="text-base font-semibold text-slate-800 m-0">Eligibility</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 m-0 mb-0.5">CGPA</p>
            <p className="text-lg font-bold text-slate-800 m-0">{eligibility?.cgpa ?? '—'}</p>
            <p className="text-[10px] text-slate-500 m-0 mt-0.5">min {eligibility?.config?.minCgpa}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 m-0 mb-0.5">Current Semester</p>
            <p className="text-lg font-bold text-slate-800 m-0">{eligibility?.currentSemester ?? '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 m-0 mb-0.5">Active TA Roles</p>
            <p className="text-lg font-bold text-slate-800 m-0">
              {eligibility?.activeAssignmentCount ?? 0} / {eligibility?.config?.maxActiveAssignments}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 m-0 mb-0.5">Eligible Courses</p>
            <p className="text-lg font-bold text-slate-800 m-0">{eligibility?.eligibleCourses?.length || 0}</p>
          </div>
        </div>
        {!eligibility?.eligible && eligibility?.reasons?.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 m-0 mb-1">Not currently eligible</p>
            <ul className="text-xs text-amber-700 m-0 pl-4 list-disc">
              {eligibility.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
        {eligibility?.eligible && (eligibility?.eligibleCourses?.length || 0) === 0 && (
          <p className="mt-3 text-xs text-slate-500 m-0">
            No courses you've completed (with A/A+) are being offered this term to junior batches.
          </p>
        )}
      </div>

      {/* Active assignments */}
      {active.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Active</h3>
          <div className="space-y-3">
            {active.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm p-5 border-l-4 border-green-500">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-800">{a.offering.course.code}</span>
                      <span className="text-sm text-slate-500">·</span>
                      <span className="text-sm text-slate-700">{a.offering.course.title}</span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        Sec {a.offering.section}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 m-0">
                      {a.offering.term.code} · Teacher: {a.offering.teacher.user.name}
                    </p>
                    <div className="mt-3">
                      <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Course tools</p>
                      <div className="flex flex-wrap gap-2">
                        {(a.permissions || []).includes('VIEW_ROSTER') && (
                          <button
                            type="button"
                            onClick={() => setRosterAssignment(a)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Users size={13} /> View roster
                          </button>
                        )}
                        {(a.permissions || []).includes('MARK_ATTENDANCE') && (
                          <Link
                            to={`/teacher/attendance?offeringId=${a.offering.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <CalendarCheck size={13} /> Mark attendance
                          </Link>
                        )}
                        {(a.permissions || []).includes('ANSWER_QNA') && (
                          <Link
                            to={`/teacher/qna?offeringId=${a.offering.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                          >
                            <MessageSquare size={13} /> Answer Q&A
                          </Link>
                        )}
                        {(a.permissions || []).includes('GRADE_ASSIGNMENTS') && (
                          <Link
                            to={`/teacher/assignments?offeringId=${a.offering.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <Award size={13} /> Grade assignments
                          </Link>
                        )}
                        {(a.permissions || []).includes('GRADE_QUIZZES') && (
                          <Link
                            to={`/teacher/quizzes?offeringId=${a.offering.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                          >
                            <BookOpen size={13} /> Grade quizzes
                          </Link>
                        )}
                        {(a.permissions || []).includes('UPLOAD_RESOURCES') && (
                          <button
                            type="button"
                            onClick={() => setResourcesOpen((current) => ({ ...current, [a.id]: !current[a.id] }))}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            <Upload size={13} /> Upload resources
                          </button>
                        )}
                      </div>
                    </div>
                    {(a.permissions || []).includes('UPLOAD_RESOURCES') && resourcesOpen[a.id] && <TAResourcePanel assignment={a} />}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[a.status]}`}>
                    <StatusIcon s={a.status} /> Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Pending</h3>
          <div className="space-y-2">
            {pending.map((a) => (
              <div key={a.id} className="bg-white rounded-xl shadow-sm p-4 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="m-0 font-medium text-slate-800 text-sm">
                    {a.offering.course.code} (Sec {a.offering.section})
                  </p>
                  <p className="m-0 text-xs text-slate-500 mt-0.5">
                    {a.offering.term.code} · Submitted {new Date(a.appliedAt).toLocaleDateString()}
                  </p>
                  {a.reason && <p className="m-0 text-xs text-slate-600 mt-1 italic">"{a.reason}"</p>}
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[a.status]}`}>
                  <StatusIcon s={a.status} /> {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closed history */}
      {closed.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">History</h3>
          <div className="space-y-2">
            {closed.map((a) => (
              <div key={a.id} className="bg-white rounded-xl shadow-sm p-4 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="m-0 font-medium text-slate-800 text-sm">
                    {a.offering.course.code} (Sec {a.offering.section})
                  </p>
                  <p className="m-0 text-xs text-slate-500 mt-0.5">
                    {a.offering.term.code}
                  </p>
                  {a.reviewNotes && <p className="m-0 text-xs text-slate-600 mt-1 italic">Note: {a.reviewNotes}</p>}
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[a.status]}`}>
                  <StatusIcon s={a.status} /> {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {my.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400 text-sm">
          You haven't applied to be a TA yet.
        </div>
      )}

      {rosterAssignment && (
        <RosterModal assignment={rosterAssignment} onClose={() => setRosterAssignment(null)} />
      )}

      {/* Apply modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 m-0">Apply for TA</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
                <select
                  required
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value, offeringId: '' })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- choose course --</option>
                  {(eligibility?.eligibleCourses || []).map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.code} — {c.title} (Sem {c.semesterSlot})
                    </option>
                  ))}
                </select>
              </div>
              {eligibleCourse && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    required
                    value={form.offeringId}
                    onChange={(e) => setForm({ ...form, offeringId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- choose section --</option>
                    {eligibleCourse.sections.map((s) => (
                      <option key={s.offeringId} value={s.offeringId}>
                        Sec {s.section} — {s.teacher}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Pitch</label>
                <textarea
                  required rows={4}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Why are you a good fit? What can you offer the class?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTAAssignments;
