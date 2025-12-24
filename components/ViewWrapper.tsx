import React from 'react';

const ViewWrapper = ({ title, children, actions }: { title: string, children?: React.ReactNode, actions?: React.ReactNode }) => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4 shrink-0 px-1">
      <h1 className="text-xl md:text-2xl font-bold text-slate-800">{title}</h1>
      <div className="flex items-center gap-3 w-full md:w-auto">
        {actions}
      </div>
    </div>
    <div className="flex-1 min-h-0">
      {children}
    </div>
  </div>
);

export default ViewWrapper;
