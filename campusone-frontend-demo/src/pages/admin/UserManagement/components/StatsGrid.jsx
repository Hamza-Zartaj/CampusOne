import React from 'react';
import StatsCard from './StatsCard';

const StatsGrid = ({ stats, selectedRole, onSelectRole }) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6 mb-8 max-md:grid-cols-1">
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          stat={stat}
          isSelected={selectedRole === stat.role}
          onClick={() => onSelectRole(stat.role)}
        />
      ))}
    </div>
  );
};

export default StatsGrid;
