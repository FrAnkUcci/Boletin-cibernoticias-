import fs from 'fs';
import path from 'path';
import type { IntelligenceSource, NewsCategory } from '../src/types';
import { fetchFeedFromUrl, parseRssXml } from './rssParser';

const CUSTOM_SOURCES_FILE = path.join(process.cwd(), 'custom_sources.json');

// Official system sources covering the 5 security intelligence categories
export const SYSTEM_SOURCES: IntelligenceSource[] = [
  // 01. Eventos de ciberseguridad en España
  {
    id: 'sys-incibe-avisos',
    name: 'INCIBE-CERT Avisos y Alertas',
    url: 'https://www.incibe.es/incibe-cert/alerta-temprana/avisos/feed',
    category: 'Eventos España',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Canal oficial de alertas tempranas y avisos de seguridad de INCIBE-CERT para España.',
  },
  {
    id: 'sys-ccn-cert',
    name: 'CCN-CERT Avisos Oficiales',
    url: 'https://www.ccn-cert.cni.es/comunicacion-eventos.feed?type=rss',
    category: 'Eventos España',
    isCustom: false,
    enabled: true,
    status: 'STANDBY',
    description: 'Centro Criptológico Nacional (CNI) - Avisos, jornadas STIC y ciberdefensa nacional.',
  },
  {
    id: 'sys-hispasec',
    name: 'Hispasec - Una-al-Día',
    url: 'https://unaaldia.hispasec.com/feed',
    category: 'Eventos España',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Boletín diario decano de ciberseguridad en español (Hispasec Sistemas, Málaga) con análisis técnico de incidentes.',
  },
  {
    id: 'sys-incibe-ciudadania',
    name: 'INCIBE Ciudadanía y Familias',
    url: 'https://www.incibe.es/rss/avisos-seguridad/feed',
    category: 'Eventos España',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Avisos preventivos contra ingeniería social, fraudes bancarios y smishing en España.',
  },

  // 02. Noticias de ciberseguridad relevantes
  {
    id: 'sys-thehackernews',
    name: 'The Hacker News',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    category: 'Noticias Relevantes',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Publicación internacional líder en ciberataques, espionaje APT y brechas de seguridad.',
  },
  {
    id: 'sys-securityweek',
    name: 'SecurityWeek Feed',
    url: 'https://www.securityweek.com/feed/',
    category: 'Noticias Relevantes',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Noticias globales de seguridad corporativa, malware industrial y operaciones de amenaza.',
  },
  {
    id: 'sys-krebsonsecurity',
    name: 'Krebs on Security',
    url: 'https://krebsonsecurity.com/feed/',
    category: 'Noticias Relevantes',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Investigación profunda de cibercrimen, ciberdelincuencia organizada y brechas de datos por Brian Krebs.',
  },
  {
    id: 'sys-microsoft-security',
    name: 'Microsoft Security Blog',
    url: 'https://www.microsoft.com/en-us/security/blog/feed/',
    category: 'Noticias Relevantes',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Informes de Microsoft Threat Intelligence (MSTIC) sobre actores patrocinados por estados nación y ataques cloud.',
  },
  {
    id: 'sys-securityaffairs',
    name: 'Security Affairs (Pierluigi Paganini)',
    url: 'https://securityaffairs.com/feed',
    category: 'Noticias Relevantes',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Cobertura especializada en espionaje cibernético internacional, hacktivismo y ciberguerra.',
  },
  {
    id: 'sys-darkreading',
    name: 'Dark Reading',
    url: 'https://www.darkreading.com/rss.xml',
    category: 'Noticias Relevantes',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Publicación de referencia técnica sobre tácticas de defensa, análisis de amenazas y gestión de riesgos.',
  },

  // 03. Vulnerabilidades relevantes
  {
    id: 'sys-cisa-advisories',
    name: 'CISA Cybersecurity Advisories & KEV',
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    category: 'Vulnerabilidades',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Alertas oficiales de CISA y catálogo de vulnerabilidades explotadas activamente (Known Exploited Vulnerabilities).',
  },
  {
    id: 'sys-incibe-vulnerabilidades',
    name: 'INCIBE-CERT Vulnerabilidades',
    url: 'https://www.incibe.es/incibe-cert/alerta-temprana/vulnerabilidades/feed',
    category: 'Vulnerabilidades',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Boletín de vulnerabilidades críticas y parches del centro de respuesta a incidentes español.',
  },
  {
    id: 'sys-sans-isc',
    name: 'SANS Internet Storm Center',
    url: 'https://isc.sans.edu/rssfeed.xml',
    category: 'Vulnerabilidades',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Diario técnico de amenazas, análisis de exploits Zero-Day y actividad maliciosa de red.',
  },

  // 04. Ransomware y ciberextorsión
  {
    id: 'sys-bleepingcomputer',
    name: 'BleepingComputer News',
    url: 'https://www.bleepingcomputer.com/feed/',
    category: 'Ransomware',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Alertas en tiempo real sobre campañas de ransomware activas, portales de extorsión y parches críticos.',
  },
  {
    id: 'sys-unit42-ransomware',
    name: 'Palo Alto Unit 42 Threat Intel',
    url: 'https://unit42.paloaltonetworks.com/feed/',
    category: 'Ransomware',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Inteligencia de grupos de ransomware, campañas de extorsión e ingeniería inversa de malware.',
  },
  {
    id: 'sys-cisco-talos',
    name: 'Cisco Talos Threat Intelligence',
    url: 'https://blog.talosintelligence.com/rss/',
    category: 'Ransomware',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Inteligencia de malware, familias de ransomware y vectores de infección globales.',
  },
  {
    id: 'sys-welivesecurity',
    name: 'ESET WeLiveSecurity',
    url: 'https://feeds.feedburner.com/eset/blog',
    category: 'Ransomware',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Investigaciones de laboratorios ESET sobre troyanos bancarios, ransomware y malware sofisticado.',
  },

  // 05. BOE y DOUE sobre Legislación y Normativa
  {
    id: 'sys-boe-general',
    name: 'BOE - Boletín Oficial del Estado (Sec. 1)',
    url: 'https://www.boe.es/rss/canal.php?c=sec1',
    category: 'BOE y DOUE Normativa',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Disposiciones generales, Reales Decretos y leyes de Ciberseguridad, IA y ENS en España.',
  },
  {
    id: 'sys-eurlex-doue',
    name: 'DOUE / EUR-Lex Normativa Digital UE',
    url: 'https://eur-lex.europa.eu/EN/display-feed.html?rssId=346',
    category: 'BOE y DOUE Normativa',
    isCustom: false,
    enabled: true,
    status: 'ONLINE',
    description: 'Diario Oficial de la Unión Europea: Directiva NIS2, Reglamento DORA y Ley de Inteligencia Artificial (AI Act).',
  },
  {
    id: 'sys-cert-eu',
    name: 'CERT-EU Security News & Advisories',
    url: 'https://cert.europa.eu/feed/rss.xml',
    category: 'BOE y DOUE Normativa',
    isCustom: false,
    enabled: true,
    status: 'STANDBY',
    description: 'Avisos oficiales y normativas del equipo de respuesta a emergencias de la Unión Europea.',
  },
];

