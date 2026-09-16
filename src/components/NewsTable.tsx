import { ExternalLink, Sparkles, Check, Languages } from 'lucide-react';
import { CATEGORY_MAP } from '../types';
import type { NewsCategory, NewsItem, Severity } from '../types';

interface NewsTableProps {
  news: NewsItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onAnalyzeThreat: (item: NewsItem) => void;
}

const SEVERITY_BADGES: Record<Severity, string> = {
  CRITICAL: 'bg-red-950/50 text-red-400 border-red-500/50',
  HIGH: 'bg-orange-950/50 text-orange-400 border-orange-500/50',
  MEDIUM: 'bg-slate-800 text-slate-300 border-slate-700',
  LOW: 'bg-slate-800 text-slate-400 border-slate-700',
  INFO: 'bg-slate-900 text-slate-500 border-slate-800',
};

export function NewsTable({ news, selectedIds, onToggleSelect, onAnalyzeThreat }: NewsTableProps) {
  return (
    <div className="bg-[#0F172A] border border-[#1E293B] overflow-hidden select-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0A0C10] text-[#64748B] uppercase tracking-wider font-bold text-[10px] border-b border-[#1E293B]">
            <tr>
              <th className="p-2.5 w-10 text-center">PDF</th>
              <th className="p-2.5 w-28">SEVERITY</th>
              <th className="p-2.5 w-32">CATEGORY</th>
              <th className="p-2.5">INTEL_TITLE // SUMMARY</th>
              <th className="p-2.5 w-32">CVE_ID</th>
              <th className="p-2.5 w-28">SOURCE</th>
              <th className="p-2.5 w-24 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/70">
            {news.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <tr
                  key={item.id}
                  className={`hover:bg-[#1E293B]/40 transition ${
                    isSelected ? 'bg-[#38BDF8]/10' : ''
                  }`}
                >
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleSelect(item.id)}
                      className={`w-3.5 h-3.5 mx-auto flex items-center justify-center border transition ${
                        isSelected
                          ? 'bg-[#38BDF8] border-[#38BDF8] text-[#0F172A]'
                          : 'bg-[#0A0C10] border-[#1E293B] hover:border-slate-500 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                        SEVERITY_BADGES[item.severity]
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="p-2.5">
                    {(() => {
                      const catDef = CATEGORY_MAP[item.category];
                      const code = catDef?.code || '00';
                      const shortLabel = catDef?.shortLabel || item.category;
                      return (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-[#38BDF8] px-1.5 py-0.5 bg-[#0A0C10] border border-[#1E293B]"
                          title={catDef?.fullTitle || item.category}
                        >
                          <span className="text-[#64748B] font-bold">[{code}]</span>
                          <span className="truncate max-w-[120px]">{shortLabel}</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-1.5">
                      {item.translated && (
                        <span
                          className="text-[9px] px-1 py-0.2 border border-blue-500/40 bg-blue-950/50 text-blue-300 font-mono font-bold shrink-0 flex items-center gap-0.5"
                          title={item.originalTitle ? `Traducido del inglés: "${item.originalTitle}"` : 'Traducido al español'}
                        >
                          <Languages className="w-2.5 h-2.5" />
                          <span>ES</span>
                        </span>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-200 font-bold hover:text-[#38BDF8] transition flex items-center gap-1.5"
                      >
                        <span className="line-clamp-1">{item.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-[#64748B]" />
                      </a>
                    </div>
                    <p className="text-[#94A3B8] line-clamp-1 text-[11px] mt-0.5 font-sans">
                      {item.summary}
                    </p>
                  </td>
                  <td className="p-2.5 font-mono text-[10px]">
                    {item.cves.length > 0 ? (
                      <span className="text-red-400 bg-red-950/50 px-1 py-0.5 border border-red-500/40">
                        {item.cves[0]}
                      </span>
                    ) : (
                      <span className="text-[#475569]">-</span>
                    )}
                  </td>
                  <td className="p-2.5 text-[#64748B]">
                    <span className="px-1.5 py-0.5 bg-[#1E293B] text-[#94A3B8] text-[9px] uppercase">
                      {item.source}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onAnalyzeThreat(item)}
                      className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#1E293B]/60 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#0F172A] border border-[#38BDF8]/40 hover:border-[#38BDF8] transition-colors inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      ANALIZAR
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

