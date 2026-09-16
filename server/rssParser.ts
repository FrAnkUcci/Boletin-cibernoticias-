import type { NewsCategory, NewsItem, Severity } from '../src/types';

// Regex utilities for extracting CVEs and severity clues
const CVE_REGEX = /\bCVE-\d{4}-\d{4,7}\b/gi;

function detectSeverity(text: string): Severity {
  const lower = text.toLowerCase();
  if (
    lower.includes('critical') ||
    lower.includes('crítica') ||
    lower.includes('zero-day') ||
    lower.includes('0-day') ||
    lower.includes('remote code execution') ||
    lower.includes('rce') ||
    lower.includes('actively exploited') ||
    lower.includes('explotada activamente')
  ) {
    return 'CRITICAL';
  }
  if (
    lower.includes('high severity') ||
    lower.includes('alta') ||
    lower.includes('ransomware') ||
    lower.includes('privilege escalation') ||
    lower.includes('data breach') ||
    lower.includes('fuga de datos') ||
    lower.includes('compromise')
  ) {
    return 'HIGH';
  }
  if (
    lower.includes('medium') ||
    lower.includes('media') ||
    lower.includes('vulnerability') ||
    lower.includes('patch') ||
    lower.includes('phishing') ||
    lower.includes('ddos')
  ) {
    return 'MEDIUM';
  }
  if (lower.includes('low') || lower.includes('baja') || lower.includes('minor')) {
    return 'LOW';
  }
  return 'INFO';
}