// Read custom sources from disk
export function loadCustomSources(): IntelligenceSource[] {
  try {
    if (fs.existsSync(CUSTOM_SOURCES_FILE)) {
      const data = fs.readFileSync(CUSTOM_SOURCES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[SourcesManager] Warning reading custom_sources.json:', error);
  }
  return [];
}

// Save custom sources to disk
export function saveCustomSources(sources: IntelligenceSource[]): boolean {
  try {
    fs.writeFileSync(CUSTOM_SOURCES_FILE, JSON.stringify(sources, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[SourcesManager] Error saving custom_sources.json:', error);
    return false;
  }
}

// Get all sources combined
export function getAllSources(): IntelligenceSource[] {
  const custom = loadCustomSources();
  return [...SYSTEM_SOURCES, ...custom];
}

// Add a new custom source
export async function addCustomSource(params: {
  name: string;
  url: string;
  category: NewsCategory;
  description?: string;
}): Promise<{ source: IntelligenceSource; testResult: { success: boolean; itemCount: number; message: string } }> {
  const url = params.url.trim();
  const name = params.name.trim();

  if (!url || !name) {
    throw new Error('El nombre y la URL del feed son obligatorios');
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error('La URL del feed no tiene un formato válido (debe incluir http:// o https://)');
  }

  // Check if URL already exists
  const existing = getAllSources();
  if (existing.some((s) => s.url.toLowerCase() === url.toLowerCase())) {
    throw new Error('Esta URL de feed ya se encuentra registrada en las fuentes del sistema');
  }

  // Perform live validation of the feed
  let testSuccess = false;
  let itemsFound = 0;
  let status: 'ONLINE' | 'STANDBY' | 'ERROR' = 'ONLINE';
  let message = '';

  try {
    const items = await fetchFeedFromUrl(url, name, params.category);
    itemsFound = items.length;
    if (itemsFound > 0) {
      testSuccess = true;
      status = 'ONLINE';
      message = `Feed validado correctamente. Se han extraído ${itemsFound} artículos de noticias.`;
    } else {
      testSuccess = true;
      status = 'STANDBY';
      message = 'El feed respondió satisfactoriamente (canal en espera de nuevas publicaciones).';
    }
  } catch (err: any) {
    status = 'ERROR';
    message = `Aviso al conectar: ${err.message || 'No se pudo verificar el feed, pero se guardará para reintentar'}.`;
  }

  const newSource: IntelligenceSource = {
    id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    url,
    category: params.category,
    isCustom: true,
    enabled: true,
    status,
    description: params.description?.trim() || `Fuente RSS personalizada para ${params.category}`,
    lastChecked: new Date().toISOString(),
    itemCount: itemsFound,
  };

  const customList = loadCustomSources();
  customList.push(newSource);
  saveCustomSources(customList);

  return {
    source: newSource,
    testResult: {
      success: testSuccess,
      itemCount: itemsFound,
      message,
    },
  };
}

// Delete custom source
export function deleteCustomSource(id: string): boolean {
  const customList = loadCustomSources();
  const filtered = customList.filter((s) => s.id !== id);
  if (filtered.length !== customList.length) {
    saveCustomSources(filtered);
    return true;
  }
  return false;
}

// Toggle enabled status
export function toggleSource(id: string, enabled: boolean): IntelligenceSource | null {
  const customList = loadCustomSources();
  const index = customList.findIndex((s) => s.id === id);
  if (index !== -1) {
    customList[index].enabled = enabled;
    saveCustomSources(customList);
    return customList[index];
  }

  // If system source, update in memory
  const sys = SYSTEM_SOURCES.find((s) => s.id === id);
  if (sys) {
    sys.enabled = enabled;
    return sys;
  }

  return null;
}

// Test feed URL without adding
export async function testFeedUrl(url: string, category?: NewsCategory): Promise<{
  success: boolean;
  statusCode?: number;
  itemCount: number;
  sampleTitles: string[];
  message: string;
}> {
  try {
    new URL(url);
  } catch {
    return {
      success: false,
      itemCount: 0,
      sampleTitles: [],
      message: 'Formato de URL inválido. Debe comenzar por http:// o https://',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 CyberIntelBot/2.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, text/html;q=0.9, */*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        itemCount: 0,
        sampleTitles: [],
        message: `El servidor del feed devolvió código HTTP ${response.status} (${response.statusText})`,
      };
    }

    const xml = await response.text();
    const parsed = parseRssXml(xml, 'Test Source', category || 'Noticias Relevantes');

    return {
      success: true,
      statusCode: response.status,
      itemCount: parsed.length,
      sampleTitles: parsed.slice(0, 3).map((p) => p.title),
      message:
        parsed.length > 0
          ? `Feed verificado correctamente. Se han detectado ${parsed.length} noticias publicadas.`
          : 'El feed es accesible y válido (XML/RSS), pero no contiene entradas recientes en este instante.',
    };
  } catch (err: any) {
    return {
      success: false,
      itemCount: 0,
      sampleTitles: [],
      message: `Error de conexión al feed: ${err.message || 'Tiempo de espera agotado'}`,
    };
  }
}
