import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, subtitle }: { title: string, value: string | number, icon: any, color: string, subtitle?: string }) => (
  <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between transition-all hover:shadow-md">
    <div className="min-w-0">
      <p className="text-xs md:text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{value}</h3>
      {subtitle && <p className="text-[10px] text-slate-400 mt-1 truncate">{subtitle}</p>}
    </div>
    <div className={`p-2.5 md:p-3 rounded-xl shrink-0 ${color}`}>
      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
    </div>
  </div>
);

export default StatCard;
