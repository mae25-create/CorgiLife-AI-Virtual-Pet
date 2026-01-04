
import React from 'react';

interface StatusBarProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

// A reusable status bar component with animated progress
const StatusBar: React.FC<StatusBarProps> = ({ label, value, color, icon }) => (
  <div className="w-full">
    <div className="flex justify-between text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">
      <span>{icon} {label}</span>
      <span>{Math.round(value)}%</span>
    </div>
    <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden shadow-inner border border-stone-200">
      <div 
        className={`h-full transition-all duration-1000 ${color}`} 
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }} 
      />
    </div>
  </div>
);

export default StatusBar;