function detectCategory(title: string, summary: string, sourceName?: string, defaultCat?: NewsCategory): NewsCategory {
  if (defaultCat) return defaultCat;

  const combined = (title + ' ' + summary + ' ' + (sourceName || '')).toLowerCase();

  // 5. Publicaciones del BOE y DOUE sobre Legislación y normativa sobre Ciberseguridad, IA y Transformación Digital
  if (
    combined.includes('boe') ||
    combined.includes('doue') ||
    combined.includes('eur-lex') ||
    combined.includes('ley orgánica') ||
    combined.includes('real decreto') ||
    combined.includes('directiva (ue)') ||
    combined.includes('reglamento (ue)') ||
    combined.includes('nis2') ||
    combined.includes('dora') ||
    combined.includes('ai act') ||
    combined.includes('inteligencia artificial') ||
    combined.includes('transformación digital') ||
    combined.includes('esquema nacional de seguridad') ||
    combined.includes('ens') ||
    combined.includes('sedia') ||
    combined.includes('aesia') ||
    combined.includes('ciberresiliencia') ||
    combined.includes('directiva cer') ||
    combined.includes('legislación') ||
    combined.includes('normativa')
  ) {
    return 'BOE y DOUE Normativa';
  }

  // 1. Eventos de ciberseguridad en España
  if (
    combined.includes('incibe') ||
    combined.includes('ccn-cert') ||
    combined.includes('jornadas stic') ||
    combined.includes('enise') ||
    combined.includes('cybercamp') ||
    combined.includes('c1b3rwall') ||
    combined.includes('rootedcon') ||
    combined.includes('securmática') ||
    combined.includes('españa') ||
    combined.includes('espdef-cert') ||
    combined.includes('guardia civil') ||
    combined.includes('policía nacional')
  ) {
    return 'Eventos España';
  }

  // 4. Ransomware
  if (
    combined.includes('ransomware') ||
    combined.includes('lockbit') ||
    combined.includes('blackcat') ||
    combined.includes('alphv') ||
    combined.includes('akira') ||
    combined.includes('qilin') ||
    combined.includes('extortion') ||
    combined.includes('extorsión') ||
    combined.includes('leak site') ||
    combined.includes('cifrado')
  ) {
    return 'Ransomware';
  }

  // 3. Vulnerabilidades relevantes
  if (
    combined.includes('cve-') ||
    combined.includes('vulnerab') ||
    combined.includes('zero-day') ||
    combined.includes('0-day') ||
    combined.includes('rce') ||
    combined.includes('remote code execution') ||
    combined.includes('exploit') ||
    combined.includes('kev catalog') ||
    combined.includes('patch tuesday') ||
    combined.includes('buffer overflow')
  ) {
    return 'Vulnerabilidades';
  }

  // 2. Noticias de ciberseguridad relevantes
  return 'Noticias Relevantes';
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTags(text: string): string[] {
  const tags: Set<string> = new Set();
  const lower = text.toLowerCase();
  const knownKeywords = [
    'Ransomware', 'Zero-Day', 'Phishing', 'CISA', 'INCIBE', 'Windows', 'Linux',
    'Android', 'Apple', 'Chrome', 'Firefox', 'Cisco', 'Fortinet', 'Ivanti',
    'Palo Alto', 'Supply Chain', 'API Security', 'OT/ICS', 'Darknet', 'AI Security'
  ];

  for (const kw of knownKeywords) {
    if (lower.includes(kw.toLowerCase())) {
      tags.add(kw);
    }
  }

  return Array.from(tags).slice(0, 4);
}

// High-fidelity curated data representing the 5 requested intelligence categories
export const SAMPLE_SECURITY_NEWS: NewsItem[] = [
  // --- 01. EVENTOS DE CIBERSEGURIDAD EN ESPAÑA ---
  {
    id: 'sec-es-001',
    title: 'CCN-CERT y el Mando Conjunto del Ciberespacio convocan las XVIII Jornadas STIC y Jornadas de Ciberdefensa',
    summary: 'El Centro Criptológico Nacional (CCN-CERT) y el MCCE abren el registro oficial para el mayor congreso de ciberseguridad y ciberdefensa de España en Madrid, centrado en amenazas híbridas y soberanía digital europea.',
    content: 'El evento reunirá a más de 5.000 profesionales del sector público y privado para analizar la respuesta ante ciberataques contra administraciones públicas, operaciones defensivas y directrices de cumplimiento del Esquema Nacional de Seguridad (ENS).',
    url: 'https://www.ccn-cert.cni.es/',
    source: 'CCN-CERT España',
    publishedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    category: 'Eventos España',
    severity: 'MEDIUM',
    cves: [],
    threatActors: ['CCN-CERT', 'MCCE'],
    tags: ['CCN-CERT', 'Jornadas STIC', 'España', 'Ciberdefensa', 'ENS'],
    aiAnalysis: {
      impact: 'Evento clave de coordinación institucional y actualización de doctrinas de ciberseguridad nacional.',
      recommendation: 'Inscribir a los analistas del SOC en los tracks técnicos y talleres del CCN-CERT.',
      affectedSystems: ['Sector Público', 'Operadores Críticos España']
    }
  },
  {
    id: 'sec-es-002',
    title: 'INCIBE celebra en León el Encuentro Internacional de Seguridad de la Información (18 ENISE)',
    summary: 'El Instituto Nacional de Ciberseguridad (INCIBE) convoca la 18ª edición de ENISE con foco en la industria cibernética española, internacionalización e innovación en ciberresiliencia empresarial.',
    content: 'El encuentro presentará los avances del programa de Compra Pública Innovadora, retos de ciberseguridad industrial OT e iniciativas de fomento de talento y cooperación público-privada.',
    url: 'https://www.incibe.es/enise',
    source: 'INCIBE-CERT',
    publishedAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    category: 'Eventos España',
    severity: 'LOW',
    cves: [],
    threatActors: [],
    tags: ['INCIBE', 'ENISE', 'España', 'León', 'Industria'],
    aiAnalysis: {
      impact: 'Punto de encuentro de referencia para el ecosistema tecnológico y empresarial de ciberseguridad nacional.',
      recommendation: 'Participar en los foros de negocio y evaluar soluciones de proveedores nacionales homologados.',
      affectedSystems: ['Pymes y Grandes Empresas', 'Sector OT']
    }
  },
  {
    id: 'sec-es-003',
    title: 'Alerta de INCIBE-CERT: Campaña de smishing masiva suplantando a la Agencia Tributaria en España',
    summary: 'INCIBE detecta una oleada masiva de mensajes SMS fraudulentos dirigidos a ciudadanos y autónomos alertando de una supuesta devolución de impuestos pendiente para robar credenciales bancarias.',
    content: 'Los SMS incluyen enlaces acortados a páginas web que clonan la identidad corporativa de la AEAT e intentan capturar números de tarjeta bancaria y códigos de un solo uso (OTP).',
    url: 'https://www.incibe.es/incibe-cert/alerta-temprana/avisos-seguridad',
    source: 'INCIBE-CERT',
    publishedAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    category: 'Eventos España',
    severity: 'HIGH',
    cves: [],
    threatActors: ['Cibercrimen Financiero'],
    tags: ['INCIBE', 'Smishing', 'AEAT', 'España', 'Fraude'],
    aiAnalysis: {
      impact: 'Riesgo de fraude financiero directo a empleados y compromiso de tarjetas de empresa.',
      recommendation: 'Difundir alerta interna en la plantilla recordando no pulsar enlaces en SMS no verificados.',
      affectedSystems: ['Usuarios Corporativos', 'Banca Online']
    }
  },

  // --- 02. NOTICIAS DE CIBERSEGURIDAD RELEVANTES ---
  {
    id: 'sec-not-001',
    title: 'Campaña de Phishing suplanta a Microsoft 365 con páginas Device Code Phishing evasivas',
    summary: 'Actores de amenazas emplean la autenticación por código de dispositivo (OAuth 2.0 Device Flow) para evadir controles MFA y capturar tokens de sesión persistentes de Exchange y OneDrive.',
    content: 'La técnica no requiere robar contraseñas: la víctima introduce voluntariamente un código legítimo en microsoft.com/devicelogin, autorizando una app maliciosa en Entra ID con permisos Graph API.',
    url: 'https://thehackernews.com/',
    source: 'The Hacker News',
    publishedAt: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
    category: 'Noticias Relevantes',
    severity: 'HIGH',
    cves: [],
    threatActors: ['Midnight Blizzard (APT29)'],
    tags: ['Microsoft 365', 'OAuth', 'Token Theft', 'Phishing'],
    aiAnalysis: {
      impact: 'Exfiltración silenciosa de buzones de correo y acceso permanente a repositorios documentales.',
      recommendation: 'Deshabilitar el flujo Device Code en directivas de acceso condicional para usuarios estándar.',
      affectedSystems: ['Microsoft Entra ID', 'Exchange Online']
    }
  },
  {
    id: 'sec-not-002',
    title: 'Troyano bancario "GoldPickaxe" evade reconocimiento facial biométrico en plataformas móviles',
    summary: 'Investigadores de ciberseguridad revelan un malware sofisticado que captura datos biométricos faciales y documentos de identidad para generar deepfakes y vaciar cuentas bancarias corporativas.',
    content: 'El malware se distribuye a través de perfiles MDM falsificados y enlaces maliciosos de mensajería, solicitando a los usuarios escanear su rostro para verificar supuestas ayudas gubernamentales.',
    url: 'https://www.darkreading.com/',
    source: 'Dark Reading',
    publishedAt: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
    category: 'Noticias Relevantes',
    severity: 'HIGH',
    cves: [],
    threatActors: ['GoldFactory'],
    tags: ['Biometría', 'Deepfake', 'Android', 'iOS', 'Banca'],
    aiAnalysis: {
      impact: 'Suplantación biométrica no revocable ante portales bancarios y pasarelas de autenticación.',
      recommendation: 'Exigir comprobación multifactor no basada exclusivamente en reconocimiento facial móvil.',
      affectedSystems: ['Dispositivos iOS y Android Corporativos']
    }
  },
  {
    id: 'sec-not-003',
    title: 'Investigadores detectan intrusiones sigilosas de Volt Typhoon en routers de telecomunicaciones perimetrales',
    summary: 'Agencias de inteligencia aliadas alertan sobre la persistencia de grupos avanzados que comprometen routers SOHO y firewalls mediante firmware alterado para crear redes proxy anónimas.',
    content: 'Los atacantes emplean credenciales predeterminadas o vulnerabilidades antiguas sin parchear en equipos periféricos para canalizar tráfico malicioso sin ser detectados por los sistemas SIEM corporativos.',
    url: 'https://www.securityweek.com/',
    source: 'SecurityWeek',
    publishedAt: new Date(Date.now() - 1000 * 60 * 290).toISOString(),
    category: 'Noticias Relevantes',
    severity: 'HIGH',
    cves: [],
    threatActors: ['Volt Typhoon'],
    tags: ['Volt Typhoon', 'Firmware', 'Routers', 'Infraestructuras Críticas'],
    aiAnalysis: {
      impact: 'Uso de infraestructura corporativa como nodo de ataque encubierto y persistencia a largo plazo.',
      recommendation: 'Reemplazar equipamiento perimetral con soporte de fabricante descontinuado y auditar credenciales.',
      affectedSystems: ['Routers Perimetrales', 'Dispositivos Edge']
    }
  },

  // --- 03. VULNERABILIDADES RELEVANTES ---
  {
    id: 'sec-vuln-001',
    title: 'CISA advierte de explotación activa de vulnerabilidad crítica RCE en Ivanti Connect Secure',
    summary: 'La Agencia de Seguridad de CISA añade al catálogo KEV una vulnerabilidad crítica de inyección de comandos en pasarelas VPN que permite ejecución remota de código sin autenticación previa.',
    content: 'CISA alertó que actores de amenazas patrocinados por estados están explotando activamente la vulnerabilidad crítica para eludir la autenticación y desplegar webshells en redes corporativas.',
    url: 'https://www.cisa.gov/news-events/cybersecurity-advisories',
    source: 'CISA KEV',
    publishedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    category: 'Vulnerabilidades',
    severity: 'CRITICAL',
    cves: ['CVE-2026-21887', 'CVE-2026-21893'],
    threatActors: ['UNC3886', 'Volt Typhoon'],
    tags: ['CISA KEV', 'Zero-Day', 'RCE', 'Ivanti', 'VPN'],
    aiAnalysis: {
      impact: 'Compromiso perimetral inmediato con acceso total a redes internas y suplantación de sesiones.',
      recommendation: 'Aplicar el parche de emergencia del fabricante inmediatamente o aislar las pasarelas de la red pública.',
      affectedSystems: ['Ivanti Connect Secure 22.x', 'Policy Secure Gateways']
    }
  },
  {
    id: 'sec-vuln-002',
    title: 'Google lanza actualización urgente para Google Chrome por Zero-Day en el motor V8',
    summary: 'Google publica actualización de seguridad de emergencia para Windows, macOS y Linux para corregir una vulnerabilidad de confusión de tipos en V8 explotada activamente en ataques dirigidos.',
    content: 'La vulnerabilidad permite el escape del sandbox del navegador al visitar una página web especialmente manipulada, facilitando ejecución de código arbitrario en el contexto del usuario.',
    url: 'https://thehackernews.com/',
    source: 'The Hacker News',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    category: 'Vulnerabilidades',
    severity: 'CRITICAL',
    cves: ['CVE-2026-1934'],
    threatActors: [],
    tags: ['Chrome', 'Zero-Day', 'V8', 'Sandbox Escape'],
    aiAnalysis: {
      impact: 'Ejecución remota de código en estaciones de trabajo tras navegación web rutinaria.',
      recommendation: 'Forzar el despliegue inmediato de Chrome versión 134.0+ mediante políticas de grupo / MDM.',
      affectedSystems: ['Google Chrome < 134.0', 'Microsoft Edge', 'Brave']
    }
  },
  {
    id: 'sec-vuln-003',
    title: 'Fallo crítico RCE en Ingress NGINX para Kubernetes permite escalada a Cluster-Admin',
    summary: 'Una inyección en las anotaciones de configuración de NGINX Ingress Controller permite a usuarios con permisos de creación de rutas ejecutar código en el pod del controlador con privilegios elevados.',
    content: 'Dado que el controlador a menudo dispone de tokens de servicio de lectura a Secrets de Kubernetes, un atacante puede obtener credenciales administrativas de todo el clúster de producción.',
    url: 'https://www.securityweek.com/',
    source: 'SecurityWeek',
    publishedAt: new Date(Date.now() - 1000 * 60 * 250).toISOString(),
    category: 'Vulnerabilidades',
    severity: 'CRITICAL',
    cves: ['CVE-2026-1178'],
    threatActors: [],
    tags: ['Kubernetes', 'Cloud Security', 'RCE', 'Containers'],
    aiAnalysis: {
      impact: 'Toma de control total del clúster de contenedores, robo de tokens de base de datos y llaves de cifrado.',
      recommendation: 'Actualizar Ingress NGINX a la versión 1.11.0 o activar el flag `--enable-annotation-validation`.',
      affectedSystems: ['ingress-nginx < v1.11.0', 'Kubernetes v1.28-v1.31']
    }
  },

  // --- 04. RANSOMWARE ---
  {
    id: 'sec-rans-001',
    title: 'Banda de Ransomware LockBit 4.0 ataca servidores VMware ESXi mediante credenciales robadas',
    summary: 'Investigadores detectan una campaña masiva de cifrado dirigida a hipervisores virtualizados mediante scripts automatizados en Bash que deshabilitan copias de seguridad de volumen vCenter.',
    content: 'El grupo de extorsión está aprovechando credenciales de administración filtradas y vulnerabilidades residuales de OpenSLP para terminar máquinas virtuales en segundos e insertar notas de rescate.',
    url: 'https://www.bleepingcomputer.com/news/security/',
    source: 'BleepingComputer',
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    category: 'Ransomware',
    severity: 'CRITICAL',
    cves: ['CVE-2024-37085'],
    threatActors: ['LockBit Gang', 'Storm-0501'],
    tags: ['Ransomware', 'LockBit', 'ESXi', 'VMware', 'Extorsión'],
    aiAnalysis: {
      impact: 'Detención completa de la operativa empresarial y cifrado masivo de almacenamiento SAN/NAS virtualizado.',
      recommendation: 'Activar autenticación multifactor (MFA) obligatoria en ESXi y aislar consolas en VLANs fuera de internet.',
      affectedSystems: ['VMware ESXi 7.0 / 8.0', 'vCenter Server']
    }
  },
  {
    id: 'sec-rans-002',
    title: 'Ransomware Akira intensifica la doble extorsión amenazando con publicar bases de datos de clientes',
    summary: 'El grupo de ransomware Akira publica en su portal TOR información confidencial exfiltrada de tres compañías europeas tras rechazar el pago del rescate, combinando cifrado con fuga pública.',
    content: 'Los informes forenses indican que el vector de entrada inicial fue una cuenta VPN corporativa sin autenticación de doble factor, procediendo al movimiento lateral mediante herramientas Living-off-the-Land (LotL).',
    url: 'https://www.bleepingcomputer.com/',
    source: 'BleepingComputer',
    publishedAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    category: 'Ransomware',
    severity: 'HIGH',
    cves: [],
    threatActors: ['Akira Ransomware Group'],
    tags: ['Akira', 'Ransomware', 'Doble Extorsión', 'Data Leak'],
    aiAnalysis: {
      impact: 'Doble impacto: parálisis operativa por cifrado e infracción grave del RGPD por difusión pública de datos.',
      recommendation: 'Verificar backups inmutables (WORM) desconectados de la red y auditar todas las cuentas VPN.',
      affectedSystems: ['Almacenamiento Corporativo', 'Servidores Windows/Linux']
    }
  },
  {
    id: 'sec-rans-003',
    title: 'Nueva variante de Ransomware Qilin implementa cifrado intermitente ultrarrápido en Linux y Windows',
    summary: 'Analistas de malware analizan la última versión de Qilin Ransomware, desarrollada en Rust, capaz de evadir soluciones EDR cifrando solo bloques específicos de cada archivo para multiplicar la velocidad.',
    content: 'Esta técnica de cifrado intermitente reduce drásticamente el tiempo de respuesta disponible para los equipos de SOC antes de que las bases de datos principales queden irrecuperables.',
    url: 'https://thehackernews.com/',
    source: 'The Hacker News',
    publishedAt: new Date(Date.now() - 1000 * 60 * 310).toISOString(),
    category: 'Ransomware',
    severity: 'HIGH',
    cves: [],
    threatActors: ['Qilin (Agenda)'],
    tags: ['Qilin', 'Rust', 'Cifrado Intermitente', 'EDR Bypass'],
    aiAnalysis: {
      impact: 'Cifrado de volúmenes de terabytes en minutos eludiendo umbrales convencionales de detección heurística.',
      recommendation: 'Habilitar reglas de contención automática en el EDR basadas en comportamiento de creación de notas de rescate.',
      affectedSystems: ['Windows Server 2022', 'RHEL / Ubuntu Enterprise']
    }
  },

  // --- 05. PUBLICACIONES DEL BOE Y DOUE SOBRE LEGISLACIÓN Y NORMATIVA ---
  {
    id: 'sec-boe-001',
    title: 'BOE: Real Decreto que aprueba el Estatuto y Gobernanza de la Agencia Española de Supervisión de la IA (AESIA)',
    summary: 'El Boletín Oficial del Estado (BOE-A-2024-18492) publica la regulación orgánica de la AESIA, estableciendo sus facultades sancionadoras, modelos de sandbox regulatorio y supervisión de modelos de IA.',
    content: 'La norma dota a la AESIA de competencias plenas para auditar algoritmos de alto riesgo, imponer sanciones por incumplimientos del Reglamento Europeo de IA y coordinar directrices con la Secretaría de Estado de Digitalización e Inteligencia Artificial (SEDIA).',
    url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-18492',
    source: 'BOE (Disposiciones Generales)',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    category: 'BOE y DOUE Normativa',
    severity: 'MEDIUM',
    cves: [],
    threatActors: [],
    tags: ['BOE', 'AESIA', 'SEDIA', 'Inteligencia Artificial', 'Normativa España'],
    aiAnalysis: {
      impact: 'Obligación legal para entidades españolas de inventariar y clasificar todos los sistemas de IA en uso.',
      recommendation: 'Iniciar auditoría de cumplimiento algorítmico y documentación técnica según las directrices de la AESIA.',
      affectedSystems: ['Sistemas de IA Empresariales', 'Gobierno de Datos']
    }
  },
  {
    id: 'sec-boe-002',
    title: 'DOUE: Entrada en vigor del Reglamento (UE) 2024/1689 de Inteligencia Artificial (EU AI Act)',
    summary: 'El Diario Oficial de la Unión Europea (DOUE) hace efectiva la aplicación escalonada del AI Act, prohibiendo prácticas inaceptables e imponiendo requisitos estrictos a sistemas de IA de alto riesgo.',
    content: 'El reglamento europeo establece obligaciones de transparencia para modelos fundacionales (LLMs), evaluación de riesgos previa a la comercialización y un régimen sancionador de hasta 35 millones de euros o el 7% de la facturación global.',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32024R1689',
    source: 'DOUE (Diario Oficial UE)',
    publishedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    category: 'BOE y DOUE Normativa',
    severity: 'HIGH',
    cves: [],
    threatActors: [],
    tags: ['DOUE', 'EU AI Act', 'Reglamento UE', 'Compliance', 'Inteligencia Artificial'],
    aiAnalysis: {
      impact: 'Marco regulatorio vinculante directo en toda la UE con impacto en desarrollo y adopción de IA generativa.',
      recommendation: 'Constituir un comité interno de gobernanza de IA y verificar que los proveedores firmen adendas de conformidad.',
      affectedSystems: ['Modelos de IA', 'Soluciones de Automatización y LLMs']
    }
  },
  {
    id: 'sec-boe-003',
    title: 'BOE: Transposición de la Directiva NIS2 (UE 2022/2555) y directrices de notificación de incidentes',
    summary: 'El Ministerio para la Transformación Digital publica en el BOE el marco normativo de transposición de NIS2, ampliando las obligaciones de seguridad y reporte a más de 18 sectores esenciales e importantes.',
    content: 'La normativa fija la obligación de notificar incidentes significativos al CSIRT nacional en un plazo máximo de 24 horas (alerta temprana) y 72 horas (evaluación completa), con responsabilidad directa de los órganos de administración.',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2024-NIS2',
    source: 'BOE (Leyes y Normativa)',
    publishedAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    category: 'BOE y DOUE Normativa',
    severity: 'HIGH',
    cves: [],
    threatActors: [],
    tags: ['BOE', 'NIS2', 'Ciberseguridad', 'Transformación Digital', 'Directiva UE'],
    aiAnalysis: {
      impact: 'Régimen de sanciones directas a directivos y obligaciones formales de ciberseguridad en la cadena de suministro.',
      recommendation: 'Actualizar los protocolos de gestión y notificación de incidentes para cumplir los plazos de 24h de NIS2.',
      affectedSystems: ['Entidades Esenciales', 'Cadena de Suministro TIC']
    }
  },
  {
    id: 'sec-boe-004',
    title: 'DOUE: Reglamento DORA (UE 2022/2554) sobre Resiliencia Operativa Digital para el Sector Financiero',
    summary: 'El DOUE publica las normas técnicas de regulación (RTS) conjuntas de EBA, EIOPA y ESMA que detallan las pruebas de penetración basadas en amenazas (TLPT) y supervisión de terceros TIC.',
    content: 'DORA exige a bancos, aseguradoras y fintechs realizar pruebas avanzadas de intrusión (TLPT tipo TIBER-EU), mantener registros detallados de servicios en la nube y someter a supervisión europea a proveedores críticos como AWS o Azure.',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32022R2554',
    source: 'DOUE (Diario Oficial UE)',
    publishedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    category: 'BOE y DOUE Normativa',
    severity: 'HIGH',
    cves: [],
    threatActors: [],
    tags: ['DOUE', 'DORA', 'Sector Financiero', 'Resiliencia Digital', 'Cloud'],
    aiAnalysis: {
      impact: 'Exigencia obligatoria de tests de resiliencia operativa y renegociación de contratos con proveedores cloud.',
      recommendation: 'Revisar la matriz de proveedores terceros críticos y calendarizar simulacros TLPT.',
      affectedSystems: ['Infraestructuras Financieras', 'Proveedores Cloud Críticos']
    }
  },
  {
    id: 'sec-boe-005',
    title: 'BOE: Actualización de Guías de Seguridad CCN-STIC para el Esquema Nacional de Seguridad (ENS)',
    summary: 'El BOE recoge la aprobación de nuevas instrucciones técnicas de seguridad relativas a la certificación de conformidad con el ENS (Real Decreto 311/2022) en entornos multi-tenant cloud.',
    content: 'La resolución establece los requisitos técnicos obligatorios para que los organismos públicos y sus proveedores tecnológicos certifiquen sus sistemas en categorías Media y Alta según el ENS.',
    url: 'https://www.boe.es/diario_boe/',
    source: 'BOE (Disposiciones Generales)',
    publishedAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    category: 'BOE y DOUE Normativa',
    severity: 'MEDIUM',
    cves: [],
    threatActors: [],
    tags: ['BOE', 'ENS', 'CCN-STIC', 'Administración Pública', 'Cloud'],
    aiAnalysis: {
      impact: 'Requisito imprescindible para licitaciones públicas y prestación de servicios a entidades gubernamentales.',
      recommendation: 'Verificar el estado de certificación ENS de todos los entornos cloud utilizados en proyectos públicos.',
      affectedSystems: ['Servicios Cloud Públicos', 'Contratas de la AGE']
    }
  }
];

export async function fetchFeedFromUrl(
  feedUrl: string,
  sourceName: string,
  defaultCategory?: NewsCategory
): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.info(`[RSS] Source ${sourceName} (${feedUrl}) status ${response.status}; fallback intelligence stream active.`);
      return [];
    }

    const xmlText = await response.text();
    return parseRssXml(xmlText, sourceName, defaultCategory);
  } catch (err: any) {
    console.info(`[RSS] Notice: ${sourceName} feed unreachable (${err.message || 'timeout'}); using fallback intelligence.`);
    return [];
  }
}

