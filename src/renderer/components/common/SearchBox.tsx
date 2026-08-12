import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(
  (
    {
      value,
      onChange,
      placeholder = 'search something...',
      id,
      className = '',
    },
    ref
  ) => {
    return (
      <div className={`relative flex items-center h-11 w-full ${className}`}>
        <input
          ref={ref}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-full w-full bg-white border border-slate-200/80 focus:border-violet-500 rounded-full pl-6 pr-14 text-xs text-slate-800 placeholder-slate-400 font-medium shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-4 focus:ring-violet-500/15 transition-all duration-200"
        />

        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-12 text-slate-300 hover:text-slate-600 p-1 rounded-full transition-colors duration-200"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Concentric Perfectly-Centered Search Circle Button */}
        <div className="absolute right-1.5 top-1.5 bottom-1.5 w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/25 pointer-events-none shrink-0">
          <Search className="w-4 h-4 text-white stroke-[2.5]" />
        </div>
      </div>
    );
  }
);

SearchBox.displayName = 'SearchBox';
