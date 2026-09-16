import { Search, Filter, LayoutGrid, List, CheckSquare, Layers, Columns3, Rss } from 'lucide-react';
import { CATEGORY_DEFINITIONS } from '../types';
import type { NewsCategory, NewsFilterState, ViewMode } from '../types';

interface FiltersBarProps {
  filters: NewsFilterState;
  onFilterChange: (newFilters: Partial<NewsFilterState>) => void;
  sources: string[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedCount: number;
  onOpenSources?: () => void;
}

const CATEGORIES: { label: string; value: string; code?: string }[] = [
  { label: 'TODAS (ALL)', value: 'all', code: '00' },
  { label: 'EVENTOS ESPAÑA', value: 'Eventos España', code: '01' },
  { label: 'NOTICIAS RELEVANTES', value: 'Noticias Relevantes', code: '02' },
  { label: 'VULNERABILIDADES', value: 'Vulnerabilidades', code: '03' },
  { label: 'RANSOMWARE', value: 'Ransomware', code: '04' },
  { label: 'BOE / DOUE NORMATIVA', value: 'BOE y DOUE Normativa', code: '05' },
];

const SEVERITIES = [
  { label: 'SEVERITY: ALL', value: 'all' },
  { label: 'CRITICAL_ONLY', value: 'CRITICAL' },
  { label: 'HIGH_ONLY', value: 'HIGH' },
  { label: 'MEDIUM_ONLY', value: 'MEDIUM' },
  { label: 'LOW_INFO_ONLY', value: 'LOW_INFO' },
];

export function FiltersBar({
  filters,
  onFilterChange,
  sources,
  viewMode,
  onViewModeChange,
  selectedCount,
  onOpenSources,
}: FiltersBarProps) {
  return (
    <div className="bg-[#0F172A] p-3 border border-[#1E293B] space-y-2.5 font-mono select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="FILTER_QUERY // CVE (e.g. CVE-2026-), VENDOR, EXPLOIT, THREAT..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-8 pr-12 py-1.5 bg-[#0A0C10] text-xs text-[#E2E8F0] placeholder-[#64748B] rounded-sm border border-[#1E293B] focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#64748B] hover:text-[#38BDF8]"
            >
              [CLEAR]
            </button>
          )}
        </div>

        {/* Filters and View toggles */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap text-xs">
          {/* Severity selector */}
          <select
            value={filters.severity}
            onChange={(e) => onFilterChange({ severity: e.target.value })}
            className="px-2.5 py-1.5 bg-[#0A0C10] text-[11px] font-bold text-[#E2E8F0] rounded-sm border border-[#1E293B] focus:outline-none focus:border-[#38BDF8]"
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#0F172A]">
                {s.label}
              </option>
            ))}
          </select>

          {/* Source selector */}
          <select
            value={filters.source}
            onChange={(e) => onFilterChange({ source: e.target.value })}
            className="px-2.5 py-1.5 bg-[#0A0C10] text-[11px] font-bold text-[#E2E8F0] rounded-sm border border-[#1E293B] focus:outline-none focus:border-[#38BDF8]"
          >
            <option value="all" className="bg-[#0F172A]">SOURCE: ALL</option>
            {sources.map((src) => (
              <option key={src} value={src} className="bg-[#0F172A]">
                {src.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Selected Only toggle */}
          <button
            type="button"
            onClick={() => onFilterChange({ onlySelected: !filters.onlySelected })}
            className={`px-2.5 py-1.5 rounded-sm text-[11px] font-bold border flex items-center gap-1.5 transition-colors ${
              filters.onlySelected
                ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/60'
                : 'bg-[#0A0C10] text-[#64748B] border-[#1E293B] hover:text-[#E2E8F0]'
            }`}
          >
            <CheckSquare className="w-3 h-3 text-[#38BDF8]" />
            <span className="hidden sm:inline">SELECTED ({selectedCount})</span>
            <span className="sm:hidden">({selectedCount})</span>
          </button>

          {/* View mode toggle */}
          <div className="flex bg-[#0A0C10] p-0.5 rounded-sm border border-[#1E293B] items-center">
            <button
              type="button"
              onClick={() => onViewModeChange('sections')}
              className={`px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition ${
                viewMode === 'sections'
                  ? 'bg-[#38BDF8] text-[#0F172A]'
                  : 'text-[#94A3B8] hover:text-[#E2E8F0]'
              }`}
              title="Organizado por las 5 categorías oficiales en bloques consecutivos (Secciones 1 a 5)"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden md:inline">SECCIONES (1-5)</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('columns')}
              className={`px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition ${
                viewMode === 'columns'
                  ? 'bg-[#38BDF8] text-[#0F172A]'
                  : 'text-[#94A3B8] hover:text-[#E2E8F0]'
              }`}
              title="Tablero SOC Multi-Columna (5 columnas en paralelo)"
            >
              <Columns3 className="w-3 h-3" />
              <span className="hidden md:inline">TABLERO 5 COL</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1 text-[10px] font-bold flex items-center gap-1 transition ${
                viewMode === 'grid'
                  ? 'bg-[#1E293B] text-[#38BDF8]'
                  : 'text-[#64748B] hover:text-[#E2E8F0]'
              }`}
              title="Vista en tarjetas continua (Grid)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`p-1 text-[10px] font-bold flex items-center gap-1 transition ${
                viewMode === 'table'
                  ? 'bg-[#1E293B] text-[#38BDF8]'
                  : 'text-[#64748B] hover:text-[#E2E8F0]'
              }`}
              title="Vista en tabla de inventario (Table)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] no-scrollbar pt-1 border-t border-[#1E293B]/70">
        <span className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
          <Filter className="w-2.5 h-2.5 text-[#38BDF8]" /> SECCIÓN:
        </span>
        {CATEGORIES.map((cat) => {
          const isActive = filters.category === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => onFilterChange({ category: cat.value })}
              className={`px-2 py-0.5 rounded-none text-[10px] uppercase font-bold tracking-wider transition-colors shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#38BDF8] text-[#0F172A]'
                  : 'bg-[#0A0C10] text-[#94A3B8] hover:text-[#E2E8F0] border border-[#1E293B] hover:border-slate-600'
              }`}
            >
              {cat.code && (
                <span className={`text-[9px] font-mono ${isActive ? 'text-[#0F172A] opacity-75' : 'text-[#38BDF8]'}`}>
                  [{cat.code}]
                </span>
              )}
              <span>{cat.label}</span>
            </button>
          );
        })}

        {onOpenSources && (
          <button
            type="button"
            onClick={onOpenSources}
            className="ml-auto px-2 py-0.5 rounded-none text-[10px] uppercase font-bold tracking-wider transition-colors shrink-0 flex items-center gap-1.5 bg-amber-400/10 text-amber-400 border border-amber-500/40 hover:bg-amber-400 hover:text-slate-950"
            title="Abrir panel de fuentes de inteligencia y canales RSS"
          >
            <Rss className="w-2.5 h-2.5" />
            <span>GESTIONAR_FUENTES</span>
          </button>
        )}
      </div>
    </div>
  );
}

