export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type NewsCategory = 
  | 'Eventos España'
  | 'Noticias Relevantes'
  | 'Vulnerabilidades'
  | 'Ransomware'
  | 'BOE y DOUE Normativa';

export interface CategoryMetadata {
  id: NewsCategory;
  number: string;
  code: string;
  shortLabel: string;
  fullTitle: string;
  description: string;
  sourceScope: string;
  tagColor: string;
  borderColor: string;
  accentHex: string;
  accentBg: string;
  accentText: string;
}

export const CATEGORY_DEFINITIONS: CategoryMetadata[] = [
  {
    id: 'Eventos España',
    number: '01',
    code: '01',
    shortLabel: 'EVENTOS_ESPAÑA',
    fullTitle: 'Eventos de Ciberseguridad en España',
    description: 'Avisos oficiales, congresos y cibereventos nacionales (INCIBE-CERT, CCN-CERT, STIC, ENISE, C1b3rWall, RootedCON).',
    sourceScope: 'INCIBE, CCN-CERT, CyberCamp, STIC, ENISE, Guardia Civil, CNPIC',
    tagColor: 'text-amber-400 bg-amber-950/40 border-amber-500/50',
    borderColor: 'border-amber-500/40',
    accentHex: '#F59E0B',
    accentBg: 'bg-amber-500/10',
    accentText: 'text-amber-400',
  },
  {
    id: 'Noticias Relevantes',
    number: '02',
    code: '02',
    shortLabel: 'NOTICIAS_RELEVANTES',
    fullTitle: 'Noticias de Ciberseguridad Relevantes',
    description: 'Inteligencia de amenazas global, ciberespionaje y actualidad técnica (BleepingComputer, The Hacker News, Dark Reading, SecurityWeek).',
    sourceScope: 'BleepingComputer, The Hacker News, Dark Reading, SecurityWeek, KrebsOnSecurity',
    tagColor: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/50',
    borderColor: 'border-cyan-500/40',
    accentHex: '#06B6D4',
    accentBg: 'bg-cyan-500/10',
    accentText: 'text-cyan-400',
  },
  {
    id: 'Vulnerabilidades',
    number: '03',
    code: '03',
    shortLabel: 'VULNERABILIDADES',
    fullTitle: 'Vulnerabilidades Relevantes',
    description: 'Explotaciones activas Zero-Day, catálogo CISA KEV, fallos RCE críticos y actualizaciones urgentes de fabricantes.',
    sourceScope: 'CISA KEV, NVD, INCIBE-CERT, Zero Day Initiative, NIST',
    tagColor: 'text-red-400 bg-red-950/40 border-red-500/50',
    borderColor: 'border-red-500/40',
    accentHex: '#EF4444',
    accentBg: 'bg-red-500/10',
    accentText: 'text-red-400',
  },
  {
    id: 'Ransomware',
    number: '04',
    code: '04',
    shortLabel: 'RANSOMWARE',
    fullTitle: 'Ransomware y Ciberextorsión',
    description: 'Campañas de cifrado masivo, actividad de bandas de extorsión (LockBit, Akira, BlackCat, Qilin), exfiltración y DLS.',
    sourceScope: 'Ransomware Threat Trackers, BleepingComputer, CISA Alerts, DFIR Reports',
    tagColor: 'text-purple-400 bg-purple-950/40 border-purple-500/50',
    borderColor: 'border-purple-500/40',
    accentHex: '#A855F7',
    accentBg: 'bg-purple-500/10',
    accentText: 'text-purple-400',
  },
  {
    id: 'BOE y DOUE Normativa',
    number: '05',
    code: '05',
    shortLabel: 'BOE_Y_DOUE_NORMATIVA',
    fullTitle: 'BOE y DOUE: Legislación y Normativa',
    description: 'Publicaciones oficiales sobre Ciberseguridad, Inteligencia Artificial y Transformación Digital (NIS2, DORA, EU AI Act, ENS, SEDIA, AESIA).',
    sourceScope: 'BOE (Boletín Oficial del Estado), DOUE (Diario Oficial UE / EUR-Lex)',
    tagColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/50',
    borderColor: 'border-emerald-500/40',
    accentHex: '#10B981',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-400',
  },
];

export const CATEGORY_MAP: Record<NewsCategory, CategoryMetadata> = CATEGORY_DEFINITIONS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<NewsCategory, CategoryMetadata>
);

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url: string;
  source: string;
  publishedAt: string;
  category: NewsCategory;
  severity: Severity;
  cves: string[];
  threatActors?: string[];
  tags: string[];
  originalTitle?: string;
  originalSummary?: string;
  originalLanguage?: 'en' | 'es';
  translated?: boolean;
  aiAnalysis?: {
    impact: string;
    recommendation: string;
    affectedSystems?: string[];
  };
}

export interface DailyBriefing {
  date: string;
  alertLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'NORMAL';
  headline: string;
  summary: string;
  topThreats: {
    title: string;
    severity: Severity;
    description: string;
  }[];
  keyActions: string[];
  cveWatchlist: string[];
  generatedAt: string;
}

export type ViewMode = 'sections' | 'columns' | 'grid' | 'table';

export interface IntelligenceSource {
  id: string;
  name: string;
  url: string;
  category: NewsCategory;
  isCustom: boolean;
  enabled: boolean;
  status: 'ONLINE' | 'STANDBY' | 'ERROR';
  lastChecked?: string;
  itemCount?: number;
  description?: string;
  errorMessage?: string;
}

export interface NewsFilterState {
  search: string;
  category: string;
  severity: string;
  source: string;
  onlySelected: boolean;
}

export type PdfTemplateType = 'official_osint' | 'executive_dashboard';

export interface PdfExportOptions {
  title: string;
  organization: string;
  classification: string;
  templateType?: PdfTemplateType;
  showGuardiaCivilEmblem?: boolean;
  customDate?: string;
  spellingRansomware?: 'RAMSOWARE' | 'RANSOMWARE';
  spellingBoe?: 'BOE y BOEU' | 'BOE y DOUE';
  includeExecutiveSummary: boolean;
  includeMetrics: boolean;
  includeActionList: boolean;
  selectedNewsOnly: boolean;
}
