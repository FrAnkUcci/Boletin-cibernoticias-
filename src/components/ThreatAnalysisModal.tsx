import { useState } from 'react';
import { X, Sparkles, Shield, AlertTriangle, CheckCircle2, Copy, Check, ExternalLink, Bug, Server, Languages } from 'lucide-react';
import type { NewsItem } from '../types';

interface ThreatAnalysisModalProps {
  item: NewsItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleSelect: (id: string) => void;
  isSelected: boolean;
  onRunAnalysis: (item: NewsItem) => Promise<void>;
  isAnalyzing: boolean;
}

export function ThreatAnalysisModal({
  item,
  isOpen,
  onClose,
  onToggleSelect,
  isSelected,
  onRunAnalysis,
  isAnalyzing,
}: ThreatAnalysisModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !item) return null;

  const handleCopyRecommendation = () => {
    const textToCopy = `[CIBERSEGURIDAD - ${item.severity}] ${item.title}\nImpacto: ${item.aiAnalysis?.impact || item.summary}\nRecomendación: ${item.aiAnalysis?.recommendation || 'Aplicar parches oficiales.'}\nCVEs: ${item.cves.join(', ') || 'N/A'}\nFuente: ${item.url}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto font-mono select-none">
      <div className="bg-[#0F172A] border border-[#1E293B] w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-4 bg-[#0A0C10] border-b border-[#1E293B] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#1E293B] text-[#38BDF8]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                <span className="font-bold px-1.5 py-0.2 bg-[#1E293B] text-[#94A3B8] uppercase">
                  {item.source}
                </span>
                <span className={`font-bold uppercase px-1.5 py-0.2 border ${
                  item.severity === 'CRITICAL'
                    ? 'bg-red-950/50 text-red-400 border-red-500/50'
                    : 'bg-orange-950/50 text-orange-400 border-orange-500/50'
                }`}>
                  [{item.severity}]
                </span>
                <span className="text-[#64748B] uppercase">
                  {item.category}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 mt-1 leading-snug">
                {item.title}
              </h3>
              {item.translated && (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-blue-400 font-mono">
                  <Languages className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    Traducido al español {item.originalTitle ? `(Original: "${item.originalTitle}")` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#64748B] hover:text-[#E2E8F0] hover:bg-[#1E293B] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[72vh] overflow-y-auto text-xs">
          {/* Summary */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
              INTEL_DESCRIPTION // EVENT_REPORT
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed bg-[#0A0C10] p-2.5 border border-[#1E293B] font-sans">
              {item.summary}
            </p>
          </div>

          {/* CVEs */}
          {item.cves && item.cves.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5 flex items-center gap-1.5">
                <Bug className="w-3 h-3 text-red-400" />
                ASSOCIATED_CVE_RECORDS
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.cves.map((cve) => (
                  <span
                    key={cve}
                    className="px-2 py-0.5 bg-red-950/50 border border-red-500/40 text-red-400 font-mono text-[11px] font-bold uppercase"
                  >
                    {cve}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Security Analysis Section */}
          <div className="bg-[#0A0C10] border border-[#38BDF8]/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-[#1E293B] pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#38BDF8]">
                  AI_RISK_AND_IMPACT_ASSESSMENT
                </h4>
              </div>
              {!item.aiAnalysis && (
                <button
                  type="button"
                  onClick={() => onRunAnalysis(item)}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] transition disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isAnalyzing ? 'ANALYZING...' : 'RUN_DEEP_ANALYSIS'}</span>
                </button>
              )}
            </div>

            {item.aiAnalysis ? (
              <div className="space-y-2.5 text-[11px] text-slate-300">
                <div>
                  <span className="font-bold text-red-400 block mb-0.5 text-[10px] uppercase">
                    TECHNICAL_IMPACT:
                  </span>
                  <p className="bg-[#0F172A] p-2 border border-[#1E293B] text-slate-200 font-sans">
                    {item.aiAnalysis.impact}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-emerald-400 block mb-0.5 text-[10px] uppercase">
                    SOC_DIRECTIVE_AND_MITIGATION:
                  </span>
                  <p className="bg-[#0F172A] p-2 border border-[#1E293B] text-slate-200 font-sans">
                    {item.aiAnalysis.recommendation}
                  </p>
                </div>

                {item.aiAnalysis.affectedSystems && item.aiAnalysis.affectedSystems.length > 0 && (
                  <div>
                    <span className="font-bold text-[#64748B] flex items-center gap-1 mb-1 text-[10px] uppercase">
                      <Server className="w-3 h-3 text-[#64748B]" /> AFFECTED_SYSTEMS:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.aiAnalysis.affectedSystems.map((sys) => (
                        <span key={sys} className="px-1.5 py-0.5 bg-[#0F172A] text-slate-300 border border-[#1E293B] text-[10px]">
                          {sys}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-[#64748B] font-sans">
                Genera un análisis con IA para evaluar el impacto técnico, sistemas expuestos y recomendaciones inmediatas de contención.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#0A0C10] border-t border-[#1E293B] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleSelect(item.id)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition ${
                isSelected
                  ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/60'
                  : 'bg-[#1E293B]/60 text-slate-300 border-[#1E293B] hover:bg-[#1E293B]'
              }`}
            >
              {isSelected ? '✓ INCLUDED_IN_PDF' : '+ STAGE_FOR_PDF'}
            </button>

            <button
              type="button"
              onClick={handleCopyRecommendation}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#1E293B]/60 hover:bg-[#1E293B] text-slate-300 border border-[#1E293B] transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
              <span>{copied ? 'COPIED' : 'COPY_INTEL'}</span>
            </button>
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white bg-[#1E293B]/60 hover:bg-[#1E293B] border border-[#1E293B] transition"
          >
            <span>SOURCE_LINK</span>
            <ExternalLink className="w-3 h-3 text-[#64748B]" />
          </a>
        </div>

      </div>
    </div>
  );
}
