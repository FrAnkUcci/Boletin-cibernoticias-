import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Radio,
  Globe,
  Database,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  Check
} from 'lucide-react';
import type { IntelligenceSource, NewsCategory } from '../types';
import { CATEGORY_DEFINITIONS, CATEGORY_MAP } from '../types';

interface SourcesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourcesUpdated?: () => void;
}

// Curated catalog of high-value cybersecurity feeds for quick 1-click addition
const SUGGESTED_FEEDS: {
  name: string;
  url: string;
  category: NewsCategory;
  description: string;
  provider: string;
}[] = [
  {
    name: 'Hispasec - Una-al-Día',
    url: 'https://unaaldia.hispasec.com/feed',
    category: 'Eventos España',
    description: 'El boletín decano diario de ciberseguridad en español con análisis técnicos detallados (Málaga, España).',
    provider: 'Hispasec Sistemas (España)',
  },
  {
    name: 'INCIBE Ciudadanía y Familias',
    url: 'https://www.incibe.es/rss/avisos-seguridad/feed',
    category: 'Eventos España',
    description: 'Avisos preventivos contra ingeniería social, fraudes bancarios y smishing en España.',
    provider: 'INCIBE España',
  },
  {
    name: 'Dark Reading',
    url: 'https://www.darkreading.com/rss.xml',
    category: 'Noticias Relevantes',
    description: 'Publicación de referencia técnica sobre tácticas de defensa, análisis de amenazas y gestión de riesgos.',
    provider: 'Informa Tech',
  },
  {
    name: 'Microsoft Security Blog',
    url: 'https://www.microsoft.com/en-us/security/blog/feed/',
    category: 'Noticias Relevantes',
    description: 'Informes de Microsoft Threat Intelligence (MSTIC) sobre actores patrocinados por estados nación.',
    provider: 'Microsoft Security',
  },
  {
    name: 'Security Affairs (Pierluigi Paganini)',
    url: 'https://securityaffairs.com/feed',
    category: 'Noticias Relevantes',
    description: 'Cobertura especializada en espionaje cibernético internacional, hacktivismo y ciberguerra.',
    provider: 'Security Affairs',
  },
  {
    name: 'SANS Internet Storm Center',
    url: 'https://isc.sans.edu/rssfeed.xml',
    category: 'Vulnerabilidades',
    description: 'Diario técnico de amenazas, análisis de exploits Zero-Day y actividad maliciosa de red.',
    provider: 'SANS Institute',
  },
  {
    name: 'BleepingComputer News',
    url: 'https://www.bleepingcomputer.com/feed/',
    category: 'Ransomware',
    description: 'Alertas en tiempo real sobre campañas de ransomware activas, filtraciones y parches críticos.',
    provider: 'BleepingComputer',
  },
  {
    name: 'Cisco Talos Threat Intelligence',
    url: 'https://blog.talosintelligence.com/rss/',
    category: 'Ransomware',
    description: 'Inteligencia de malware, familias de ransomware y vectores de infección globales.',
    provider: 'Cisco Talos',
  },
  {
    name: 'CERT-EU Security News & Advisories',
    url: 'https://cert.europa.eu/feed/rss.xml',
    category: 'BOE y DOUE Normativa',
    description: 'Avisos oficiales y normativas del equipo de respuesta a emergencias de la Unión Europea.',
    provider: 'Unión Europea (CERT-EU)',
  },
  {
    name: 'Google Cloud Threat Intelligence',
    url: 'https://cloud.google.com/feeds/threat-intelligence.xml',
    category: 'Noticias Relevantes',
    description: 'Informes de amenazas de Google TAG y Mandiant sobre campañas de cibercrimen y APT.',
    provider: 'Google Mandiant',
  },
];

