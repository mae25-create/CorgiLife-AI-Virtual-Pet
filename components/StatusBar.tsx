
import React from 'react';

interface StatusBarProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ label, value, color, icon }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center text-xs font-bold text-gray-600 uppercase tracking-wider">
        <span>{icon} {label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div 
          className={`h-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
};

export default StatusBar;