export function parseRssXml(
  xml: string,
  sourceName: string,
  defaultCategory?: NewsCategory
): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  for (let i = 0; i < Math.min(itemMatches.length, 12); i++) {
    const itemBlock = itemMatches[i];

    // Extract title
    const titleMatch = itemBlock.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? stripHtml(titleMatch[1]) : '';
    if (!title) continue;

    // Extract link
    let link = '';
    const linkMatch = itemBlock.match(/<link[^>]*href="([^"]+)"/i) || itemBlock.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    if (linkMatch) {
      link = stripHtml(linkMatch[1] || linkMatch[0]);
    }

    // Extract description / content
    const descMatch = itemBlock.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
                      itemBlock.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
                      itemBlock.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
    const rawSummary = descMatch ? stripHtml(descMatch[1]) : '';
    const summary = rawSummary.slice(0, 320) + (rawSummary.length > 320 ? '...' : '');

    // Extract publication date
    const dateMatch = itemBlock.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
                      itemBlock.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
                      itemBlock.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
    let pubDate = new Date().toISOString();
    if (dateMatch) {
      const parsed = new Date(dateMatch[1].trim());
      if (!isNaN(parsed.getTime())) {
        pubDate = parsed.toISOString();
      }
    }

    // Extract CVEs
    const fullText = `${title} ${rawSummary}`;
    const cveMatches = Array.from(new Set(fullText.match(CVE_REGEX) || []));

    const severity = detectSeverity(fullText);
    const category = detectCategory(title, rawSummary, sourceName, defaultCategory);
    const tags = extractTags(fullText);

    items.push({
      id: `rss-${sourceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}-${Date.now().toString(36)}`,
      title,
      summary: summary || title,
      content: rawSummary,
      url: link || '#',
      source: sourceName,
      publishedAt: pubDate,
      category,
      severity,
      cves: cveMatches,
      threatActors: [],
      tags: tags.length > 0 ? tags : [category]
    });
  }

  return items;
}

