import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, User, Clock, Download, FileText, ClipboardList, HelpCircle,
  Award, Target, Megaphone, Sparkles, CalendarCheck, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI } from '../../../utils/api';

const KIND_LABEL = {
  ASSIGNMENT: 'Assignments',
  QUIZ: 'Quizzes',
  MID: 'Mid Term',
  FINAL: 'Final Term',
  PROJECT_PRESENTATION: 'Presentation / Project',
  PARTICIPATION: 'Class Participation',
  LAB_WORK: 'Lab Work',
};

const KIND_ICON = {
  ASSIGNMENT: ClipboardList,
  QUIZ: HelpCircle,
  MID: FileText,
  FINAL: Target,
  PROJECT_PRESENTATION: Sparkles,
  PARTICIPATION: Megaphone,
  LAB_WORK: ClipboardList,
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const Section = ({ icon: Icon, title, count, children }) => (
  <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <header className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
      <Icon size={16} className="text-blue-600" />
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">{title}</h3>
      {count != null && <span className="ml-auto text-xs text-slate-500">{count}</span>}
    </header>
    <div className="overflow-x-auto">{children}</div>
  </section>
);

const EmptyRow = ({ msg }) => (
  <div className="px-5 py-6 text-center text-sm text-slate-400">{msg}</div>
);

const MarkTable = ({ kind, course, marks }) => {
  if (marks.length === 0) return <EmptyRow msg={`No ${KIND_LABEL[kind].toLowerCase()} entries yet.`} />;
  const showFile = kind === 'ASSIGNMENT' || kind === 'PROJECT_PRESENTATION' || kind === 'LAB_WORK';
  const isMidOrFinal = kind === 'MID' || kind === 'FINAL';

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr>
          <th className="text-left px-4 py-2.5 font-semibold">Code</th>
          <th className="text-left px-4 py-2.5 font-semibold">Name</th>
          <th className="text-left px-4 py-2.5 font-semibold">Sec</th>
          {!isMidOrFinal && <th className="text-left px-4 py-2.5 font-semibold">#</th>}
          <th className="text-left px-4 py-2.5 font-semibold">Date</th>
          <th className="text-left px-4 py-2.5 font-semibold">Title</th>
          <th className="text-right px-4 py-2.5 font-semibold">Total</th>
          <th className="text-right px-4 py-2.5 font-semibold">Obtained</th>
          {showFile && <th className="text-center px-4 py-2.5 font-semibold">File</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {marks.map((m) => (
          <tr key={m.id} className="hover:bg-slate-50">
            <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-700">{course.code}</td>
            <td className="px-4 py-2.5 text-slate-700 truncate max-w-50">{course.title}</td>
            <td className="px-4 py-2.5 text-slate-600">{course.section}</td>
            {!isMidOrFinal && <td className="px-4 py-2.5 text-slate-600">{m.index}</td>}
            <td className="px-4 py-2.5 text-slate-600 text-xs">{fmtDate(m.date)}</td>
            <td className="px-4 py-2.5 text-slate-700 truncate max-w-60">{m.title || '—'}</td>
            <td className="px-4 py-2.5 text-right text-slate-700">{m.totalMarks}</td>
            <td className="px-4 py-2.5 text-right">
              {m.obtainedMarks != null ? (
                <span className="font-semibold text-slate-800">{m.obtainedMarks}</span>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </td>
            {showFile && (
              <td className="px-4 py-2.5 text-center">
                {m.fileUrl ? (
                  <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs">
                    <Download size={13} />{m.fileName || 'file'}
                  </a>
                ) : <span className="text-xs text-slate-400">—</span>}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const MyCourses = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [term, setTerm] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedOfferingId, setSelectedOfferingId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadingList(true);
        const res = await studentAPI.myCourses();
        const list = res.data.data || [];
        setEnrollments(list);
        setTerm(res.data.term);
        if (list.length > 0) setSelectedOfferingId(list[0].offering.id);
      } catch {
        toast.error('Failed to load courses');
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedOfferingId) { setDetail(null); return; }
    (async () => {
      try {
        setLoadingDetail(true);
        const res = await studentAPI.courseDetail(selectedOfferingId);
        setDetail(res.data.data);
      } catch {
        toast.error('Failed to load course details');
        setDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [selectedOfferingId]);

  const courseHeader = useMemo(() => {
    if (!detail) return null;
    return {
      code: detail.offering.course.code,
      title: detail.offering.course.title,
      section: detail.offering.section,
      sessionType: detail.offering.course.sessionType,
    };
  }, [detail]);

  const marksByKind = useMemo(() => {
    if (!detail) return {};
    const m = {};
    for (const mk of detail.markComponents || []) {
      if (!m[mk.kind]) m[mk.kind] = [];
      m[mk.kind].push(mk);
    }
    Object.values(m).forEach((arr) => arr.sort((a, b) => a.index - b.index));
    return m;
  }, [detail]);

  const orderedComponents = useMemo(() => {
    if (!detail) return [];
    return (detail.offering.course.gradeComponents || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
  }, [detail]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">My Courses</h1>
            {term && <p className="text-sm text-slate-500">{term.code} — {term.academicYear}</p>}
          </div>
        </div>
        {enrollments.length > 0 && (
          <select
            value={selectedOfferingId}
            onChange={(e) => setSelectedOfferingId(e.target.value)}
            className="py-2 px-3 border border-gray-200 rounded-lg text-sm min-w-80 max-w-full"
          >
            {enrollments.map((e) => (
              <option key={e.offering.id} value={e.offering.id}>
                {e.offering.course.code} — {e.offering.course.title} (Sec {e.offering.section})
              </option>
            ))}
          </select>
        )}
      </div>

      {loadingList ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
          You are not enrolled in any courses this term.
        </div>
      ) : loadingDetail || !detail ? (
        <div className="text-center py-12 text-slate-400">Loading course details…</div>
      ) : (
        <div className="space-y-5">
          {/* Course Summary */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-blue-700">{courseHeader.code}</span>
                  <span className="text-xs text-slate-500">· Sec {courseHeader.section}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                    {courseHeader.sessionType}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-800">{courseHeader.title}</h2>
                <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-600">
                  <User size={13} className="text-slate-400" />
                  <span>{detail.offering.teacher?.user?.name || '—'}</span>
                </div>
                {detail.offering.sessions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {detail.offering.sessions.map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1 text-xs bg-white border border-blue-100 px-2 py-1 rounded text-slate-600">
                        <Clock size={11} />{s.dayOfWeek} S{s.slotIndex} · {s.room.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white rounded-lg px-4 py-2 border border-blue-100 min-w-32">
                  <div className="text-xs text-slate-500">Attendance</div>
                  <div className="text-2xl font-bold text-slate-800">
                    {detail.attendance.summary.percentage != null ? `${detail.attendance.summary.percentage}%` : '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {detail.attendance.summary.present + detail.attendance.summary.late}/{detail.attendance.summary.total} classes
                  </div>
                </div>
                <div className="bg-white rounded-lg px-4 py-2 border border-blue-100 min-w-32">
                  <div className="text-xs text-slate-500">Running Grade</div>
                  <div className="text-2xl font-bold text-slate-800">
                    {detail.runningGrade.earnedPercent != null ? `${detail.runningGrade.earnedPercent}%` : '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {detail.runningGrade.gradedWeight}% of grade in
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Lectures */}
          <Section icon={BookOpen} title="Lectures" count={detail.lectures.length}>
            {detail.lectures.length === 0 ? (
              <EmptyRow msg="No lecture material posted yet." />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Code</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Sec</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Title</th>
                    <th className="text-center px-4 py-2.5 font-semibold">Material</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detail.lectures.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-700">{courseHeader.code}</td>
                      <td className="px-4 py-2.5 text-slate-700 truncate max-w-50">{courseHeader.title}</td>
                      <td className="px-4 py-2.5 text-slate-600">{courseHeader.section}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{fmtDate(l.date)}</td>
                      <td className="px-4 py-2.5 text-slate-700">{l.title}</td>
                      <td className="px-4 py-2.5 text-center">
                        {l.materialUrl ? (
                          <a href={l.materialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs">
                            <Download size={13} />{l.materialName || 'download'}
                          </a>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Attendance */}
          {courseHeader.sessionType !== 'PROJECT' && (
            <Section icon={CalendarCheck} title="Attendance" count={detail.attendance.records.length}>
              {detail.attendance.records.length === 0 ? (
                <EmptyRow msg="No attendance records yet." />
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.attendance.records.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-700">{a.date}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            a.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                            a.status === 'LATE'    ? 'bg-amber-100 text-amber-700' :
                                                     'bg-red-100 text-red-700'
                          }`}>{a.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          )}

          {/* Grade-component sections, in template order */}
          {orderedComponents.map((cmp) => {
            const Icon = KIND_ICON[cmp.kind] || ClipboardList;
            const marks = marksByKind[cmp.kind] || [];
            return (
              <Section key={cmp.kind} icon={Icon} title={`${KIND_LABEL[cmp.kind]} (${cmp.weightPercent}%)`} count={marks.length}>
                <MarkTable kind={cmp.kind} course={courseHeader} marks={marks} />
              </Section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
