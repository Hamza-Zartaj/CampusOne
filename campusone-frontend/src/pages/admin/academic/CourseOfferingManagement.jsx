import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Plus, Edit, Trash2, Calendar, X, AlertTriangle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { offeringAPI, courseAPI, termAPI, teacherAPI, scheduleAPI, roomAPI } from '../../../utils/api';

const inputClass = 'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnSecondary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors';
const btnGhost = 'inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors';

const emptyForm = { courseId: '', termId: '', teacherId: '', section: 'A', capacity: 40 };

const SESSION_TYPE_BADGE = {
  LECTURE: 'bg-blue-50 text-blue-700 border-blue-200',
  LAB:     'bg-purple-50 text-purple-700 border-purple-200',
  PROJECT: 'bg-amber-50 text-amber-700 border-amber-200',
};

// ---- Session Picker Modal ----
const SessionPicker = ({ offering, onClose, onSaved }) => {
  const [slots, setSlots] = useState({});
  const [config, setConfig] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [mySessions, setMySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sessionType = offering.course?.sessionType || 'LECTURE';
  const expected = sessionType === 'PROJECT' ? 0 : (config?.defaultSessionsPerCourse ?? 2);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [slotsRes, roomsRes, availRes, mineRes] = await Promise.all([
          scheduleAPI.getSlots(),
          roomAPI.getAll({ isActive: true }),
          scheduleAPI.getAvailability({ termId: offering.termId, excludeOfferingId: offering.id }),
          scheduleAPI.getOfferingSessions(offering.id),
        ]);
        setSlots(slotsRes.data.data.slots);
        setConfig(slotsRes.data.data.config);
        setRooms(roomsRes.data.data || []);
        setAllSessions(availRes.data.data || []);
        const existing = mineRes.data.data || [];
        setMySessions(existing.map((s) => ({ dayOfWeek: s.dayOfWeek, slotIndex: s.slotIndex, roomId: s.roomId })));
      } catch {
        toast.error('Failed to load schedule data');
      } finally {
        setLoading(false);
      }
    })();
  }, [offering.id, offering.termId]);

  // Pad/trim mySessions to expected length
  useEffect(() => {
    if (!config) return;
    if (sessionType === 'PROJECT') { setMySessions([]); return; }
    setMySessions((prev) => {
      const next = [...prev];
      while (next.length < expected) next.push({ dayOfWeek: '', slotIndex: '', roomId: '' });
      while (next.length > expected) next.pop();
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expected, sessionType]);

  // Build conflict info per (day,slot)
  const conflictAt = useMemo(() => {
    const map = {};
    for (const s of allSessions) {
      const key = `${s.dayOfWeek}-${s.slotIndex}`;
      if (!map[key]) map[key] = { rooms: new Set(), teachers: new Set(), courses: new Set(), bookings: [] };
      map[key].rooms.add(s.roomId);
      map[key].teachers.add(s.offering.teacherId);
      map[key].courses.add(s.offering.courseId);
      map[key].bookings.push(s);
    }
    return map;
  }, [allSessions]);

  // Teacher day load (for max-per-day check)
  const teacherDayLoad = useMemo(() => {
    const m = {};
    for (const s of allSessions) {
      if (s.offering.teacherId !== offering.teacherId) continue;
      m[s.dayOfWeek] = (m[s.dayOfWeek] || 0) + 1;
    }
    return m;
  }, [allSessions, offering.teacherId]);

  const filteredRooms = useMemo(() => {
    if (sessionType === 'LAB') return rooms.filter((r) => r.type === 'LAB');
    return rooms.filter((r) => r.type !== 'LAB');
  }, [rooms, sessionType]);

  const validateSession = (idx, s) => {
    if (!s.dayOfWeek || !s.slotIndex || !s.roomId) return null;
    const key = `${s.dayOfWeek}-${s.slotIndex}`;
    const c = conflictAt[key];

    // Same offering picking duplicate slot
    const dupInMine = mySessions.findIndex((m, i) => i !== idx && m.dayOfWeek === s.dayOfWeek && m.slotIndex === s.slotIndex);
    if (dupInMine >= 0) return 'Duplicate slot in your selection';

    if (c) {
      if (c.rooms.has(s.roomId)) return `Room booked: ${c.bookings.find((b) => b.roomId === s.roomId)?.offering.course.code}-${c.bookings.find((b) => b.roomId === s.roomId)?.offering.section}`;
      if (c.teachers.has(offering.teacherId)) return 'Teacher already teaching at this slot';
      if (c.courses.has(offering.courseId)) return `Other section of ${offering.course.code} runs here`;
    }

    // Teacher max per day
    const myCountThisDay = mySessions.filter((m, i) => i <= idx && m.dayOfWeek === s.dayOfWeek).length;
    const total = (teacherDayLoad[s.dayOfWeek] || 0) + myCountThisDay;
    if (config && total > config.maxTeacherLecturesPerDay) {
      return `Teacher exceeds ${config.maxTeacherLecturesPerDay} lectures on ${s.dayOfWeek}`;
    }
    return null;
  };

  const errors = mySessions.map((s, i) => validateSession(i, s));
  const hasErrors = errors.some((e) => e !== null);
  const incomplete = mySessions.some((s) => !s.dayOfWeek || !s.slotIndex || !s.roomId);

  const updateSession = (idx, key, value) => {
    setMySessions((prev) => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
  };

  const suggest = () => {
    if (!config || !slots) return;
    const days = Object.keys(slots);
    const candidates = [];
    for (const day of days) {
      for (const slot of slots[day]) {
        for (const room of filteredRooms) {
          const tmp = { dayOfWeek: day, slotIndex: slot.index, roomId: room.id };
          // Reuse same logic
          const key = `${day}-${slot.index}`;
          const c = conflictAt[key];
          if (c?.rooms.has(room.id)) continue;
          if (c?.teachers.has(offering.teacherId)) continue;
          if (c?.courses.has(offering.courseId)) continue;
          if ((teacherDayLoad[day] || 0) >= config.maxTeacherLecturesPerDay) continue;
          candidates.push(tmp);
        }
      }
    }
    // pick `expected` non-overlapping with same-room preference and different days
    const picked = [];
    const usedDays = new Set();
    for (const c of candidates) {
      if (picked.length >= expected) break;
      if (usedDays.has(c.dayOfWeek)) continue;
      if (picked.find((p) => p.dayOfWeek === c.dayOfWeek && p.slotIndex === c.slotIndex)) continue;
      picked.push(c);
      usedDays.add(c.dayOfWeek);
    }
    if (picked.length < expected) {
      toast.error('Cannot find enough non-conflicting slots — try freeing up the schedule.');
      return;
    }
    setMySessions(picked);
    toast.success('Suggested slots loaded');
  };

  const save = async () => {
    if (sessionType === 'PROJECT') {
      setSaving(true);
      try {
        await scheduleAPI.setOfferingSessions(offering.id, []);
        toast.success('Project offering — no sessions');
        onSaved();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed');
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    try {
      await scheduleAPI.setOfferingSessions(offering.id, mySessions.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        slotIndex: +s.slotIndex,
        roomId: s.roomId,
      })));
      toast.success('Schedule saved');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 text-slate-400">Loading schedule…</div>
      </div>
    );
  }

  const days = Object.keys(slots);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-slate-800">Schedule Sessions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {offering.course?.code} – Sec {offering.section} · {offering.teacher?.user?.name}
              <span className={`ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${SESSION_TYPE_BADGE[sessionType]}`}>
                {sessionType}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {sessionType === 'PROJECT' ? (
            <div className="text-center py-12 text-slate-500">
              <Sparkles size={32} className="mx-auto text-amber-500 mb-2" />
              <p className="font-medium">Final-year projects don't have weekly classes.</p>
              <p className="text-sm mt-1">Save to confirm no sessions will be scheduled.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">
                  Pick <span className="font-semibold">{expected}</span> session{expected === 1 ? '' : 's'} for this offering.
                </p>
                <button onClick={suggest} className={btnGhost}><Sparkles size={13} />Auto-suggest</button>
              </div>

              <div className="space-y-3">
                {mySessions.map((s, idx) => {
                  const err = errors[idx];
                  const dayObj = slots[s.dayOfWeek];
                  return (
                    <div key={idx} className={`p-3 rounded-lg border ${err ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`}>
                      <div className="text-xs font-semibold text-slate-500 mb-2">Session {idx + 1}</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Day</label>
                          <select className={inputClass} value={s.dayOfWeek} onChange={(e) => updateSession(idx, 'dayOfWeek', e.target.value)}>
                            <option value="">—</option>
                            {days.map((d) => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Time slot</label>
                          <select className={inputClass} value={s.slotIndex} onChange={(e) => updateSession(idx, 'slotIndex', e.target.value)} disabled={!s.dayOfWeek}>
                            <option value="">—</option>
                            {dayObj?.map((sl) => (
                              <option key={sl.index} value={sl.index}>{sl.index}. {sl.start}–{sl.end}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Room</label>
                          <select className={inputClass} value={s.roomId} onChange={(e) => updateSession(idx, 'roomId', e.target.value)}>
                            <option value="">—</option>
                            {filteredRooms.map((r) => (
                              <option key={r.id} value={r.id}>{r.code} ({r.type}, cap {r.capacity})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {err && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                          <AlertTriangle size={12} />{err}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Free-day hint */}
              {hasErrors && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <span className="font-semibold">Tip:</span> Try a different day, slot or room. Click <span className="font-semibold">Auto-suggest</span> to find a valid combination automatically.
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button
            onClick={save}
            disabled={saving || (sessionType !== 'PROJECT' && (hasErrors || incomplete))}
            className={btnPrimary}
          >
            {saving ? 'Saving…' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Main page ----
const CourseOfferingManagement = () => {
  const [offerings, setOfferings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterTerm, setFilterTerm] = useState('');
  const [scheduling, setScheduling] = useState(null);

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadOfferings(); }, [filterTerm]);

  const loadMeta = async () => {
    try {
      const [courseRes, termRes, teacherRes] = await Promise.all([courseAPI.getAll(), termAPI.getAll(), teacherAPI.getAllTeachers()]);
      setCourses(courseRes.data.data || []);
      setTerms(termRes.data.data || []);
      setTeachers(teacherRes.data.data || []);
      const active = (termRes.data.data || []).find((t) => t.isActive);
      if (active) setFilterTerm(active.id);
    } catch {
      toast.error('Failed to load metadata');
    }
  };

  const loadOfferings = async () => {
    try {
      setLoading(true);
      const params = filterTerm ? { termId: filterTerm } : {};
      const res = await offeringAPI.getAll(params);
      setOfferings(res.data.data || []);
    } catch {
      toast.error('Failed to load offerings');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm, termId: filterTerm }); setShowForm(true); };
  const openEdit = (o) => {
    setEditId(o.id);
    setForm({ courseId: o.courseId, termId: o.termId, teacherId: o.teacherId, section: o.section, capacity: o.capacity });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editId) {
        await offeringAPI.update(editId, { teacherId: form.teacherId, capacity: form.capacity });
        toast.success('Offering updated');
      } else {
        await offeringAPI.create(form);
        toast.success('Offering created — now set its schedule');
      }
      setShowForm(false);
      loadOfferings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (o) => {
    if (!confirm(`Deactivate offering ${o.course?.code} sec ${o.section}?`)) return;
    try {
      await offeringAPI.delete(o.id);
      toast.success('Offering deactivated');
      loadOfferings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Layers size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Course Offerings</h1>
            <p className="text-sm text-slate-500">Assign courses to teachers and schedule sessions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select className="py-2 px-3 border border-gray-200 rounded-lg text-sm" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
            <option value="">All Terms</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.code} {t.isActive ? '(active)' : ''}</option>)}
          </select>
          <button onClick={openCreate} className={btnPrimary}><Plus size={16} />New Offering</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-slate-800">{editId ? 'Edit Offering' : 'New Offering'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editId && (
                <>
                  <div>
                    <label className={labelClass}>Course *</label>
                    <select className={inputClass} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
                      <option value="">Select course…</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} – {c.title} {c.sessionType && c.sessionType !== 'LECTURE' ? `[${c.sessionType}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Term *</label>
                    <select className={inputClass} value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })} required>
                      <option value="">Select term…</option>
                      {terms.map((t) => <option key={t.id} value={t.id}>{t.code} – {t.academicYear}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className={labelClass}>Teacher *</label>
                <select className={inputClass} value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} required>
                  <option value="">Select teacher…</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.user?.name} ({t.employeeId})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Section *</label>
                  <input className={inputClass} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })} placeholder="A" required maxLength={5} disabled={!!editId} />
                </div>
                <div>
                  <label className={labelClass}>Capacity</label>
                  <input type="number" className={inputClass} min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                After creating, click <span className="font-semibold">Schedule</span> to set days, time slots and rooms.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
                <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {scheduling && (
        <SessionPicker
          offering={scheduling}
          onClose={() => setScheduling(null)}
          onSaved={() => { setScheduling(null); loadOfferings(); }}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : offerings.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No offerings found for this term.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Course</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Teacher</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Sec</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Schedule</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Enrolled</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offerings.map((o) => {
                const sessCount = o.sessions?.length || 0;
                const isProject = o.course?.sessionType === 'PROJECT';
                const scheduleOk = isProject ? sessCount === 0 : sessCount > 0;
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-700">{o.course?.code}</span>
                        {o.course?.sessionType && o.course.sessionType !== 'LECTURE' && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${SESSION_TYPE_BADGE[o.course.sessionType]}`}>
                            {o.course.sessionType}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs">{o.course?.title}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{o.teacher?.user?.name}</td>
                    <td className="py-3 px-4 text-center font-semibold">{o.section}</td>
                    <td className="py-3 px-4">
                      {isProject ? (
                        <span className="text-xs text-amber-700">No classes (project)</span>
                      ) : sessCount === 0 ? (
                        <span className="text-xs text-red-600 font-medium">⚠ Not scheduled</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {o.sessions.map((s) => (
                            <span key={s.id} className="px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                              {s.dayOfWeek} S{s.slotIndex} · {s.room.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(() => {
                        const filled = o._count?.enrollments ?? 0;
                        const ratio = filled / (o.capacity || 1);
                        const cls = ratio > 1
                          ? 'bg-red-50 text-red-700 border-red-200 font-semibold'
                          : ratio >= 0.9
                          ? 'bg-amber-50 text-amber-700 border-amber-200 font-semibold'
                          : 'bg-slate-50 text-slate-600 border-slate-200';
                        const tag = ratio > 1 ? ' ⚠ over' : ratio >= 0.9 ? ' ⚠' : '';
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${cls}`}>
                            {filled}/{o.capacity}{tag}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setScheduling(o)}
                          className={`inline-flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${scheduleOk ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                        >
                          <Calendar size={13} />{scheduleOk ? 'Schedule' : 'Set Schedule'}
                        </button>
                        <button onClick={() => openEdit(o)} className={btnGhost}><Edit size={13} /></button>
                        <button onClick={() => handleDelete(o)} className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CourseOfferingManagement;
