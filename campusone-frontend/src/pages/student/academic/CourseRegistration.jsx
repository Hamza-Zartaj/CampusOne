import React, { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle, AlertCircle, Clock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { offeringAPI, enrollmentAPI, termAPI } from '../../../utils/api';

const CourseRegistration = () => {
  const [offerings, setOfferings] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [term, setTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null);
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const sid = user?.roleData?.id;
    if (sid) { setStudentId(sid); loadAll(sid); }
  }, []);

  const loadAll = async (sid) => {
    try {
      setLoading(true);
      const [termRes] = await Promise.all([termAPI.getActive()]);
      const activeTerm = termRes.data.data;
      setTerm(activeTerm);
      if (!activeTerm) return;

      const [offerRes, enrollRes] = await Promise.all([
        offeringAPI.getAll({ termId: activeTerm.id }),
        enrollmentAPI.getCurrent(sid),
      ]);
      setOfferings(offerRes.data.data || []);
      setMyEnrollments((enrollRes.data.data || []).map((e) => e.offering?.id));
    } catch {
      toast.error('Failed to load offerings');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (offeringId) => {
    try {
      setEnrolling(offeringId);
      await enrollmentAPI.enroll({ studentId, offeringId });
      toast.success('Enrolled successfully');
      setMyEnrollments((prev) => [...prev, offeringId]);
    } catch (err) {
      const msg = err.response?.data;
      if (msg?.missing) {
        toast.error(`Missing prerequisites: ${msg.missing.join(', ')}`);
      } else {
        toast.error(msg?.message || 'Enrollment failed');
      }
    } finally {
      setEnrolling(null);
    }
  };

  const isFull = (o) => (o._count?.enrollments ?? 0) >= o.capacity;
  const isEnrolled = (o) => myEnrollments.includes(o.id);

  const displayed = offerings.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.course?.code?.toLowerCase().includes(q) || o.course?.title?.toLowerCase().includes(q);
  });

  if (!term && !loading) return (
    <div className="p-6 max-w-3xl mx-auto text-center py-16 text-slate-400">
      <AlertCircle size={40} className="mx-auto mb-3 text-slate-300" />
      <p className="font-medium">No active registration period</p>
      <p className="text-sm">Course registration is not open at this time.</p>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Plus size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Course Registration</h1>
          {term && <p className="text-sm text-slate-500">{term.code} — {term.academicYear}</p>}
        </div>
        <div className="ml-auto text-right text-sm text-slate-600">
          <span className="font-semibold text-blue-700">{myEnrollments.length}</span> course{myEnrollments.length !== 1 ? 's' : ''} enrolled
        </div>
      </div>

      {term?.registrationCloseAt && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <Clock size={15} />Registration closes on {new Date(term.registrationCloseAt).toLocaleDateString()}
        </div>
      )}

      <input className="w-full py-2.5 px-4 border border-gray-200 rounded-lg text-sm mb-5 focus:outline-none focus:border-blue-500" placeholder="Search by course code or name…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading available courses…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No offerings found.</div>
      ) : (
        <div className="grid gap-3">
          {displayed.map((o) => {
            const enrolled = isEnrolled(o);
            const full = isFull(o);
            const schedule = Array.isArray(o.schedule) ? o.schedule : [];
            return (
              <div key={o.id} className={`bg-white rounded-xl border p-4 flex items-start justify-between gap-4 ${enrolled ? 'border-green-300 bg-green-50/30' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{o.course?.code}</span>
                    <span className="text-xs text-slate-500">Sec {o.section}</span>
                    <span className="text-xs text-slate-500">· {o.course?.creditHours} cr</span>
                    {enrolled && <span className="flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle size={12} />Enrolled</span>}
                    {full && !enrolled && <span className="text-xs text-red-600 font-medium">Full</span>}
                  </div>
                  <p className="font-medium text-slate-800 text-sm">{o.course?.title}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <User size={11} />{o.teacher?.user?.name}
                    {schedule.map((s, i) => <span key={i} className="ml-2">{s.day} {s.start}–{s.end}</span>)}
                  </div>
                  {o.course?.prerequisites?.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Prereqs: {o.course.prerequisites.map((p) => <span key={p.id} className="font-mono text-blue-600 mr-1">{p.code}</span>)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-slate-500">{o._count?.enrollments ?? 0}/{o.capacity}</span>
                  {!enrolled && (
                    <button
                      onClick={() => handleEnroll(o.id)}
                      disabled={full || enrolling === o.id}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${full ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'}`}
                    >
                      {enrolling === o.id ? 'Enrolling…' : full ? 'Full' : 'Enroll'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourseRegistration;
