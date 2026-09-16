import { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, ChevronDown, ChevronUp, Sparkles, Target, Zap } from 'lucide-react';
import type { DailyBriefing } from '../types';

interface ExecutiveBriefingCardProps {
  briefing: DailyBriefing | null;
  isLoading: boolean;
  onRefreshBriefing?: () => void;
}

export function ExecutiveBriefingCard({ briefing, isLoading }: ExecutiveBriefingCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading && !briefing) {
    return (
      <div className="bg-[#0F172A] border border-[#1E293B] p-4 text-slate-300 animate-pulse font-mono select-none">
        <div className="h-3.5 bg-[#1E293B] w-1/4 mb-3"></div>
        <div className="h-2.5 bg-[#1E293B] w-full mb-2"></div>
        <div className="h-2.5 bg-[#1E293B] w-3/4 mb-3"></div>
      </div>
    );
  }

  if (!briefing) return null;

  const alertColors = {
    CRITICAL: {
      badge: 'bg-red-900/40 text-red-400 border border-red-500/50',
      label: 'ALERT_LEVEL: CRITICAL',
      border: 'border-red-500/40',
      accentText: 'text-red-400',
    },
    HIGH: {
      badge: 'bg-orange-900/40 text-orange-400 border border-orange-500/50',
      label: 'ALERT_LEVEL: HIGH',
      border: 'border-orange-500/40',
      accentText: 'text-orange-400',
    },
    ELEVATED: {
      badge: 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40',
      label: 'ALERT_LEVEL: ELEVATED',
      border: 'border-[#38BDF8]/40',
      accentText: 'text-[#38BDF8]',
    },
    NORMAL: {
      badge: 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/40',
      label: 'ALERT_LEVEL: NOMINAL',
      border: 'border-emerald-500/40',
      accentText: 'text-emerald-400',
    },
  };

  const currentTheme = alertColors[briefing.alertLevel] || alertColors.ELEVATED;

  return (
    <section className={`bg-[#0F172A] border ${currentTheme.border} p-3.5 sm:p-4 transition-colors select-none font-mono`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-[#0A0C10] border border-[#1E293B] text-[#38BDF8] shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              <span className={`px-1.5 py-0.5 font-bold uppercase tracking-wider ${currentTheme.badge}`}>
                {currentTheme.label}
              </span>
              <span className="text-[#64748B] flex items-center gap-1 font-semibold">
                <Sparkles className="w-2.5 h-2.5 text-[#38BDF8]" />
                DAILY_EXECUTIVE_INTEL
              </span>
              <span className="text-[#64748B]">
                // {briefing.date}
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 mt-1 leading-snug">
              {briefing.headline}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 bg-[#1E293B]/40 hover:bg-[#1E293B] text-[#64748B] hover:text-[#E2E8F0] border border-[#1E293B] transition"
          aria-label={isExpanded ? 'Contraer resumen' : 'Expandir resumen'}
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#1E293B] space-y-3">
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {briefing.summary}
          </p>

          {/* Top Threat Cards */}
          {briefing.topThreats && briefing.topThreats.length > 0 && (
            <div>
              <div className="text-[10px] text-[#64748B] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                <Target className="w-3 h-3 text-red-400" />
                <span>PRIORITY_THREAT_TARGETS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {briefing.topThreats.slice(0, 3).map((threat, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-[#0A0C10] border border-[#1E293B] hover:border-[#38BDF8]/40 transition"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-bold text-slate-200 truncate">
                        {threat.title}
                      </span>
                      <span
                        className={`text-[9px] px-1 py-0.2 font-bold uppercase shrink-0 border ${
                          threat.severity === 'CRITICAL'
                            ? 'bg-red-950/50 text-red-400 border-red-500/40'
                            : 'bg-orange-950/50 text-orange-400 border-orange-500/40'
                        }`}
                      >
                        {threat.severity}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 font-sans leading-relaxed">
                      {threat.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Actions for SOC */}
          {briefing.keyActions && briefing.keyActions.length > 0 && (
            <div className="bg-[#0A0C10] p-2.5 border border-[#1E293B]">
              <div className="text-[10px] text-[#38BDF8] uppercase tracking-widest font-bold mb-1.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#38BDF8]" />
                <span>ACTION_PROTOCOL // SOC &amp; CISO IMMEDIATE_DIRECTIVES</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300 font-sans">
                {briefing.keyActions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CVE Watchlist */}
          {briefing.cveWatchlist && briefing.cveWatchlist.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-[10px] pt-1">
              <span className="text-[#64748B] uppercase tracking-wider font-bold">CVE_WATCHLIST:</span>
              {briefing.cveWatchlist.map((cve) => (
                <span
                  key={cve}
                  className="px-1.5 py-0.5 bg-red-950/40 text-red-400 border border-red-500/40 font-mono text-[10px] font-bold"
                >
                  {cve}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

