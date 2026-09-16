import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { ExecutiveBriefingCard } from './components/ExecutiveBriefingCard';
import { MetricsBar } from './components/MetricsBar';
import { FiltersBar } from './components/FiltersBar';
import { NewsCard } from './components/NewsCard';
import { NewsTable } from './components/NewsTable';
import { CategorizedFeed } from './components/CategorizedFeed';
import { ColumnsFeed } from './components/ColumnsFeed';
import { ThreatAnalysisModal } from './components/ThreatAnalysisModal';
import { ExportPdfModal } from './components/ExportPdfModal';
import { SourcesManagerModal } from './components/SourcesManagerModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { TrendsChart } from './components/TrendsChart';
import { CATEGORY_DEFINITIONS } from './types';
import type { DailyBriefing, NewsCategory, NewsFilterState, NewsItem, ViewMode } from './types';
import { Shield, AlertCircle, FileDown, SearchX, Terminal, Activity, Radio, FileText, Bug, Layers, Rss } from 'lucide-react';

export default function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [sourcesCount, setSourcesCount] = useState<number>(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<'today' | 'yesterday' | 'week'>('today');
  const [viewMode, setViewMode] = useState<ViewMode>('sections');

  // Filter State
  const [filters, setFilters] = useState<NewsFilterState>({
    search: '',
    category: 'all',
    severity: 'all',
    source: 'all',
    onlySelected: false,
  });

  // Modal states
  const [activeAnalysisItem, setActiveAnalysisItem] = useState<NewsItem | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  // Fetch news on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [newsRes, briefingRes] = await Promise.allSettled([
          fetch('/api/news'),
          fetch('/api/briefing'),
        ]);

        if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
          const data = await newsRes.value.json();
          setNews(data.news || []);
          setLastUpdated(data.lastUpdated || new Date().toISOString());
          if (typeof data.sourcesCount === 'number') {
            setSourcesCount(data.sourcesCount);
          }
        }

        if (briefingRes.status === 'fulfilled' && briefingRes.value.ok) {
          const bData = await briefingRes.value.json();
          setBriefing(bData);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle manual feed sync
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/news/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.news) setNews(data.news);
        if (data.briefing) setBriefing(data.briefing);
        if (data.lastUpdated) setLastUpdated(data.lastUpdated);
      }
    } catch (err) {
      console.error('Error refreshing feeds:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredNews.map((n) => n.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSelectCriticalOnly = () => {
    const criticalAndHighIds = filteredNews
      .filter((n) => n.severity === 'CRITICAL' || n.severity === 'HIGH')
      .map((n) => n.id);
    setSelectedIds(new Set(criticalAndHighIds));
  };

  const handleSelectCategoryItems = (category: NewsCategory, select: boolean) => {
    const catItems = filteredNews.filter((n) => n.category === category);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      catItems.forEach((item) => {
        if (select) next.add(item.id);
        else next.delete(item.id);
      });
      return next;
    });
  };

  // Single item deep analysis
  const handleOpenAnalysisModal = (item: NewsItem) => {
    setActiveAnalysisItem(item);
    setIsAnalysisModalOpen(true);
  };

  const handleRunAnalysis = async (item: NewsItem) => {
    setIsAnalyzingSingle(true);
    try {
      const res = await fetch('/api/analyze-threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, content: item.content || item.summary }),
      });

      if (res.ok) {
        const analysis = await res.json();
        // Update item in local state
        setNews((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, aiAnalysis: analysis } : n))
        );
        setActiveAnalysisItem((prev) => (prev && prev.id === item.id ? { ...prev, aiAnalysis: analysis } : prev));
      }
    } catch (err) {
      console.error('Error analyzing threat:', err);
    } finally {
      setIsAnalyzingSingle(false);
    }
  };

  // Unique sources for filter
  const sources = useMemo(() => {
    return Array.from(new Set(news.map((n) => n.source))).filter(Boolean);
  }, [news]);

  // Filtered news calculation
  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      // Timeframe filter
      if (timeframe === 'today') {
        const itemDate = new Date(item.publishedAt).getTime();
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (itemDate < oneDayAgo) return false;
      } else if (timeframe === 'yesterday') {
        const itemDate = new Date(item.publishedAt).getTime();
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
        if (itemDate > oneDayAgo || itemDate < twoDaysAgo) return false;
      }

      // Search
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSummary = item.summary.toLowerCase().includes(q);
        const matchCve = item.cves.some((c) => c.toLowerCase().includes(q));
        const matchTag = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchActor = item.threatActors?.some((a) => a.toLowerCase().includes(q));
        if (!matchTitle && !matchSummary && !matchCve && !matchTag && !matchActor) {
          return false;
        }
      }

      // Category
      if (filters.category !== 'all' && item.category !== filters.category) {
        return false;
      }

      // Severity
      if (filters.severity !== 'all') {
        if (filters.severity === 'LOW_INFO') {
          if (item.severity !== 'LOW' && item.severity !== 'INFO') return false;
        } else if (item.severity !== filters.severity) {
          return false;
        }
      }

      // Source
      if (filters.source !== 'all' && item.source !== filters.source) {
        return false;
      }

      // Only selected
      if (filters.onlySelected && !selectedIds.has(item.id)) {
        return false;
      }

      return true;
    });
  }, [news, filters, timeframe, selectedIds]);

  return (
    <div className="h-screen w-full bg-[#0A0C10] text-[#E2E8F0] flex flex-col font-mono overflow-hidden">
      {/* Top Header */}
      <Header
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        selectedCount={selectedIds.size}
        totalCount={news.length}
        sourcesCount={sourcesCount}
        onRefresh={handleRefresh}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
        activeTimeframe={timeframe}
        onTimeframeChange={setTimeframe}
      />

      {/* Main 3-Column Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Filters & System Diagnostics (High Density Design) */}
        <aside className="w-64 border-r border-[#1E293B] bg-[#0F172A]/50 flex-col justify-between shrink-0 hidden lg:flex select-none p-4 overflow-y-auto">
          <div className="space-y-5">
            {/* 5 Requested Intelligence Categories */}
            <div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[#38BDF8]" />
                  <span>CATEGORÍAS_INTEL</span>
                </span>
                <span className="text-[9px] text-[#38BDF8] font-bold">5 ÁREAS</span>
              </div>
              <div className="space-y-1 text-xs">
                {/* Todas */}
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, category: 'all' }))}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition ${
                    filters.category === 'all'
                      ? 'border-l-2 border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8] font-bold'
                      : 'border-l-2 border-[#1E293B] bg-[#1E293B]/20 text-[#94A3B8] hover:bg-[#1E293B]/40 hover:text-[#E2E8F0]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-[9px] text-[#64748B] font-mono">[00]</span>
                    <span>TODAS LAS SECCIONES</span>
                  </span>
                  <span className="text-[10px] opacity-75 font-mono">{news.length}</span>
                </button>

                {/* 5 Explicit categories */}
                {CATEGORY_DEFINITIONS.map((def) => {
                  const count = news.filter((n) => n.category === def.id).length;
                  const isActive = filters.category === def.id;
                  return (
                    <button
                      key={def.id}
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, category: def.id }))}
                      title={def.description}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition ${
                        isActive
                          ? 'border-l-2 border-[#38BDF8] bg-[#1E293B] text-[#38BDF8] font-bold'
                          : 'border-l-2 border-[#1E293B] bg-[#1E293B]/20 text-[#94A3B8] hover:bg-[#1E293B]/40 hover:text-[#E2E8F0]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate pr-1">
                        <span className="text-[9px] font-mono font-bold text-[#64748B]">[{def.code}]</span>
                        <span className="truncate text-[11px]">{def.shortLabel}</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono shrink-0 px-1 py-0.2 rounded-none ${
                          isActive ? 'bg-[#38BDF8]/20 text-[#38BDF8]' : 'text-[#64748B]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity Filters */}
            <div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-[#38BDF8]" />
                <span>SEVERITY_FILTERS</span>
              </div>
              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, severity: 'CRITICAL' }))}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition ${
                    filters.severity === 'CRITICAL'
                      ? 'border-l-2 border-red-500 bg-[#1E293B] text-red-400 font-bold'
                      : 'border-l-2 border-red-500/40 bg-[#1E293B]/20 text-[#94A3B8] hover:bg-[#1E293B]/40'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    CRITICAL
                  </span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {news.filter((n) => n.severity === 'CRITICAL').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, severity: 'HIGH' }))}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition ${
                    filters.severity === 'HIGH'
                      ? 'border-l-2 border-orange-500 bg-[#1E293B] text-orange-400 font-bold'
                      : 'border-l-2 border-orange-500/40 bg-[#1E293B]/20 text-[#94A3B8] hover:bg-[#1E293B]/40'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    HIGH
                  </span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {news.filter((n) => n.severity === 'HIGH').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, severity: 'MEDIUM' }))}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition ${
                    filters.severity === 'MEDIUM'
                      ? 'border-l-2 border-yellow-500 bg-[#1E293B] text-yellow-400 font-bold'
                      : 'border-l-2 border-yellow-500/40 bg-[#1E293B]/20 text-[#94A3B8] hover:bg-[#1E293B]/40'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    MEDIUM
                  </span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {news.filter((n) => n.severity === 'MEDIUM').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, severity: 'all' }))}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition ${
                    filters.severity === 'all'
                      ? 'border-l-2 border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8] font-bold'
                      : 'border-l-2 border-[#38BDF8]/40 bg-[#1E293B]/20 text-[#94A3B8] hover:bg-[#1E293B]/40'
                  }`}
                >
                  <span>ALL_TRAFFIC</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {news.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Active Threats */}
            <div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-[#38BDF8]" />
                <span>ACTIVE_THREATS</span>
              </div>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, search: 'ransomware' }))}
                  className="w-full text-left p-2 bg-[#0A0C10] border border-[#1E293B] hover:border-[#38BDF8]/50 transition block"
                >
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#38BDF8]">#ransomware_trends</span>
                    <span className="text-red-400 font-bold">HIGH</span>
                  </div>
                  <div className="h-1 bg-[#1E293B] overflow-hidden">
                    <div className="h-full bg-red-500 w-[78%]" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, search: 'zero-day' }))}
                  className="w-full text-left p-2 bg-[#0A0C10] border border-[#1E293B] hover:border-[#38BDF8]/50 transition block"
                >
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#38BDF8]">#zero_day_exploits</span>
                    <span className="text-orange-400 font-bold">ELEVATED</span>
                  </div>
                  <div className="h-1 bg-[#1E293B] overflow-hidden">
                    <div className="h-full bg-orange-500 w-[64%]" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, search: 'APT' }))}
                  className="w-full text-left p-2 bg-[#0A0C10] border border-[#1E293B] hover:border-[#38BDF8]/50 transition block"
                >
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#38BDF8]">#apt_monitoring</span>
                    <span className="text-emerald-400 font-bold">STABLE</span>
                  </div>
                  <div className="h-1 bg-[#1E293B] overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[42%]" />
                  </div>
                </button>
              </div>
            </div>

            {/* Staged Quick Status */}
            <div className="p-3 bg-[#0A0C10] border border-[#1E293B]">
              <div className="text-[10px] text-[#64748B] uppercase font-bold mb-1">STAGED_FOR_PDF</div>
              <div className="text-lg font-bold text-[#38BDF8] font-mono">
                {selectedIds.size} <span className="text-xs text-[#64748B] font-normal">/ {news.length} items</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="mt-2 w-full py-1 text-[10px] font-bold uppercase tracking-wider bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] transition"
              >
                OPEN_PDF_COMPILER
              </button>
            </div>
          </div>

          {/* System Diagnostics */}
          <div className="pt-4 border-t border-[#1E293B] space-y-1.5 text-[10px] text-[#64748B]">
            <div className="flex justify-between">
              <span>CORE:</span>
              <span className="text-emerald-400 font-bold">V3.2.1 // ONLINE</span>
            </div>
            <div className="flex justify-between items-center">
              <span>SOURCES:</span>
              <button
                type="button"
                onClick={() => setIsSourcesModalOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 cursor-pointer transition"
                title="Configurar y ver fuentes RSS"
              >
                <Rss className="w-3 h-3 text-amber-400" />
                <span>{sourcesCount} CANALES RSS</span>
              </button>
            </div>
            <div className="flex justify-between">
              <span>SECURITY_STATE:</span>
              <span className="text-[#38BDF8]">NOMINAL</span>
            </div>
          </div>
        </aside>

        {/* Center Main Feed */}
        <main className="flex-1 flex flex-col bg-[#0A0C10] overflow-y-auto p-4 space-y-4">
          
          {/* Executive Daily Briefing */}
          <ExecutiveBriefingCard
            briefing={briefing}
            isLoading={isLoading}
            onRefreshBriefing={handleRefresh}
          />

          {/* Threat Metrics & Quick Selection Bar */}
          <MetricsBar
            news={news}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onSelectCriticalOnly={handleSelectCriticalOnly}
          />

          {/* Weekly Threat Trends Chart (Recharts) */}
          <TrendsChart news={news} />

          {/* Filter Controls & Search */}
          <FiltersBar
            filters={filters}
            onFilterChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
            sources={sources}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedCount={selectedIds.size}
            onOpenSources={() => setIsSourcesModalOpen(true)}
          />

          {/* Results Counter & Export Trigger */}
          <div className="flex items-center justify-between text-xs text-[#64748B] px-1 font-mono">
            <p className="text-[11px]">
              DISPLAYING <span className="font-bold text-[#E2E8F0]">{filteredNews.length}</span> / {news.length} CYBER_EVENTS
              {filters.onlySelected && ` [FILTER: STAGED_ONLY]`}
            </p>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="text-[#38BDF8] hover:text-[#0EA5E9] font-bold text-[11px] inline-flex items-center gap-1.5 uppercase transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              CONFIGURE_AND_EXPORT_PDF
            </button>
          </div>

          {/* Loading Spinner */}
          {isLoading && (
            <div className="py-16 text-center text-[#64748B] space-y-3 font-mono">
              <div className="w-8 h-8 border-2 border-[#38BDF8] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs uppercase font-bold text-slate-300">
                INGESTING_INTEL_FEEDS // CISA_INCIBE_BLEEPING...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredNews.length === 0 && (
            <div className="bg-[#0F172A] border border-[#1E293B] p-8 text-center max-w-lg mx-auto my-8 space-y-3 font-mono">
              <div className="w-10 h-10 bg-[#1E293B] text-[#64748B] flex items-center justify-center mx-auto">
                <SearchX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  ZERO_INTEL_MATCHES_CRITERIA
                </h3>
                <p className="text-[11px] text-[#64748B] mt-1 font-sans">
                  No se encontraron noticias coincidentes. Prueba restablecer la búsqueda o los filtros activos.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    search: '',
                    category: 'all',
                    severity: 'all',
                    source: 'all',
                    onlySelected: false,
                  })
                }
                className="px-3 py-1.5 text-xs font-bold uppercase bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] transition"
              >
                RESET_FILTERS
              </button>
            </div>
          )}

          {/* Content View: Sections (Categorized 1 to 5), Columns, Grid, or Table */}
          {!isLoading && filteredNews.length > 0 && (
            <>
              {viewMode === 'sections' && (
                <CategorizedFeed
                  news={filteredNews}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onAnalyzeThreat={handleOpenAnalysisModal}
                  onSelectCategoryItems={handleSelectCategoryItems}
                  activeCategoryFilter={filters.category}
                  onSelectCategoryFilter={(cat) => setFilters((prev) => ({ ...prev, category: cat }))}
                />
              )}

              {viewMode === 'columns' && (
                <ColumnsFeed
                  news={filteredNews}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onAnalyzeThreat={handleOpenAnalysisModal}
                  onSelectCategoryItems={handleSelectCategoryItems}
                />
              )}

              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onToggleSelect={handleToggleSelect}
                      onAnalyzeThreat={handleOpenAnalysisModal}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'table' && (
                <NewsTable
                  news={filteredNews}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onAnalyzeThreat={handleOpenAnalysisModal}
                />
              )}
            </>
          )}

        </main>

        {/* Right Sidebar: PDF Export Stage & Threat Matrix (High Density Design) */}
        <aside className="w-72 border-l border-[#1E293B] bg-[#0F172A]/30 p-4 flex flex-col justify-between shrink-0 hidden xl:flex overflow-y-auto select-none space-y-4">
          <div className="space-y-4">
            
            {/* PDF Export Preview Card */}
            <div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-[#38BDF8]" />
                  PDF_EXPORT_PREVIEW
                </span>
                <span className="text-[9px] text-[#38BDF8]">TLP:AMBER</span>
              </div>
              
              <div className="border border-[#1E293B] bg-[#0A0C10] p-3 text-[10px] space-y-2">
                <div className="border-b border-[#1E293B] pb-1.5 flex justify-between text-[#64748B]">
                  <span>CONFIDENTIAL</span>
                  <span>SOC-CISO-DAILY</span>
                </div>
                <div className="space-y-1">
                  <div className="text-[#38BDF8] font-bold">CYBER_THREAT_REPORT</div>
                  <div className="text-[9px] text-[#64748B]">DATE: {new Date().toISOString().slice(0, 10)}</div>
                </div>
                <div className="pt-2 border-t border-[#1E293B] space-y-1 text-[#94A3B8]">
                  <div className="flex justify-between">
                    <span>STAGED_PAYLOAD:</span>
                    <span className="text-[#38BDF8] font-bold font-mono">{selectedIds.size > 0 ? selectedIds.size : filteredNews.length} ITEMS</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ALERT_LEVEL:</span>
                    <span className="text-red-400 font-bold">{briefing?.alertLevel || 'HIGH'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EST_PAGES:</span>
                    <span className="text-slate-300 font-mono">~{Math.max(1, Math.ceil((selectedIds.size > 0 ? selectedIds.size : filteredNews.length) / 3))}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full mt-2 py-1.5 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] font-bold uppercase text-[10px] transition tracking-wider flex items-center justify-center gap-1.5"
                >
                  <FileDown className="w-3 h-3" />
                  GENERATE_PDF
                </button>
              </div>
            </div>

            {/* Google Workspace Integration Card */}
            <div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-blue-400" />
                  <span>WORKSPACE_SYNC</span>
                </span>
                <span className="text-[9px] text-blue-400 font-bold">DOCS/SHEETS</span>
              </div>
              <div className="border border-blue-500/30 bg-[#0A0C10] p-3 text-[10px] space-y-2">
                <p className="text-[10px] text-[#94A3B8]">
                  Exporta a <strong className="text-slate-200">Google Docs</strong>, sincroniza registros en <strong className="text-slate-200">Google Sheets</strong> o sube PDFs a <strong className="text-slate-200">Drive</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(true)}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-[10px] transition tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Layers className="w-3 h-3" />
                  GOOGLE_WORKSPACE_HUB
                </button>
              </div>
            </div>

            {/* Threat Matrix Index */}
            <div>
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-[#38BDF8]" />
                <span>THREAT_MATRIX_NODES</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#0A0C10] border border-[#1E293B]">
                <div className="h-6 bg-red-950/60 border border-red-500/50 flex items-center justify-center text-[9px] text-red-400 font-bold">C1</div>
                <div className="h-6 bg-red-950/60 border border-red-500/50 flex items-center justify-center text-[9px] text-red-400 font-bold">C2</div>
                <div className="h-6 bg-orange-950/60 border border-orange-500/50 flex items-center justify-center text-[9px] text-orange-400 font-bold">H1</div>
                <div className="h-6 bg-orange-950/60 border border-orange-500/50 flex items-center justify-center text-[9px] text-orange-400 font-bold">H2</div>
                <div className="h-6 bg-yellow-950/60 border border-yellow-500/50 flex items-center justify-center text-[9px] text-yellow-400 font-bold">M1</div>
                <div className="h-6 bg-yellow-950/60 border border-yellow-500/50 flex items-center justify-center text-[9px] text-yellow-400 font-bold">M2</div>
                <div className="h-6 bg-[#0F172A] border border-[#38BDF8]/40 flex items-center justify-center text-[9px] text-[#38BDF8] font-bold">A1</div>
                <div className="h-6 bg-[#0F172A] border border-[#38BDF8]/40 flex items-center justify-center text-[9px] text-[#38BDF8] font-bold">A2</div>
              </div>
              <p className="text-[9px] text-[#64748B] mt-1">
                STATUS: CONTINUOUS_TELEMETRY_SYNC
              </p>
            </div>

            {/* CVE Watchlist Pills */}
            {briefing?.cveWatchlist && briefing.cveWatchlist.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Bug className="w-3 h-3 text-red-400" />
                  <span>CVE_WATCHLIST</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {briefing.cveWatchlist.map((cve) => (
                    <button
                      key={cve}
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, search: cve }))}
                      className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-red-950/40 border border-red-500/30 text-red-400 hover:border-red-400 transition uppercase"
                    >
                      {cve}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="pt-2 border-t border-[#1E293B] text-[9px] text-[#64748B] space-y-0.5">
            <div>INGESTION: CERT-ES, CISA, RSS</div>
            <div>STAGING: AUTO_READY</div>
          </div>
        </aside>

      </div>

      {/* Bottom Status Bar (High Density Design) */}
      <footer className="h-8 bg-[#020617] border-t border-[#1E293B] px-6 flex items-center justify-between text-[10px] text-[#64748B] uppercase tracking-tight shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            STATUS: NOMINAL
          </span>
          <span>//</span>
          <span>ENC: AES-256-GCM</span>
          <span>//</span>
          <span>NODE: US-EAST-B</span>
        </div>
        <div className="flex items-center gap-3">
          <span>LATENCY: 22MS</span>
          <span>//</span>
          <span>UPTIME: 99.98%</span>
        </div>
      </footer>

      {/* Threat Analysis Modal */}
      <ThreatAnalysisModal
        item={activeAnalysisItem}
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        onToggleSelect={handleToggleSelect}
        isSelected={activeAnalysisItem ? selectedIds.has(activeAnalysisItem.id) : false}
        onRunAnalysis={handleRunAnalysis}
        isAnalyzing={isAnalyzingSingle}
      />

      {/* Export PDF Modal */}
      <ExportPdfModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allNews={filteredNews}
        selectedIds={selectedIds}
        briefing={briefing}
        onOpenWorkspace={() => setIsWorkspaceModalOpen(true)}
      />

      {/* Sources & Custom Feeds Management Modal */}
      <SourcesManagerModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
        onSourcesUpdated={handleRefresh}
      />

      {/* Google Workspace Modal (Docs, Drive, Sheets) */}
      <GoogleWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        allNews={filteredNews}
        selectedIds={selectedIds}
        briefing={briefing}
      />
    </div>
  );
}
