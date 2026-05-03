import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Clock, ChevronRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { offeringAPI, termAPI } from '../../../utils/api';

const SEASON_COLORS = { FALL: 'bg-amber-100 text-amber-700', SPRING: 'bg-green-100 text-green-700', SUMMER: 'bg-blue-100 text-blue-700' };

const MyOfferings = () => {
  const [offerings, setOfferings] = useState([]);
  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    termAPI.getAll().then((r) => {
      const list = r.data.data || [];
      setTerms(list);
      const active = list.find((t) => t.isActive);
      if (active) setTermId(active.id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [termId]);

  const load = async () => {
    try {
      setLoading(true);
      const params = termId ? { termId } : {};
      const res = await offeringAPI.getMy(params);
      setOfferings(res.data.data || []);
    } catch {
      toast.error('Failed to load offerings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-semibold text-slate-800">My Offerings</h1>
          <p className="text-sm text-slate-500">Courses you are teaching this term</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Terms</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.code} — {t.academicYear}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : offerings.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No offerings found for the selected term.</div>
      ) : (
        <div className="grid gap-4">
          {offerings.map((o) => {
            const enrolled = o._count?.enrollments ?? 0;
            const schedule = Array.isArray(o.schedule) ? o.schedule : [];
            return (
              <div
                key={o.id}
                className="bg-white rounded-xl border p-5 flex items-start justify-between gap-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{o.course?.code}</span>
                    <span className="text-xs text-slate-500">Sec {o.section}</span>
                    <span className="text-xs text-slate-500">· {o.course?.creditHours} cr</span>
                    {o.term && (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEASON_COLORS[o.term.season] || 'bg-slate-100 text-slate-600'}`}>
                        {o.term.code}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-800">{o.course?.title}</p>
                  {schedule.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {schedule.map((s, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-600">
                          <Clock size={10} />{s.day} {s.start}–{s.end}{s.room ? ` · ${s.room}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-slate-700 font-semibold">
                      <Users size={14} className="text-slate-400" />
                      {enrolled}/{o.capacity}
                    </div>
                    <div className="text-xs text-slate-500">enrolled</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/teacher/offerings/${o.id}/lectures`)}
                      className="text-xs py-1.5 px-3 rounded-lg border border-gray-200 bg-white text-slate-700 hover:bg-slate-50"
                    >Lectures</button>
                    <button
                      onClick={() => navigate(`/teacher/offerings/${o.id}/marks`)}
                      className="text-xs py-1.5 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >Marks</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOfferings;
