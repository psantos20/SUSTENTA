import React from 'react';

export const Campo: React.FC<{
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}> = ({ label, icon: Icon, value, onChange, type = 'text', placeholder, disabled }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
      {label}
    </label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 transition-all hover:border-emerald-200 dark:hover:border-emerald-700 placeholder:text-slate-300 dark:placeholder:text-slate-500"
      />
    </div>
  </div>
);
