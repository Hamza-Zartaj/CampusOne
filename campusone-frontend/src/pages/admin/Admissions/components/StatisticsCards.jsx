import React from 'react';
import { Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatisticsCard = ({ title, count, icon, status, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-6 flex flex-col items-start gap-3 shadow-sm border border-gray-200 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer hover:border-primary-300 w-full text-left group"
    >
      <div className="text-primary-500 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 m-0">{title}</p>
        <h3 className="text-[2rem] font-bold text-slate-800 m-0">{count}</h3>
      </div>
      <p className="text-xs text-slate-400 mt-auto">Click to view {title.toLowerCase()}</p>
    </button>
  );
};

const StatisticsCards = ({ statistics, isLoading }) => {
  const navigate = useNavigate();

  if (!statistics || isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-6 gap-4 shadow-sm border border-gray-200 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
      <StatisticsCard
        title="Total Applications"
        count={statistics.total}
        icon={<Users size={24} />}
        status="all"
        onClick={() => navigate('/admin/admissions/applications/all')}
      />
      <StatisticsCard
        title="Pending"
        count={statistics.pending}
        icon={<Clock size={24} />}
        status="pending"
        onClick={() => navigate('/admin/admissions/applications/pending')}
      />
      <StatisticsCard
        title="Under Review"
        count={statistics.underReview}
        icon={<AlertCircle size={24} />}
        status="under_review"
        onClick={() => navigate('/admin/admissions/applications/under_review')}
      />
      <StatisticsCard
        title="Accepted"
        count={statistics.accepted}
        icon={<CheckCircle size={24} />}
        status="accepted"
        onClick={() => navigate('/admin/admissions/applications/accepted')}
      />
    </div>
  );
};

export default StatisticsCards;