export function SourcesManagerModal({
  isOpen,
  onClose,
  onSourcesUpdated,
}: SourcesManagerModalProps) {
  const [sources, setSources] = useState<IntelligenceSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'catalog'>('list');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Form State for Adding Custom Feed
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<NewsCategory>('Noticias Relevantes');
  const [description, setDescription] = useState('');

  // Testing Feed State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    itemCount: number;
    message: string;
    sampleTitles?: string[];
  } | null>(null);

  // Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load sources from backend
  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sources');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error('Error cargando fuentes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSources();
      setFeedbackMessage(null);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Test feed without submitting
  const handleTestFeed = async (testUrl?: string, testCat?: NewsCategory) => {
    const targetUrl = testUrl || url;
    const targetCat = testCat || category;

    if (!targetUrl.trim()) {
      setTestResult({
        success: false,
        itemCount: 0,
        message: 'Por favor introduce una URL para comprobar.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim(), category: targetCat }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        itemCount: data.itemCount || 0,
        message: data.message || (data.success ? 'Feed verificado con éxito' : 'No se pudo conectar al feed'),
        sampleTitles: data.sampleTitles || [],
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        itemCount: 0,
        message: `Error al probar: ${err.message || 'Fallo de red'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Submit custom feed
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setFeedbackMessage({
        type: 'error',
        text: 'Por favor completa el nombre de la fuente y la URL del feed.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          category,
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la fuente');
      }

      setFeedbackMessage({
        type: 'success',
        text: data.message || `Fuente "${name}" añadida y activada con éxito.`,
      });

      // Clear form
      setName('');
      setUrl('');
      setDescription('');
      setTestResult(null);

      // Refresh sources list
      await fetchSources();
      if (onSourcesUpdated) onSourcesUpdated();

      // Switch to list tab after short delay
      setTimeout(() => {
        setActiveTab('list');
      }, 1200);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Error al procesar la solicitud.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add from suggested catalog
  const handleAddFromCatalog = async (item: typeof SUGGESTED_FEEDS[0]) => {
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          url: item.url,
          category: item.category,
          description: item.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al añadir fuente');

      setFeedbackMessage({
        type: 'success',
        text: `Fuente "${item.name}" integrada exitosamente en "${item.category}".`,
      });

      await fetchSources();
      if (onSourcesUpdated) onSourcesUpdated();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'No se pudo añadir la fuente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete custom source
  const handleDeleteSource = async (id: string, sourceName: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la fuente personalizada "${sourceName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedbackMessage({
          type: 'success',
          text: `Fuente "${sourceName}" eliminada correctamente.`,
        });
        await fetchSources();
        if (onSourcesUpdated) onSourcesUpdated();
      } else {
        const data = await res.json();
        alert(data.error || 'No se pudo eliminar la fuente');
      }
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  // Toggle active/inactive
  const handleToggleSource = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/sources/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        setSources((prev) =>
          prev.map((s) => (s.id === id ? { ...s, enabled: !currentEnabled } : s))
        );
        if (onSourcesUpdated) onSourcesUpdated();
      }
    } catch (err) {
      console.error('Error cambiando estado de la fuente:', err);
    }
  };

  const filteredSources = sources.filter((s) => {
    if (selectedCategoryFilter === 'all') return true;
    if (selectedCategoryFilter === 'custom') return s.isCustom;
    if (selectedCategoryFilter === 'system') return !s.isCustom;
    return s.category === selectedCategoryFilter;
  });

  const totalSources = sources.length;
  const customCount = sources.filter((s) => s.isCustom).length;
  const activeCount = sources.filter((s) => s.enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0F172A] border border-[#1E293B] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="p-4 bg-[#0A0C10] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded">
              <Radio className="w-5 h-5 text-[#38BDF8] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wider">
                  FUENTES Y CANALES DE INTELIGENCIA
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                  {activeCount} ACTIVAS
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                Gestión de feeds RSS oficiales y canales de extracción personalizados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSources}
              disabled={isLoading}
              className="p-2 rounded bg-[#1E293B]/50 hover:bg-[#1E293B] text-[#94A3B8] hover:text-white transition disabled:opacity-50"
              title="Actualizar estado de fuentes"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#38BDF8]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded bg-[#1E293B]/50 hover:bg-red-950/50 hover:text-red-400 text-[#94A3B8] transition"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#0A0C10]/60 border-b border-[#1E293B] text-xs">
          <div className="p-2.5 bg-[#0F172A] border border-[#1E293B] rounded flex items-center justify-between">
            <span className="text-[#64748B] text-[11px]">TOTAL_FUENTES</span>
            <span className="font-bold text-white font-mono text-sm">{totalSources}</span>
          </div>
          <div className="p-2.5 bg-[#0F172A] border border-[#1E293B] rounded flex items-center justify-between">
            <span className="text-[#64748B] text-[11px]">SISTEMA_OFICIAL</span>
            <span className="font-bold text-[#38BDF8] font-mono text-sm">
              {totalSources - customCount}
            </span>
          </div>
          <div className="p-2.5 bg-[#0F172A] border border-[#1E293B] rounded flex items-center justify-between">
            <span className="text-[#64748B] text-[11px]">PERSONALIZADAS</span>
            <span className="font-bold text-amber-400 font-mono text-sm">{customCount}</span>
          </div>
          <div className="p-2.5 bg-[#0F172A] border border-[#1E293B] rounded flex items-center justify-between">
            <span className="text-[#64748B] text-[11px]">ESTADO_RED</span>
            <span className="font-bold text-emerald-400 font-mono text-[11px] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              CONECTADO
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1E293B] bg-[#0A0C10] px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 px-3 font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
              activeTab === 'list'
                ? 'border-[#38BDF8] text-[#38BDF8]'
                : 'border-transparent text-[#64748B] hover:text-[#CBD5E1]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Fuentes Registradas ({totalSources})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`pb-2.5 px-3 font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
              activeTab === 'add'
                ? 'border-[#38BDF8] text-[#38BDF8]'
                : 'border-transparent text-[#64748B] hover:text-[#CBD5E1]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cargar Nueva Fuente RSS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`pb-2.5 px-3 font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
              activeTab === 'catalog'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-[#64748B] hover:text-[#CBD5E1]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Catálogo Sugerido (1-Clic)</span>
          </button>
        </div>

        {/* Notification / Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`mx-4 mt-3 p-3 rounded border text-xs flex items-center justify-between ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* TAB 1: LIST OF REGISTERED SOURCES */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Filter by category pill list */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-[#38BDF8] text-[#0F172A] font-bold'
                      : 'bg-[#1E293B]/40 text-[#94A3B8] hover:bg-[#1E293B]'
                  }`}
                >
                  TODAS ({sources.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('custom')}
                  className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition ${
                    selectedCategoryFilter === 'custom'
                      ? 'bg-amber-400 text-[#0F172A] font-bold'
                      : 'bg-[#1E293B]/40 text-[#94A3B8] hover:bg-[#1E293B]'
                  }`}
                >
                  PERSONALIZADAS ({customCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('system')}
                  className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition ${
                    selectedCategoryFilter === 'system'
                      ? 'bg-[#1E293B] text-white font-bold border border-[#38BDF8]/40'
                      : 'bg-[#1E293B]/40 text-[#94A3B8] hover:bg-[#1E293B]'
                  }`}
                >
                  OFICIALES SISTEMA ({totalSources - customCount})
                </button>

                {CATEGORY_DEFINITIONS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition ${
                      selectedCategoryFilter === cat.id
                        ? `${cat.accentBg} ${cat.accentText} border ${cat.borderColor} font-bold`
                        : 'bg-[#1E293B]/40 text-[#94A3B8] hover:bg-[#1E293B]'
                    }`}
                  >
                    [{cat.code}] {cat.shortLabel}
                  </button>
                ))}
              </div>

              {/* Source Cards Grid */}
              <div className="space-y-2.5">
                {filteredSources.map((src) => {
                  const catMeta = CATEGORY_MAP[src.category];
                  return (
                    <div
                      key={src.id}
                      className={`p-3.5 bg-[#0A0C10] border rounded transition ${
                        src.enabled
                          ? 'border-[#1E293B] hover:border-[#38BDF8]/40'
                          : 'border-[#1E293B]/40 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                src.status === 'ONLINE'
                                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                                  : src.status === 'STANDBY'
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                              }`}
                            />
                            <h3 className="font-bold text-sm text-white truncate">{src.name}</h3>

                            {src.isCustom ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-500/40 font-bold">
                                PERSONALIZADA
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] border border-[#334155]">
                                OFICIAL SISTEMA
                              </span>
                            )}

                            {catMeta && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded border font-mono ${catMeta.tagColor}`}
                              >
                                [{catMeta.code}] {catMeta.shortLabel}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-[#64748B]">
                            <Globe className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-[#38BDF8] underline truncate"
                              title={src.url}
                            >
                              {src.url}
                            </a>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </div>

                          {src.description && (
                            <p className="text-xs text-[#94A3B8] line-clamp-1">{src.description}</p>
                          )}
                        </div>

                        {/* Action Buttons & Status */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {/* Items count badge */}
                          <div className="px-2.5 py-1 rounded bg-[#0F172A] border border-[#1E293B] text-[11px] font-mono text-[#94A3B8]">
                            <span className="text-[#38BDF8] font-bold">{src.itemCount ?? 0}</span> items
                          </div>

                          {/* Test Button */}
                          <button
                            type="button"
                            onClick={() => handleTestFeed(src.url, src.category)}
                            disabled={isTesting}
                            className="px-2.5 py-1 text-[11px] bg-[#1E293B]/60 hover:bg-[#1E293B] text-[#E2E8F0] rounded border border-[#1E293B] transition"
                            title="Probar conectividad de este feed"
                          >
                            Probar
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleSource(src.id, src.enabled)}
                            className={`px-2.5 py-1 text-[11px] rounded font-bold transition ${
                              src.enabled
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-950/70'
                                : 'bg-[#1E293B] text-[#64748B] border border-[#334155] hover:text-white'
                            }`}
                          >
                            {src.enabled ? 'ACTIVA' : 'PAUSADA'}
                          </button>

                          {/* Delete Button (Only for custom sources) */}
                          {src.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSource(src.id, src.name)}
                              className="p-1.5 rounded bg-red-950/40 text-red-400 hover:bg-red-950/80 border border-red-500/30 transition"
                              title="Eliminar fuente personalizada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredSources.length === 0 && (
                  <div className="py-12 text-center text-[#64748B] space-y-2">
                    <p className="text-sm">No se encontraron fuentes en esta categoría.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('add')}
                      className="text-xs text-[#38BDF8] underline font-bold"
                    >
                      Añade una nueva fuente RSS personalizada aquí
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADD CUSTOM FEED FORM */}
          {activeTab === 'add' && (
            <div className="max-w-2xl mx-auto py-2">
              <div className="p-5 bg-[#0A0C10] border border-[#1E293B] rounded space-y-5">
                <div className="border-b border-[#1E293B] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#38BDF8]" />
                    REGISTRAR NUEVA FUENTE PERSONALIZADA (RSS / ATOM)
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1">
                    Introduce cualquier canal RSS, XML o Atom de ciberseguridad. El servidor validará la estructura y extraerá las noticias hacia la categoría designada.
                  </p>
                </div>

                <form onSubmit={handleAddSource} className="space-y-4 text-xs">
                  {/* Source Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[#94A3B8] font-bold uppercase tracking-wider">
                      Nombre de la Fuente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: SANS Internet Storm Center, Hispasec Una-al-Día..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0F172A] border border-[#1E293B] text-white rounded focus:border-[#38BDF8] focus:outline-none"
                    />
                  </div>

                  {/* Feed URL */}
                  <div className="space-y-1.5">
                    <label className="block text-[#94A3B8] font-bold uppercase tracking-wider">
                      URL del Feed RSS / XML / Atom *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        placeholder="https://ejemplo.com/feed.xml"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#0F172A] border border-[#1E293B] text-white rounded focus:border-[#38BDF8] focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestFeed()}
                        disabled={isTesting || !url.trim()}
                        className="px-3 py-2 bg-[#1E293B] hover:bg-[#334155] text-white rounded font-bold transition disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {isTesting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#38BDF8]" />
                        ) : (
                          <Radio className="w-3.5 h-3.5 text-[#38BDF8]" />
                        )}
                        <span>Verificar Feed</span>
                      </button>
                    </div>
                  </div>

                  {/* Test Result Preview */}
                  {testResult && (
                    <div
                      className={`p-3 rounded border text-xs space-y-2 ${
                        testResult.success
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-950/30 border-red-500/40 text-red-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold">
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        )}
                        <span>{testResult.message}</span>
                      </div>

                      {testResult.sampleTitles && testResult.sampleTitles.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-emerald-500/20 text-[11px]">
                          <span className="text-emerald-400 font-bold uppercase">Muestra de titulares extraídos:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                            {testResult.sampleTitles.map((t, idx) => (
                              <li key={idx} className="truncate">{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Category Assignment */}
                  <div className="space-y-1.5">
                    <label className="block text-[#94A3B8] font-bold uppercase tracking-wider">
                      Categoría de Inteligencia Asignada *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CATEGORY_DEFINITIONS.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-2.5 text-left border rounded transition flex items-center justify-between ${
                            category === cat.id
                              ? `${cat.accentBg} ${cat.accentText} border ${cat.borderColor} font-bold`
                              : 'bg-[#0F172A] border-[#1E293B] text-[#94A3B8] hover:bg-[#1E293B]'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">[{cat.code}] {cat.shortLabel}</div>
                            <div className="text-[10px] opacity-75 truncate max-w-[200px]">
                              {cat.fullTitle}
                            </div>
                          </div>
                          {category === cat.id && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="block text-[#94A3B8] font-bold uppercase tracking-wider">
                      Descripción o Notas (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Análisis forense y malware de fuentes comunitarias"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0F172A] border border-[#1E293B] text-white rounded focus:border-[#38BDF8] focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-[#1E293B] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setName('');
                        setUrl('');
                        setDescription('');
                        setTestResult(null);
                        setActiveTab('list');
                      }}
                      className="px-4 py-2 bg-[#1E293B]/60 hover:bg-[#1E293B] text-[#94A3B8] rounded font-bold transition"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || !name.trim() || !url.trim()}
                      className="px-5 py-2 bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0F172A] font-bold rounded flex items-center gap-2 transition disabled:opacity-50 shadow-md shadow-[#38BDF8]/20"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Guardando y Extrayendo...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Guardar y Extraer Noticias</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: SUGGESTED CATALOG (1-CLICK ADD) */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0A0C10] border border-[#1E293B] rounded flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    CATÁLOGO DE FEEDS RECOMENDADOS POR ANALISTAS SOC
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Pulsa "Añadir al Sistema" para incorporar feeds de alta reputación verificados.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUGGESTED_FEEDS.map((item, idx) => {
                  const alreadyExists = sources.some(
                    (s) => s.url.toLowerCase() === item.url.toLowerCase()
                  );
                  const catMeta = CATEGORY_MAP[item.category];

                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#0A0C10] border border-[#1E293B] rounded hover:border-[#38BDF8]/40 transition flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-white">{item.name}</h4>
                          {catMeta && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded border font-mono ${catMeta.tagColor}`}
                            >
                              {catMeta.shortLabel}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#94A3B8]">{item.description}</p>
                        <div className="text-[10px] text-[#64748B] flex items-center gap-1 font-mono">
                          <Globe className="w-3 h-3 text-[#38BDF8]" />
                          <span className="truncate">{item.url}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.provider}
                        </span>

                        {alreadyExists ? (
                          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ya instalada
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddFromCatalog(item)}
                            disabled={isSubmitting}
                            className="px-3 py-1 bg-[#38BDF8]/15 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#0F172A] border border-[#38BDF8]/40 rounded text-[11px] font-bold flex items-center gap-1.5 transition"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Añadir al Sistema</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0A0C10] border-t border-[#1E293B] flex items-center justify-between text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#38BDF8]" />
            <span>EXTRACCIÓN RSS MULTIDIRECCIONAL ACTIVA</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-white rounded font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
