import { ExternalLink, Sparkles, Clock, Check, Bug, Shield, Globe, AlertTriangle, Skull, FileText, Languages } from 'lucide-react';
import { CATEGORY_MAP } from '../types';
import type { NewsCategory, NewsItem, Severity } from '../types';

interface NewsCardProps {
  item: NewsItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onAnalyzeThreat: (item: NewsItem) => void;
}

const SEVERITY_CONFIG: Record<
  Severity,
  { bg: string; text: string; border: string; hoverBorder: string; label: string }
> = {
  CRITICAL: {
    bg: 'bg-red-950/40',
    text: 'text-red-400',
    border: 'border-red-500/50',
    hoverBorder: 'hover:border-red-500',
    label: 'CRITICAL',
  },
  HIGH: {
    bg: 'bg-orange-950/40',
    text: 'text-orange-400',
    border: 'border-orange-500/50',
    hoverBorder: 'hover:border-orange-500',
    label: 'HIGH_PRIORITY',
  },
  MEDIUM: {
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
    hoverBorder: 'hover:border-yellow-500/70',
    label: 'MEDIUM',
  },
  LOW: {
    bg: 'bg-slate-800/80',
    text: 'text-slate-400',
    border: 'border-slate-700',
    hoverBorder: 'hover:border-blue-500/70',
    label: 'LOW',
  },
  INFO: {
    bg: 'bg-slate-800/60',
    text: 'text-slate-400',
    border: 'border-slate-700',
    hoverBorder: 'hover:border-slate-600',
    label: 'ARCHIVED',
  },
};

export function NewsCard({ item, isSelected, onToggleSelect, onAnalyzeThreat }: NewsCardProps) {
  const severityStyle = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.INFO;

  const formatUtcTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const mins = String(d.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${mins} UTC`;
    } catch {
      return '00:00 UTC';
    }
  };

  return (
    <div
      className={`bg-[#0F172A] border p-3 flex flex-col justify-between group transition-colors select-none ${
        isSelected
          ? 'border-[#38BDF8] ring-1 ring-[#38BDF8]/40 shadow-md shadow-[#38BDF8]/10'
          : `border-[#1E293B] ${severityStyle.hoverBorder}`
      }`}
    >
      <div className="flex-1 flex flex-col">
        {/* Top bar: Checkbox, Severity Badge, Source & Time */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleSelect(item.id)}
              className={`w-3.5 h-3.5 rounded-none flex items-center justify-center border transition ${
                isSelected
                  ? 'bg-[#38BDF8] border-[#38BDF8] text-[#0F172A]'
                  : 'bg-[#0A0C10] border-[#1E293B] hover:border-slate-500 text-transparent'
              }`}
              title={isSelected ? 'Excluir de exportación' : 'Incluir en PDF'}
              aria-label="Seleccionar para informe PDF"
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </button>

            <span
              className={`text-[10px] px-1.5 py-0.5 border uppercase font-bold tracking-wider ${severityStyle.bg} ${severityStyle.text} ${severityStyle.border}`}
            >
              {severityStyle.label}
            </span>

            {item.translated && (
              <span
                className="text-[9px] px-1 py-0.5 border border-blue-500/40 bg-blue-950/40 text-blue-300 font-mono flex items-center gap-1 font-bold"
                title={item.originalTitle ? `Traducido del inglés: "${item.originalTitle}"` : 'Traducido al español'}
              >
                <Languages className="w-2.5 h-2.5" />
                <span>ES</span>
              </span>
            )}
          </div>

          <div className="text-[10px] text-[#64748B] font-mono flex items-center gap-1.5">
            <span>{formatUtcTime(item.publishedAt)}</span>
            <span>//</span>
            <span className="uppercase text-[#94A3B8] max-w-[110px] truncate">{item.source}</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xs sm:text-sm font-bold text-slate-200 group-hover:text-[#38BDF8] line-clamp-2 leading-snug">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline decoration-[#1E293B] underline-offset-2 flex items-start gap-1"
          >
            <span>{item.title}</span>
            <ExternalLink className="w-3 h-3 shrink-0 text-[#64748B] mt-0.5 group-hover:text-[#38BDF8]" />
          </a>
        </h2>

        {/* Snippet / Description */}
        <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed flex-1">
          {item.summary}
        </p>

        {/* Tags & CVEs */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {item.cves && item.cves.length > 0 && (
            item.cves.map((cve) => (
              <span
                key={cve}
                className="text-[9px] px-1 bg-red-950/50 text-red-400 font-mono border border-red-500/40 uppercase"
              >
                {cve}
              </span>
            ))
          )}

          {(() => {
            const catDef = CATEGORY_MAP[item.category];
            const code = catDef?.code || '00';
            const shortLabel = catDef?.shortLabel || item.category;
            return (
              <span
                className="text-[9px] px-1.5 py-0.5 bg-[#0A0C10] text-[#38BDF8] border border-[#1E293B] uppercase font-mono tracking-tight flex items-center gap-1"
                title={catDef?.fullTitle || item.category}
              >
                <span className="text-[#64748B] font-bold">[{code}]</span>
                <span>{shortLabel}</span>
              </span>
            );
          })()}

          {item.tags && item.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="text-[9px] px-1 bg-[#1E293B] text-[#64748B] uppercase font-mono hidden sm:inline"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Card Action Bar */}
      <div className="mt-3 pt-2 border-t border-[#1E293B] flex items-center justify-between gap-2">
        <div className="text-[9px] font-mono">
          {item.aiAnalysis ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none inline-block animate-pulse" />
              ANALYSIS_READY
            </span>
          ) : (
            <span className="text-[#64748B]">STATUS: RAW_INGEST</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onAnalyzeThreat(item)}
          className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider bg-[#1E293B]/60 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#0F172A] border border-[#38BDF8]/40 hover:border-[#38BDF8] transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-2.5 h-2.5" />
          <span>{item.aiAnalysis ? 'VER_ANÁLISIS' : 'ANALIZAR'}</span>
        </button>
      </div>
    </div>
  );
}

