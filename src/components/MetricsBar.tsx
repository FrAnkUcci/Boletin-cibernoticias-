import { AlertOctagon, AlertTriangle, Bug, Newspaper, CheckSquare, Square } from 'lucide-react';
import type { NewsItem } from '../types';

interface MetricsBarProps {
  news: NewsItem[];
  selectedIds: Set<string>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectCriticalOnly: () => void;
}

export function MetricsBar({
  news,
  selectedIds,
  onSelectAll,
  onDeselectAll,
  onSelectCriticalOnly,
}: MetricsBarProps) {
  const totalCount = news.length;
  const criticalCount = news.filter((n) => n.severity === 'CRITICAL').length;
  const highCount = news.filter((n) => n.severity === 'HIGH').length;
  const cvesUnique = Array.from(new Set(news.flatMap((n) => n.cves))).length;

  const isAllSelected = totalCount > 0 && selectedIds.size === totalCount;

  return (
    <div className="bg-[#0F172A] border border-[#1E293B] p-2.5 sm:p-3 font-mono select-none">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
          {/* Total News */}
          <div className="flex items-center justify-between p-2 bg-[#0A0C10] border border-[#1E293B]">
            <div>
              <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">INTEL_INGEST</p>
              <p className="text-sm sm:text-base font-bold text-[#E2E8F0] mt-0.5">{totalCount}</p>
            </div>
            <div className="p-1 bg-[#0F172A] text-[#38BDF8] border border-[#1E293B]">
              <Newspaper className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Critical */}
          <div className="flex items-center justify-between p-2 bg-[#0A0C10] border border-red-500/30">
            <div>
              <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold">CRITICAL_CVES</p>
              <p className="text-sm sm:text-base font-bold text-red-400 mt-0.5">{criticalCount}</p>
            </div>
            <div className="p-1 bg-red-950/40 text-red-400 border border-red-500/50">
              <AlertOctagon className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* High */}
          <div className="flex items-center justify-between p-2 bg-[#0A0C10] border border-orange-500/30">
            <div>
              <p className="text-[10px] text-orange-400 uppercase tracking-wider font-bold">HIGH_ALERT</p>
              <p className="text-sm sm:text-base font-bold text-orange-400 mt-0.5">{highCount}</p>
            </div>
            <div className="p-1 bg-orange-950/40 text-orange-400 border border-orange-500/50">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* CVEs */}
          <div className="flex items-center justify-between p-2 bg-[#0A0C10] border border-[#1E293B]">
            <div>
              <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">UNIQUE_CVES</p>
              <p className="text-sm sm:text-base font-bold text-[#38BDF8] mt-0.5">{cvesUnique}</p>
            </div>
            <div className="p-1 bg-[#0F172A] text-[#38BDF8] border border-[#1E293B]">
              <Bug className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Selection / Curation Actions */}
        <div className="flex items-center flex-wrap gap-2 pt-2 lg:pt-0 lg:border-l lg:border-[#1E293B] lg:pl-3">
          <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
            STAGE_PDF ({selectedIds.size}/{totalCount}):
          </span>

          <button
            type="button"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold tracking-wider bg-[#0A0C10] hover:bg-[#1E293B] text-slate-300 border border-[#1E293B] transition"
          >
            {isAllSelected ? <Square className="w-3 h-3 text-[#38BDF8]" /> : <CheckSquare className="w-3 h-3 text-[#38BDF8]" />}
            {isAllSelected ? 'CLEAR_ALL' : 'SELECT_ALL'}
          </button>

          <button
            type="button"
            onClick={onSelectCriticalOnly}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold tracking-wider bg-red-950/40 hover:bg-red-950 text-red-400 border border-red-500/40 transition"
          >
            CRITICAL_ONLY
          </button>
        </div>

      </div>
    </div>
  );
}

