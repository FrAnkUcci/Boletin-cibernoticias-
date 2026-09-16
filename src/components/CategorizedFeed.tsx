import { useState } from 'react';
import { 
  Shield, 
  Globe, 
  Bug, 
  Skull, 
  FileText, 
  CheckSquare, 
  Square, 
  ChevronDown, 
  ChevronUp, 
  ArrowDownCircle, 
  ExternalLink 
} from 'lucide-react';
import { CATEGORY_DEFINITIONS, CATEGORY_MAP } from '../types';
import type { CategoryMetadata, NewsCategory, NewsItem } from '../types';
import { NewsCard } from './NewsCard';
import { NewsTable } from './NewsTable';

interface CategorizedFeedProps {
  news: NewsItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onAnalyzeThreat: (item: NewsItem) => void;
  onSelectCategoryItems?: (category: NewsCategory, select: boolean) => void;
  activeCategoryFilter?: string;
  onSelectCategoryFilter?: (category: string) => void;
}

export function CategorizedFeed({
  news,
  selectedIds,
  onToggleSelect,
  onAnalyzeThreat,
  onSelectCategoryItems,
  activeCategoryFilter,
  onSelectCategoryFilter,
}: CategorizedFeedProps) {
  // Collapsible state per category (all open by default)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const getCategoryIcon = (code: string) => {
    switch (code) {
      case '01':
        return <Shield className="w-4 h-4 text-amber-400" />;
      case '02':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case '03':
        return <Bug className="w-4 h-4 text-red-400" />;
      case '04':
        return <Skull className="w-4 h-4 text-purple-400" />;
      case '05':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      default:
        return <Shield className="w-4 h-4 text-[#38BDF8]" />;
    }
  };

  const scrollToSection = (code: string) => {
    const el = document.getElementById(`category-section-${code}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // If a specific category filter is active, only show that category, or show all 5 if 'all'
  const categoriesToDisplay = activeCategoryFilter && activeCategoryFilter !== 'all'
    ? CATEGORY_DEFINITIONS.filter((c) => c.id === activeCategoryFilter)
    : CATEGORY_DEFINITIONS;

  return (
    <div className="space-y-6">
      {/* Quick Navigation Jump Bar (5 Categories Ribbon) */}
      <div className="bg-[#0F172A] border border-[#1E293B] p-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownCircle className="w-3 h-3 text-[#38BDF8]" />
            ÍNDICE DE CATEGORÍAS (ACCESO DIRECTO)
          </span>
          <span className="text-[10px] text-[#94A3B8] font-mono">
            5 SECCIONES ORDENADAS
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {CATEGORY_DEFINITIONS.map((def) => {
            const catNews = news.filter((n) => n.category === def.id);
            const isSelectedFilter = activeCategoryFilter === def.id;

            return (
              <button
                key={def.id}
                type="button"
                onClick={() => {
                  if (activeCategoryFilter === def.id) {
                    onSelectCategoryFilter?.('all');
                  } else {
                    scrollToSection(def.code);
                  }
                }}
                className={`p-2 text-left border transition relative group ${
                  isSelectedFilter
                    ? 'border-[#38BDF8] bg-[#38BDF8]/10 text-white'
                    : 'border-[#1E293B] bg-[#0A0C10] hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-[#38BDF8]">
                    [{def.code}]
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 ${
                      catNews.length > 0 ? def.tagColor : 'text-[#64748B] bg-slate-900'
                    }`}
                  >
                    {catNews.length}
                  </span>
                </div>
                <div className="text-[11px] font-bold truncate group-hover:text-[#38BDF8] transition">
                  {def.fullTitle.split(':')[0]}
                </div>
                <div className="text-[9px] text-[#64748B] truncate mt-0.5 font-mono">
                  {def.sourceScope.split(',')[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5 Distinct Category Sections */}
      {categoriesToDisplay.map((def) => {
        const catNews = news.filter((n) => n.category === def.id);
        const isCollapsed = collapsedCategories[def.id] || false;
        const allSelected = catNews.length > 0 && catNews.every((n) => selectedIds.has(n.id));
        const someSelected = catNews.some((n) => selectedIds.has(n.id));

        return (
          <section
            key={def.id}
            id={`category-section-${def.code}`}
            className={`border bg-[#0A0C10] scroll-mt-20 transition-all ${def.borderColor}`}
          >
            {/* Section Header Banner */}
            <div className="p-3.5 bg-[#0F172A] border-b border-[#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
              
              {/* Title & Info */}
              <div className="flex items-start gap-3">
                <div className={`p-2 border ${def.borderColor} ${def.accentBg} shrink-0 mt-0.5`}>
                  {getCategoryIcon(def.code)}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-[#64748B] bg-[#0A0C10] px-1.5 py-0.5 border border-[#1E293B]">
                      SECCIÓN [{def.code}]
                    </span>
                    <h2 className="text-sm font-bold text-white tracking-wide">
                      {def.fullTitle}
                    </h2>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${def.tagColor}`}
                    >
                      {catNews.length} {catNews.length === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#94A3B8] mt-1 line-clamp-1 max-w-3xl">
                    {def.description}
                  </p>
                  
                  <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                    <span className="text-slate-500 font-semibold">FUENTES:</span> {def.sourceScope}
                  </div>
                </div>
              </div>

              {/* Section Actions: Quick select for PDF & Collapse toggle */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {catNews.length > 0 && onSelectCategoryItems && (
                  <button
                    type="button"
                    onClick={() => onSelectCategoryItems(def.id, !allSelected)}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1E293B] hover:bg-[#334155] text-[#E2E8F0] border border-[#334155] flex items-center gap-1.5 transition"
                    title="Seleccionar o deseleccionar todas las noticias de esta sección para el informe"
                  >
                    {allSelected ? (
                      <>
                        <CheckSquare className="w-3 h-3 text-[#38BDF8]" />
                        <span>DESELECCIONAR SECCIÓN</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3 h-3 text-[#64748B]" />
                        <span>SELECCIONAR PARA PDF ({catNews.length})</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => toggleCollapse(def.id)}
                  className="p-1 text-[#64748B] hover:text-white bg-[#1E293B] border border-[#334155] transition"
                  title={isCollapsed ? 'Expandir sección' : 'Plegar sección'}
                >
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Section Content: News Cards Grid */}
            {!isCollapsed && (
              <div className="p-3.5">
                {catNews.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[#1E293B] bg-[#0F172A]/40 text-[#64748B] text-xs font-mono">
                    <p>NO SE HAN ENCONTRADO ENTRADAS COINCIDENTES EN ESTA SECCIÓN</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-sans">
                      Los criterios de búsqueda o severidad actuales no contienen noticias activas para [{def.fullTitle}].
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {catNews.map((item) => (
                      <NewsCard
                        key={item.id}
                        item={item}
                        isSelected={selectedIds.has(item.id)}
                        onToggleSelect={onToggleSelect}
                        onAnalyzeThreat={onAnalyzeThreat}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
