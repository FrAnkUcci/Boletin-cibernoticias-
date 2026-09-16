import { useState } from 'react';
import { X, FileDown, ShieldCheck, Check, Settings, Sparkles, Shield, Eye, Languages, HardDrive } from 'lucide-react';
import type { DailyBriefing, NewsItem, PdfExportOptions, PdfTemplateType } from '../types';
import { exportNewsToPdf, formatSpanishDate } from '../utils/pdfExport';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  allNews: NewsItem[];
  selectedIds: Set<string>;
  briefing: DailyBriefing | null;
  onOpenWorkspace?: () => void;
}

export function ExportPdfModal({
  isOpen,
  onClose,
  allNews,
  selectedIds,
  briefing,
  onOpenWorkspace,
}: ExportPdfModalProps) {
  const defaultDateFormatted = formatSpanishDate(briefing?.date || new Date());

  const [templateType, setTemplateType] = useState<PdfTemplateType>('official_osint');
  const [title, setTitle] = useState('NOVEDADES OSINT CIBER');
  const [customDate, setCustomDate] = useState(defaultDateFormatted);
  const [showShield, setShowShield] = useState(true);
  const [spellingRansomware, setSpellingRansomware] = useState<'RAMSOWARE' | 'RANSOMWARE'>('RAMSOWARE');
  const [spellingBoe, setSpellingBoe] = useState<'BOE y BOEU' | 'BOE y DOUE'>('BOE y BOEU');

  const [organization, setOrganization] = useState('Unidad de Coordinación de Ciberseguridad');
  const [classification, setClassification] = useState('TLP:CLEAR / DIFUSIÓN LIMITADA');
  const [includeExecutiveSummary, setIncludeExecutiveSummary] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeActionList, setIncludeActionList] = useState(true);
  const [scope, setScope] = useState<'all' | 'selected' | 'critical'>(
    selectedIds.size > 0 ? 'selected' : 'all'
  );
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'preview'>('settings');

  if (!isOpen) return null;

  // Determine items based on scope
  let itemsToExport: NewsItem[] = [];
  if (scope === 'selected') {
    itemsToExport = allNews.filter((item) => selectedIds.has(item.id));
    if (itemsToExport.length === 0) itemsToExport = allNews;
  } else if (scope === 'critical') {
    itemsToExport = allNews.filter((item) => item.severity === 'CRITICAL' || item.severity === 'HIGH');
    if (itemsToExport.length === 0) itemsToExport = allNews;
  } else {
    itemsToExport = allNews;
  }

  const handleExport = () => {
    setIsExporting(true);
    try {
      const options: PdfExportOptions = {
        title,
        organization,
        classification,
        templateType,
        showGuardiaCivilEmblem: showShield,
        customDate,
        spellingRansomware: `${spellingRansomware}:` as any,
        spellingBoe: `${spellingBoe}:` as any,
        includeExecutiveSummary,
        includeMetrics,
        includeActionList,
        selectedNewsOnly: scope === 'selected',
      };
      exportNewsToPdf(itemsToExport, briefing, options);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-y-auto font-mono select-none">
      <div className="bg-[#0F172A] border border-[#1E293B] w-full max-w-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="p-4 bg-[#0A0C10] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-950/60 border border-emerald-500/40 p-1 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="/assets/escudo_ciber.png"
                alt="Escudo Ciberseguridad"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
                  GENERADOR DE BOLETÍN PDF // NOVEDADES OSINT CIBER
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-950/60 text-red-400 border border-red-500/30">
                  GUARDIA CIVIL
                </span>
              </div>
              <p className="text-[10px] text-[#64748B]">
                Plantilla institucional con escudo oficial, estructura de viñetas y enlaces
              </p>
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

        {/* Tabs: Configuración / Vista Previa */}
        <div className="flex border-b border-[#1E293B] bg-[#0A0C10]/80 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 transition ${
              activeTab === 'settings'
                ? 'text-[#38BDF8] border-b-2 border-[#38BDF8] bg-[#0F172A]'
                : 'text-[#64748B] hover:text-slate-300'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>CONFIGURACIÓN DEL DOCUMENTO</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 transition ${
              activeTab === 'preview'
                ? 'text-[#38BDF8] border-b-2 border-[#38BDF8] bg-[#0F172A]'
                : 'text-[#64748B] hover:text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>VISTA PREVIA DE ESTRUCTURA</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[68vh] overflow-y-auto text-xs">
          
          {activeTab === 'settings' ? (
            <>
              {/* Template Style Selector */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#64748B] mb-1.5">
                  FORMATO_Y_PLANTILLA_DE_INFORME
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateType('official_osint');
                      setTitle('NOVEDADES OSINT CIBER');
                    }}
                    className={`p-3 border text-left rounded-xs transition relative ${
                      templateType === 'official_osint'
                        ? 'bg-emerald-950/20 border-emerald-500/60 text-slate-100 ring-1 ring-emerald-500/30'
                        : 'bg-[#0A0C10] border-[#1E293B] text-[#64748B] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        PLANTILLA OFICIAL GUARDIA CIVIL
                      </span>
                      {templateType === 'official_osint' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300">
                      Formato exacto de muestra: Escudo oficial, título &quot;NOVEDADES OSINT CIBER&quot;, viñetas estructuradas (• y o) y márgenes rojo/verde.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTemplateType('executive_dashboard');
                      setTitle('INFORME DIARIO DE CIBERSEGURIDAD');
                    }}
                    className={`p-3 border text-left rounded-xs transition relative ${
                      templateType === 'executive_dashboard'
                        ? 'bg-cyan-950/20 border-[#38BDF8]/60 text-slate-100 ring-1 ring-[#38BDF8]/30'
                        : 'bg-[#0A0C10] border-[#1E293B] text-[#64748B] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#38BDF8] text-xs flex items-center gap-1.5">
                        <FileDown className="w-3.5 h-3.5" />
                        INFORME EJECUTIVO TABULAR
                      </span>
                      {templateType === 'executive_dashboard' && (
                        <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300">
                      Formato analítico con tabla de métricas CVSS, desglose de severidades y matriz de incidencias para equipos SOC.
                    </p>
                  </button>
                </div>
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#64748B] mb-1">
                    TÍTULO_DEL_INFORME
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0A0C10] border border-[#1E293B] text-slate-100 text-xs focus:border-[#38BDF8] focus:outline-none"
                    placeholder="NOVEDADES OSINT CIBER"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#64748B] mb-1">
                    FECHA_EN_ENCABEZADO
                  </label>
                  <input
                    type="text"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0A0C10] border border-[#1E293B] text-slate-100 text-xs focus:border-[#38BDF8] focus:outline-none"
                    placeholder="miércoles, 25 de febrero de 2026"
                  />
                </div>
              </div>

              {/* Escudo & Section Naming */}
              <div className="p-3 bg-[#0A0C10] border border-[#1E293B] rounded-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200 text-[11px]">
                    <input
                      type="checkbox"
                      checked={showShield}
                      onChange={(e) => setShowShield(e.target.checked)}
                      className="accent-emerald-500 w-4 h-4"
                    />
                    <span className="font-bold flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      Incluir Escudo Oficial Guardia Civil en cada página
                    </span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 border border-emerald-500/30">
                    ALTA_RESOLUCIÓN
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1E293B]/70 text-[10px]">
                  <div>
                    <label className="block text-[#64748B] uppercase font-bold mb-1">
                      Rótulo de Ransomware:
                    </label>
                    <div className="flex gap-2">
                      {(['RAMSOWARE', 'RANSOMWARE'] as const).map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setSpellingRansomware(label)}
                          className={`flex-1 py-1 px-2 border text-center transition ${
                            spellingRansomware === label
                              ? 'bg-purple-950/50 text-purple-300 border-purple-500/60 font-bold'
                              : 'bg-[#0F172A] text-[#64748B] border-[#1E293B]'
                          }`}
                        >
                          {label}:
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#64748B] uppercase font-bold mb-1">
                      Rótulo Normativo:
                    </label>
                    <div className="flex gap-2">
                      {(['BOE y BOEU', 'BOE y DOUE'] as const).map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setSpellingBoe(label)}
                          className={`flex-1 py-1 px-2 border text-center transition ${
                            spellingBoe === label
                              ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/60 font-bold'
                              : 'bg-[#0F172A] text-[#64748B] border-[#1E293B]'
                          }`}
                        >
                          {label}:
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scope Selector */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#64748B] mb-1.5">
                  ALCANCE_DE_NOTICIAS_A_INCLUIR
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2 bg-[#0A0C10] border border-[#1E293B] cursor-pointer hover:border-[#38BDF8]/50">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'all'}
                      onChange={() => setScope('all')}
                      className="accent-[#38BDF8]"
                    />
                    <span className="text-slate-200 text-[11px] font-bold">
                      TODAS LAS NOTICIAS DISPONIBLES ({allNews.length} elementos clasificados)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-[#0A0C10] border border-[#1E293B] cursor-pointer hover:border-[#38BDF8]/50">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'selected'}
                      onChange={() => setScope('selected')}
                      className="accent-[#38BDF8]"
                    />
                    <span className="text-slate-200 text-[11px] font-bold">
                      SÓLO NOTICIAS SELECCIONADAS / ESTACADAS ({selectedIds.size > 0 ? selectedIds.size : '0 seleccionadas'})
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-[#0A0C10] border border-[#1E293B] cursor-pointer hover:border-[#38BDF8]/50">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'critical'}
                      onChange={() => setScope('critical')}
                      className="accent-[#38BDF8]"
                    />
                    <span className="text-red-400 text-[11px] font-bold">
                      INCIDENTES CRÍTICOS Y ALTOS ÚNICAMENTE ({allNews.filter((n) => n.severity === 'CRITICAL' || n.severity === 'HIGH').length})
                    </span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            /* Tab: Visual Structure Preview */
            <div className="space-y-3 bg-white text-slate-900 p-4 rounded-xs border-2 border-slate-300 font-sans shadow-inner relative overflow-hidden">
              {/* Red left bar and Green bottom bar */}
              <div className="absolute left-2 top-2 bottom-4 w-1 bg-[#C41E3A] rounded-full" />
              <div className="absolute left-1 right-2 bottom-2 h-1 bg-[#006837] rounded-full" />

              {/* Header preview */}
              <div className="pl-4 flex items-center justify-between border-b pb-3 border-slate-300">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/escudo_ciber.png"
                    alt="Escudo"
                    className="w-12 h-12 object-contain"
                  />
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900 border-b-2 border-slate-900 inline-block pb-0.5">
                      {title}
                    </h2>
                  </div>
                </div>
                <div className="text-xs text-slate-600 italic">
                  {customDate}
                </div>
              </div>

              {/* Sections structure preview */}
              <div className="pl-4 space-y-2.5 text-xs text-slate-800">
                <div>
                  <h4 className="font-bold text-slate-950 uppercase text-[11px]">EVENTOS:</h4>
                  <p className="text-slate-600 pl-4 text-[10px]">• Hackathon DUAL UNIOVI 2026 en Ciberseguridad</p>
                  <p className="text-slate-500 pl-8 text-[9.5px]">o Fecha: 26 y 27 de febrero, Escuela de Ingeniería Informática</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-950 uppercase text-[11px]">NOTICIAS:</h4>
                  <p className="text-blue-700 underline font-medium pl-4 text-[10px]">
                    • Ciberataques silenciosos revelan debilidades estructurales
                  </p>
                  <p className="text-slate-600 pl-8 text-[9.5px]">
                    o En múltiples casos recientes, dependencias que parecían enfrentar intrusiones...
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-950 uppercase text-[11px]">VULNERABILIDAD:</h4>
                  <p className="text-blue-700 underline font-medium pl-4 text-[10px]">
                    • Múltiples vulnerabilidades en Delta DIAView (CVE-2025-62581)
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-950 uppercase text-[11px]">{spellingRansomware}:</h4>
                  <p className="text-slate-900 font-bold pl-4 text-[10px]">• Empresa Modelo de Servicios S.L.</p>
                  <p className="text-slate-600 pl-8 text-[9.5px]">o Grupo: Qilin</p>
                  <p className="text-slate-600 pl-8 text-[9.5px]">o Fecha: 2026-02-25</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-950 uppercase text-[11px]">FILTRACIONES:</h4>
                  <p className="text-slate-600 pl-4 text-[10px]">• Nada.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-950 uppercase text-[11px]">{spellingBoe}:</h4>
                  <p className="text-slate-700 pl-4 text-[10px]">• Anuncio de licitación: Suministro de servidores para supercomputación...</p>
                  <p className="text-blue-700 underline pl-8 text-[9.5px]">o BOE-B-2026-5739</p>
                </div>
              </div>
            </div>
          )}

          {/* Export Payload Telemetry */}
          <div className="p-2.5 bg-[#0A0C10] border border-[#1E293B] flex items-center justify-between text-xs flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-[#64748B] uppercase font-bold text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              TOTAL_ELEMENTOS_DOCUMENTO:
            </span>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                <Languages className="w-2.5 h-2.5" />
                TRADUCCIÓN ES: ACTIVA
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-950/40 text-blue-300 border border-blue-500/30 font-bold">
                JUSTIFICACIÓN: TOTAL (AMBOS LADOS)
              </span>
              <span className="font-bold text-emerald-400 font-mono text-[11px]">
                {itemsToExport.length} ARTÍCULOS
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#0A0C10] border-t border-[#1E293B] flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] text-[#64748B]">
            Formato: <strong className="text-slate-300">PDF Vectorial A4 con justificación completa</strong> y escudo
          </span>

          <div className="flex items-center gap-2">
            {onOpenWorkspace && (
              <button
                id="btn-open-drive-from-export-modal"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWorkspace();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase text-amber-400 hover:text-white border border-amber-500/40 hover:bg-amber-950/40 transition rounded-xs"
                title="Subir informe PDF directamente a tu almacenamiento personal de Google Drive"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>SUBIR A DRIVE</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold uppercase text-[#64748B] hover:text-white border border-[#1E293B] hover:bg-[#1E293B] transition"
            >
              CANCELAR
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || itemsToExport.length === 0}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 shadow-md shadow-emerald-950/50"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExporting ? 'COMPILANDO_PDF...' : 'DESCARGAR INFORME PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
