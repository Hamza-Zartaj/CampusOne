import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const StatsCard = ({ stat, isSelected, onClick }) => {
  const Icon = stat.icon;

  return (
    <div
      className={`relative bg-white rounded-xl p-5 shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${
        isSelected ? 'ring-2 ring-primary-500 shadow-md' : ''
      }`}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: stat.gradient }}></div>
      <div
        className="absolute top-0 right-0 w-30 h-30 opacity-5 rounded-full translate-x-[30%] -translate-y-[30%]"
        style={{ background: stat.gradient }}
      ></div>
      <div className="mb-3">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-xl"
          style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
        >
          <Icon size={24} />
        </div>
      </div>
      <div className="relative z-1">
        <p className="text-[0.85rem] text-slate-500 m-0 mb-1 font-medium">{stat.label}</p>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-800 m-0">{stat.value}</h2>
          {isSelected ? (
            <ChevronUp size={20} className="text-primary-500" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
