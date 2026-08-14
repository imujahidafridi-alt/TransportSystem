import React, { useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { SelectDropdown } from './SelectDropdown';

export interface Column<T> {
  key: string;
  header: string | React.ReactNode;
  headerClassName?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  title?: string;
  countBadge?: number;
  actionButton?: React.ReactNode;
  emptyMessage?: string;
  emptyState?: React.ReactNode;
  rowClassName?: (row: T, index: number) => string;
  defaultPageSize?: number;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  title,
  countBadge,
  actionButton,
  emptyMessage = 'No records found.',
  emptyState,
  rowClassName,
  defaultPageSize = 25,
}: DataTableProps<T>): React.ReactElement {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const parentRef = useRef<HTMLDivElement>(null);

  // Pagination Slice
  const totalRecords = data.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedData = data.slice(startIndex, endIndex);

  // TanStack Virtualizer on the paginated slice
  const rowVirtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalVirtualSize - virtualItems[virtualItems.length - 1].end
      : 0;

  // Auto reset page if totalPages shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden select-none">
      {/* Optional Title Header */}
      {(title || countBadge !== undefined || actionButton) && (
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {title && <h3 className="font-bold text-slate-800 text-sm">{title}</h3>}
            {countBadge !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800">
                {countBadge}
              </span>
            )}
          </div>
          {actionButton && <div>{actionButton}</div>}
        </div>
      )}

      {/* Virtualized Table Container */}
      <div ref={parentRef} className="flex-1 smooth-scroll min-h-0 relative">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead className="bg-slate-50/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200/80 select-none">
            <tr>
              {columns.map((col) => {
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';
                return (
                  <th
                    key={col.key}
                    className={`py-3.5 px-3.5 border-r border-slate-200/60 last:border-r-0 ${alignClass} ${
                      col.headerClassName || ''
                    }`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {totalRecords === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-slate-400 font-sans">
                  {emptyState || emptyMessage}
                </td>
              </tr>
            ) : (
              <>
                {/* Virtual Top Spacer */}
                {paddingTop > 0 && (
                  <tr>
                    <td colSpan={columns.length} style={{ height: `${paddingTop}px` }} />
                  </tr>
                )}

                {/* Render Virtualized Rows */}
                {virtualItems.map((virtualRow) => {
                  const row = paginatedData[virtualRow.index];
                  const globalIndex = startIndex + virtualRow.index;
                  const customRowClass = rowClassName ? rowClassName(row, globalIndex) : '';

                  return (
                    <tr
                      key={keyExtractor(row, globalIndex)}
                      className={`hover:bg-violet-50/40 transition-colors duration-150 ${customRowClass}`}
                      style={{ height: `${virtualRow.size}px` }}
                    >
                      {columns.map((col) => {
                        const alignClass =
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left';
                        const cellContent = col.render
                          ? col.render(row, globalIndex)
                          : (row as any)[col.key] ?? '-';
                        return (
                          <td
                            key={col.key}
                            className={`py-3 px-3.5 border-r border-slate-100/80 last:border-r-0 ${alignClass} ${
                              col.className || ''
                            }`}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Virtual Bottom Spacer */}
                {paddingBottom > 0 && (
                  <tr>
                    <td colSpan={columns.length} style={{ height: `${paddingBottom}px` }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Controls */}
      {totalRecords > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 shrink-0 text-xs text-slate-600 select-none rounded-b-2xl">
          {/* Left: Entries Info & Rows Per Page Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-500">Rows per page:</span>
              <SelectDropdown
                options={[15, 25, 50, 100, 250, 500].map((size) => ({
                  value: String(size),
                  label: String(size),
                }))}
                value={String(pageSize)}
                onChange={(val) => setPageSize(Number(val))}
                size="sm"
                direction="up"
                className="w-20"
              />
            </div>

            <span className="font-semibold text-slate-600">
              Showing <span className="font-bold text-slate-900">{(startIndex + 1).toLocaleString()}</span> to{' '}
              <span className="font-bold text-slate-900">{endIndex.toLocaleString()}</span> of{' '}
              <span className="font-extrabold text-violet-700">{totalRecords.toLocaleString()}</span> entries
            </span>
          </div>

          {/* Right: Page Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-violet-50 text-slate-600 hover:text-violet-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition shadow-sm"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-violet-50 text-slate-600 hover:text-violet-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition shadow-sm"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-800 text-xs">
              Page {validPage.toLocaleString()} of {totalPages.toLocaleString()}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-violet-50 text-slate-600 hover:text-violet-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition shadow-sm"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-violet-50 text-slate-600 hover:text-violet-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition shadow-sm"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
