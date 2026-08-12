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
  header: string;
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
  rowClassName,
  defaultPageSize = 25,
}: DataTableProps<T>): React.ReactElement {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Reset to page 1 if data length changes significantly or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, pageSize]);

  const totalRecords = data.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedData = data.slice(startIndex, endIndex);

  // Virtualizer DOM Parent Container Ref
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col h-full">
      {/* Toolbar Header */}
      {(title || actionButton) && (
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2">
            {title && (
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {title} {typeof countBadge === 'number' ? `(${countBadge.toLocaleString()})` : ''}
              </span>
            )}
          </div>
          {actionButton && <div>{actionButton}</div>}
        </div>
      )}

      {/* Virtualized Table Container */}
      <div ref={parentRef} className="flex-1 overflow-auto min-h-0 relative">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead className="bg-violet-50/80 text-violet-950 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-violet-100 select-none">
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
                    className={`py-3.5 px-3.5 border-r border-violet-100/80 last:border-r-0 ${alignClass} ${
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
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 font-sans">
                  {emptyMessage}
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
              disabled={validCurrentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-violet-50 text-slate-600 hover:text-violet-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition shadow-sm"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-violet-50 text-slate-600 hover:text-violet-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition shadow-sm"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-slate-800 text-xs">
              Page {validCurrentPage.toLocaleString()} of {totalPages.toLocaleString()}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-violet-50 text-slate-600 hover:text-violet-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 transition shadow-sm"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
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
