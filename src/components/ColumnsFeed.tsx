import { Shield, Globe, Bug, Skull, FileText, CheckSquare, Square } from 'lucide-react';
import { CATEGORY_DEFINITIONS } from '../types';
import type { NewsCategory, NewsItem } from '../types';
import { NewsCard } from './NewsCard';

interface ColumnsFeedProps {
  news: NewsItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onAnalyzeThreat: (item: NewsItem) => void;
  onSelectCategoryItems?: (category: NewsCategory, select: boolean) => void;
}

export function ColumnsFeed({
  news,
  selectedIds,
  onToggleSelect,
  onAnalyzeThreat,
  onSelectCategoryItems,
}: ColumnsFeedProps) {
  const getCategoryIcon = (code: string) => {
    switch (code) {
      case '01':
        return <Shield className="w-3.5 h-3.5 text-amber-400" />;
      case '02':
        return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
      case '03':
        return <Bug className="w-3.5 h-3.5 text-red-400" />;
      case '04':
        return <Skull className="w-3.5 h-3.5 text-purple-400" />;
      case '05':
        return <FileText className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />;
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 pt-1 no-scrollbar min-h-[600px] items-start">
      {CATEGORY_DEFINITIONS.map((def) => {
        const catNews = news.filter((n) => n.category === def.id);
        const allSelected = catNews.length > 0 && catNews.every((n) => selectedIds.has(n.id));

        return (
          <div
            key={def.id}
            className={`w-[340px] shrink-0 border bg-[#0F172A]/80 flex flex-col max-h-[calc(100vh-250px)] ${def.borderColor}`}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-[#1E293B] bg-[#0A0C10] select-none">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-[#38BDF8]">
                    [{def.code}]
                  </span>
                  {getCategoryIcon(def.code)}
                  <h3 className="text-xs font-bold text-white truncate max-w-[180px]">
                    {def.fullTitle.split(':')[0]}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 border ${def.tagColor}`}
                >
                  {catNews.length}
                </span>
              </div>

              <div className="flex items-center justify-between text-[9px] text-[#64748B] font-mono">
                <span className="truncate max-w-[200px]">{def.sourceScope.split(',')[0]}</span>
                {catNews.length > 0 && onSelectCategoryItems && (
                  <button
                    type="button"
                    onClick={() => onSelectCategoryItems(def.id, !allSelected)}
                    className="text-[#94A3B8] hover:text-[#38BDF8] flex items-center gap-1 uppercase transition"
                  >
                    {allSelected ? <CheckSquare className="w-2.5 h-2.5 text-[#38BDF8]" /> : <Square className="w-2.5 h-2.5" />}
                    <span>PDF</span>
                  </button>
                )}
              </div>
            </div>

            {/* Column Items */}
            <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
              {catNews.length === 0 ? (
                <div className="p-4 text-center text-[10px] font-mono text-[#64748B] border border-dashed border-[#1E293B]">
                  SIN ALERTAS COINCIDENTES
                </div>
              ) : (
                catNews.map((item) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={onToggleSelect}
                    onAnalyzeThreat={onAnalyzeThreat}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
