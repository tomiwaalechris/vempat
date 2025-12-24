import React from 'react';

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
    <Icon className={`w-5 h-5 ${active ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
    <span className="font-medium text-sm">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-600" />}
  </button>
);

export default SidebarItem;
