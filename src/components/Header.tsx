import { useState, useEffect } from 'react';
import { RefreshCw, FileDown, Radio, Rss, Layers } from 'lucide-react';

interface HeaderProps {
  lastUpdated: string;
  isRefreshing: boolean;
  selectedCount: number;
  totalCount: number;
  sourcesCount?: number;
  onRefresh: () => void;
  onOpenExportModal: () => void;
  onOpenSourcesModal: () => void;
  onOpenWorkspaceModal?: () => void;
  activeTimeframe: 'today' | 'yesterday' | 'week';
  onTimeframeChange: (tf: 'today' | 'yesterday' | 'week') => void;
}

export function Header({
  lastUpdated,
  isRefreshing,
  selectedCount,
  totalCount,
  sourcesCount = 11,
  onRefresh,
  onOpenExportModal,
  onOpenSourcesModal,
  onOpenWorkspaceModal,
  activeTimeframe,
  onTimeframeChange,
}: HeaderProps) {
  const [systemTime, setSystemTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      const secs = String(now.getUTCSeconds()).padStart(2, '0');
      setSystemTime(`${year}.${month}.${day} | ${hours}:${mins}:${secs} UTC`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 border-b border-[#1E293B] bg-[#0F172A] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 select-none">
      {/* Brand & Status */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
        {/* Guardia Civil Ciberseguridad Shield */}
        <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-950/70 border border-emerald-500/40 p-0.5 shrink-0 flex items-center justify-center">
          <img
            src="/assets/escudo_ciber.png"
            alt="Guardia Civil Ciberseguridad"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50 shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          <h1
            className="text-xs sm:text-sm font-bold tracking-tight text-[#38BDF8] flex flex-wrap items-center gap-x-2 gap-y-0.5"
            title="Unidad de Coordinación de Ciberseguridad - Novedades OSINT Ciber"
          >
            <span className="whitespace-nowrap text-slate-100">Guardia Civil</span>
            <span className="text-[#64748B] font-normal hidden md:inline">//</span>
            <span className="text-[#38BDF8] font-bold whitespace-nowrap">
              U.C. Ciberseguridad
            </span>
            <span className="text-[#64748B] font-normal hidden lg:inline">//</span>
            <span className="text-slate-300 text-[11px] sm:text-xs font-semibold whitespace-nowrap hidden sm:inline">
              NOVEDADES OSINT CIBER
            </span>
          </h1>
          <span className="hidden 2xl:inline-block text-[11px] text-[#64748B] border-l border-[#1E293B] pl-3 whitespace-nowrap">
            UCCIBER // OSINT
          </span>
        </div>
        <span className="hidden 2xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 shrink-0">
          <Radio className="w-2.5 h-2.5 animate-pulse" />
          ACTIVE_MONITOR
        </span>
      </div>

      {/* Controls and System Time */}
      <div className="flex items-center space-x-2.5 sm:space-x-4">
        {/* Sources Management Button */}
        <button
          type="button"
          onClick={onOpenSourcesModal}
          className="bg-[#1E293B]/70 hover:bg-[#1E293B] hover:border-[#38BDF8]/50 text-[#E2E8F0] px-2.5 sm:px-3 py-1.5 rounded-sm text-xs border border-[#1E293B] flex items-center space-x-1.5 transition-colors group"
          title="Ver fuentes de noticias y configurar feeds RSS personalizados"
        >
          <Rss className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline text-[11px] font-bold tracking-wider">FUENTES_RSS</span>
          <span className="bg-[#0A0C10] text-[#38BDF8] text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border border-[#1E293B]">
            {sourcesCount}
          </span>
        </button>

        {/* Timeframe selector buttons */}
        <div className="flex bg-[#0A0C10] p-0.5 rounded border border-[#1E293B] text-[10px] font-bold">
          {(['today', 'yesterday', 'week'] as const).map((tf) => {
            const labels = { today: 'HOY', yesterday: 'AYER', week: '7_DÍAS' };
            const isActive = activeTimeframe === tf;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange(tf)}
                className={`px-2 py-1 rounded-sm transition-colors uppercase ${
                  isActive
                    ? 'bg-[#38BDF8] text-[#0F172A]'
                    : 'text-[#64748B] hover:text-[#E2E8F0]'
                }`}
              >
                {labels[tf]}
              </button>
            );
          })}
        </div>

        {/* Sync Feed Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="bg-[#1E293B]/60 hover:bg-[#1E293B] text-[#E2E8F0] px-2.5 py-1.5 rounded-sm text-xs border border-[#1E293B] flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          title="Sincronizar feeds de inteligencia"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#38BDF8]' : 'text-[#64748B]'}`} />
          <span className="hidden sm:inline text-[10px] font-semibold tracking-wider">SYNC</span>
        </button>

        {/* System Time clock */}
        <div className="text-right hidden xl:block">
          <p className="text-[9px] text-[#64748B] uppercase tracking-wider">System Time</p>
          <p className="text-[11px] font-bold text-slate-200 font-mono">{systemTime}</p>
        </div>

        {/* Google Workspace Button */}
        {onOpenWorkspaceModal && (
          <button
            type="button"
            onClick={onOpenWorkspaceModal}
            className="bg-blue-600/90 hover:bg-blue-500 text-white px-2.5 sm:px-3.5 py-1.5 rounded-sm text-xs font-bold flex items-center space-x-1.5 transition-colors active:scale-95 shadow-sm shadow-blue-500/20 border border-blue-400/40"
            title="Google Workspace: Exportar a Google Docs, Sheets y Drive"
          >
            <Layers className="w-3.5 h-3.5 text-blue-200" />
            <span className="hidden sm:inline tracking-wider">WORKSPACE</span>
            <span className="text-[9px] bg-blue-950/80 text-blue-200 px-1 py-0.2 rounded font-mono">
              DOCS/DRIVE/SHEETS
            </span>
          </button>
        )}

        {/* Export to PDF Button (High Density Style) */}
        <button
          type="button"
          onClick={onOpenExportModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-[#0F172A] px-3 sm:px-4 py-1.5 rounded-sm text-xs font-bold flex items-center space-x-2 transition-colors active:scale-95 shadow-sm shadow-emerald-500/25"
          title="Generar e imprimir boletín PDF oficial NOVEDADES OSINT CIBER con escudo"
        >
          <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="tracking-wider">BOLETÍN_PDF</span>
          {selectedCount > 0 && (
            <span className="bg-[#0F172A] text-emerald-400 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
              {selectedCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

