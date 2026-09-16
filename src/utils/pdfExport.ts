import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CATEGORY_DEFINITIONS, CATEGORY_MAP } from '../types';
import type { DailyBriefing, NewsCategory, NewsItem, PdfExportOptions } from '../types';
import { ESCUDO_CIBER_BASE64 } from '../assets/escudoBase64';

// Helper for formatted Spanish date: "miércoles, 25 de febrero de 2026"
export function formatSpanishDate(dateInput?: string | Date): string {
  let d: Date;
  if (!dateInput) {
    d = new Date();
  } else if (typeof dateInput === 'string') {
    d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      // Try YYYY-MM-DD
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        d = new Date();
      }
    }
  } else {
    d = dateInput;
  }

  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const weekday = days[d.getDay()] || 'miércoles';
  const day = d.getDate();
  const month = months[d.getMonth()] || 'enero';
  const year = d.getFullYear();

  return `${weekday}, ${day} de ${month} de ${year}`;
}

// Draw the official Guardia Civil Novedades OSINT Ciber Header & Border Lines
function drawOfficialHeader(
  doc: jsPDF,
  dateStr: string,
  title: string = 'NOVEDADES OSINT CIBER',
  showShield: boolean = true
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Red left margin accent line (Guardia Civil / España color)
  doc.setDrawColor(196, 30, 58); // #C41E3A
  doc.setLineWidth(0.6);
  doc.line(14, 15, 14, pageHeight - 15);

  // Green bottom margin accent line (Guardia Civil corporate color)
  doc.setDrawColor(0, 104, 55); // #006837
  doc.setLineWidth(0.6);
  doc.line(8, pageHeight - 12, pageWidth - 15, pageHeight - 12);

  // Official Shield (Escudo de la Guardia Civil - Unidad de Coordinación de Ciberseguridad)
  if (showShield && ESCUDO_CIBER_BASE64) {
    try {
      doc.addImage(ESCUDO_CIBER_BASE64, 'PNG', 16.5, 9.5, 23, 23);
    } catch (err) {
      console.warn('Error rendering shield image into PDF:', err);
    }
  }

  // Header Title: "NOVEDADES OSINT CIBER"
  const titleX = showShield ? 43 : 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(17, 24, 39); // Deep dark gray/black #111827
  doc.text(title, titleX, 20);

  // Underline beneath the title
  const titleWidth = doc.getTextWidth(title);
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.45);
  doc.line(titleX, 21.8, titleX + Math.min(titleWidth, 125), 21.8);

  // Date on the right (below the title bar line)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(dateStr, pageWidth - 15, 26.5, { align: 'right' });
}

// Check page break and draw header if new page is created
function ensurePageSpace(
  doc: jsPDF,
  currentY: number,
  neededHeight: number,
  dateStr: string,
  title: string,
  showShield: boolean
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + neededHeight > pageHeight - 18) {
    doc.addPage();
    drawOfficialHeader(doc, dateStr, title, showShield);
    return 36; // Fresh top Y position after header
  }
  return currentY;
}

// Clean and extract readable company victim or target name
function extractVictimName(title: string, content: string): { name: string; url?: string } {
  // Check for domain or company name in title
  const urlMatch = title.match(/https?:\/\/[^\s)]+/i) || content.match(/https?:\/\/[^\s)]+/i);
  if (urlMatch) {
    return { name: title.replace(/https?:\/\/[^\s)]+/i, '').trim() || urlMatch[0], url: urlMatch[0] };
  }

  // Common title cleanup: "Ciberataque a X...", "X sufre ataque de ransomware..."
  let cleaned = title
    .replace(/^Ciberataque\s+(a\s+la|al|a)\s+/i, '')
    .replace(/^Ataque de ransomware\s+(a|contra)\s+/i, '')
    .replace(/\s+sufre\s+(un\s+)?(ciberataque|ataque).*/i, '')
    .replace(/\s+víctima\s+de\s+.*/i, '')
    .replace(/\s+afectado\s+por\s+.*/i, '')
    .trim();

  if (cleaned.length > 55) {
    cleaned = cleaned.substring(0, 55) + '...';
  }

  return { name: cleaned || title };
}

// Extract ransomware group name
function extractRansomwareGroup(item: NewsItem): string {
  if (item.threatActors && item.threatActors.length > 0) {
    return item.threatActors[0];
  }

  const text = `${item.title} ${item.summary} ${item.content || ''}`;
  const knownGroups = [
    'Qilin', 'LockBit', 'Akira', 'Genesis', 'Nightspire', 'Sinobi', 'Incransom',
    'Black Basta', 'Phobos', 'CyberVolk', 'VolkLocker', 'SafePay', 'Tengu',
    'Kazu', 'Thegentlemen', 'Coinbasecartel', 'Lynx', 'Medusa', 'Cactus',
    'Dragonforce', 'Black Cat', 'ALPHV', 'Play', 'BianLian', 'Rhysida'
  ];

  for (const group of knownGroups) {
    const regex = new RegExp(`\\b${group}\\b`, 'i');
    if (regex.test(text)) {
      return group;
    }
  }

  const match = text.match(/grupo(?:\s+de\s+ransomware)?[:\s]+([A-Za-z0-9_-]+)/i);
  if (match && match[1] && match[1].length > 2) {
    return match[1];
  }

  return 'No especificado / En investigación';
}

// Extract official BOE / DOUE identifier
function extractOfficialId(item: NewsItem): string | null {
  const text = `${item.title} ${item.summary} ${item.content || ''} ${item.url}`;
  const boeMatch = text.match(/BOE-[A-Z]-\d{4}-\d+/i);
  if (boeMatch) return boeMatch[0].toUpperCase();

  const doueMatch = text.match(/DOUE-[A-Z]-\d{4}-\d+/i) || text.match(/CELEX:\d{10}/i);
  if (doueMatch) return doueMatch[0].toUpperCase();

  // Match general regulation code: Reglamento (UE) 2026/XXX
  const regMatch = text.match(/Reglamento\s+\(UE\)\s+(?:nº\s*)?\d{4}\/\d+/i);
  if (regMatch) return regMatch[0];

  const dirMatch = text.match(/Directiva\s+\(UE\)\s+\d{4}\/\d+/i);
  if (dirMatch) return dirMatch[0];

  return null;
}

// ========================================================================
// 1. OFFICIAL OSINT BULLETIN BUILDER ("NOVEDADES OSINT CIBER")
// ========================================================================
export function buildOfficialOsintDoc(
  items: NewsItem[],
  briefing: DailyBriefing | null,
  options: PdfExportOptions
): { doc: jsPDF; fileName: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const title = options.title || 'NOVEDADES OSINT CIBER';
  const showShield = options.showGuardiaCivilEmblem !== false;
  const dateStr = options.customDate || formatSpanishDate(briefing?.date);

  // Draw Page 1 header
  drawOfficialHeader(doc, dateStr, title, showShield);
  let currentY = 36;

  // Classify items into the 6 standard official sections
  const eventosItems: NewsItem[] = [];
  const noticiasItems: NewsItem[] = [];
  const vulnerabilidadesItems: NewsItem[] = [];
  const ransomwareItems: NewsItem[] = [];
  const filtracionesItems: NewsItem[] = [];
  const boeItems: NewsItem[] = [];

  const eventKeywords = /\b(jornadas?|congreso|curso|cursos|conferencia|feria|summit|hackathon|seminario|encuentro|plazo|inscripci[oó]n|f[oó]rum|symposium|taller|stic|enise|sicur|transfiere|c1b3rwall)\b/i;
  const leakKeywords = /\b(filtraci[oó]n|filtrados?|expuesto|exposici[oó]n de datos|base de datos expuesta|brecha de datos|brecha de seguridad|logins|credenciales expuestas|dark web|breachforums)\b/i;
  const ransomKeywords = /\b(ransomware|extorsi[oó]n|secuestro de datos|qilin|lockbit|akira|genesis|nightspire|sinobi|incransom|black basta|cybervolk|volklocker|safepay|tengu|kazu|thegentlemen|coinbasecartel|lynx)\b/i;

  items.forEach((item) => {
    const text = `${item.title} ${item.summary}`.toLowerCase();

    // 1. BOE y DOUE Normativa
    if (
      item.category === 'BOE y DOUE Normativa' ||
      /\b(boe|doue|eur-lex|licitaci[oó]n|formalizaci[oó]n de contratos?|reglamento|directiva|acuerdo del pleno|resoluci[oó]n de)\b/i.test(text)
    ) {
      boeItems.push(item);
      return;
    }

    // 2. Ransomware
    if (item.category === 'Ransomware' || ransomKeywords.test(text)) {
      ransomwareItems.push(item);
      return;
    }

    // 3. Filtraciones
    if (leakKeywords.test(text) && !item.cves.length) {
      filtracionesItems.push(item);
      return;
    }

    // 4. Vulnerabilidades
    if (
      item.category === 'Vulnerabilidades' ||
      item.cves.length > 0 ||
      /\b(vulnerabilidad|zero-day|parche|fallo cr[ií]tico|rce|xss|sqli|inyecci[oó]n|omisi[oó]n de autenticaci[oó]n|desbordamiento de b[uú]fer)\b/i.test(text)
    ) {
      vulnerabilidadesItems.push(item);
      return;
    }

    // 5. Eventos España
    if (item.category === 'Eventos España' && eventKeywords.test(text)) {
      eventosItems.push(item);
      return;
    }

    // 6. Noticias Relevantes (default)
    noticiasItems.push(item);
  });

  const leftMargin = 20;
  const bulletX = 24;
  const subBulletX = 29;
  const contentWidth = pageWidth - leftMargin - 15; // 175mm
  const titleMaxWidth = pageWidth - bulletX - 16;
  const subMaxWidth = pageWidth - subBulletX - 16;

  // Section labels
  const labelRansomware = options.spellingRansomware || 'RAMSOWARE:';
  const labelBoe = options.spellingBoe || 'BOE y BOEU:';

  // Helper to render Section Title
  const renderSectionHeader = (headerText: string) => {
    currentY = ensurePageSpace(doc, currentY, 14, dateStr, title, showShield);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(headerText, leftMargin, currentY);
    currentY += 4.5;
  };

  // Helper to render "• Nada."
  const renderEmptySection = () => {
    currentY = ensurePageSpace(doc, currentY, 7, dateStr, title, showShield);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('•  Nada.', bulletX, currentY);
    currentY += 5.5;
  };

  // Helper to render clickable title with blue underline
  const renderClickableTitle = (titleText: string, url?: string, isBold: boolean = true) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 32, 176); // Deep link blue #0020B0

    const lines = doc.splitTextToSize(titleText, titleMaxWidth);
    lines.forEach((line: string, idx: number) => {
      currentY = ensurePageSpace(doc, currentY, 5, dateStr, title, showShield);
      const textX = idx === 0 ? bulletX + 3.5 : bulletX + 3.5;
      doc.text(line, textX, currentY);

      // Underline
      const lineWidth = doc.getTextWidth(line);
      doc.setDrawColor(0, 32, 176);
      doc.setLineWidth(0.2);
      doc.line(textX, currentY + 0.5, textX + lineWidth, currentY + 0.5);

      // Link annotation
      if (url) {
        doc.link(textX, currentY - 3.2, lineWidth, 4.2, { url });
      }

      currentY += 4.2;
    });
  };

  // Helper to render indented sub-bullet body text with total text justification (align: 'justify')
  const renderSubBulletText = (text: string, prefix: string = 'o  ') => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20); // Dark text

    const textWidth = subMaxWidth - 4.5;
    const textX = subBulletX + 4.5;
    const lineHeight = 4.0;
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const lines: string[] = doc.splitTextToSize(cleanText, textWidth);

    if (lines.length === 0) return;

    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomLimit = pageHeight - 16;
    const totalHeight = lines.length * lineHeight;

    // If whole paragraph fits on current page
    if (currentY + totalHeight <= bottomLimit) {
      doc.text(prefix.trim(), subBulletX, currentY);
      if (lines.length > 1) {
        doc.text(cleanText, textX, currentY, { align: 'justify', maxWidth: textWidth });
      } else {
        doc.text(lines[0], textX, currentY);
      }
      currentY += totalHeight;
      return;
    }

    // If current position has almost no room left, advance page before starting paragraph
    if (currentY > bottomLimit - 8) {
      currentY = ensurePageSpace(doc, currentY, 16, dateStr, title, showShield);
    }

    // Distribute lines across pages, applying full justification to each multi-line chunk
    let lineIdx = 0;
    let isFirstChunk = true;

    while (lineIdx < lines.length) {
      const remainingHeight = bottomLimit - currentY;
      const linesCanFit = Math.max(1, Math.floor(remainingHeight / lineHeight));
      const chunk = lines.slice(lineIdx, lineIdx + linesCanFit);

      if (isFirstChunk) {
        doc.text(prefix.trim(), subBulletX, currentY);
        isFirstChunk = false;
      }

      if (chunk.length > 1) {
        doc.text(chunk.join(' '), textX, currentY, { align: 'justify', maxWidth: textWidth });
      } else {
        doc.text(chunk[0], textX, currentY);
      }

      currentY += chunk.length * lineHeight;
      lineIdx += chunk.length;

      if (lineIdx < lines.length) {
        currentY = ensurePageSpace(doc, currentY, 20, dateStr, title, showShield);
      }
    }
  };

  // -------------------------------------------------------------
  // 1. EVENTOS:
  // -------------------------------------------------------------
  renderSectionHeader('EVENTOS:');
  if (eventosItems.length === 0) {
    renderEmptySection();
  } else {
    eventosItems.forEach((item) => {
      currentY = ensurePageSpace(doc, currentY, 12, dateStr, title, showShield);
      // Main bullet
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('•', bulletX, currentY);

      renderClickableTitle(item.title, item.url);
      renderSubBulletText(item.summary || item.content || 'Sin datos adicionales sobre el evento.');
      currentY += 1.5;
    });
  }

  // -------------------------------------------------------------
  // 2. NOTICIAS:
  // -------------------------------------------------------------
  renderSectionHeader('NOTICIAS:');
  if (noticiasItems.length === 0) {
    renderEmptySection();
  } else {
    noticiasItems.forEach((item) => {
      currentY = ensurePageSpace(doc, currentY, 14, dateStr, title, showShield);
      // Main bullet
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('•', bulletX, currentY);

      renderClickableTitle(item.title, item.url);
      renderSubBulletText(item.summary);
      currentY += 1.8;
    });
  }

  // -------------------------------------------------------------
  // 3. VULNERABILIDAD:
  // -------------------------------------------------------------
  renderSectionHeader('VULNERABILIDAD:');
  if (vulnerabilidadesItems.length === 0) {
    renderEmptySection();
  } else {
    vulnerabilidadesItems.forEach((item) => {
      currentY = ensurePageSpace(doc, currentY, 8, dateStr, title, showShield);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('•', bulletX, currentY);

      renderClickableTitle(item.title, item.url);

      // If CVEs exist, render as sub-bullet
      if (item.cves && item.cves.length > 0) {
        renderSubBulletText(`Identificadores: ${item.cves.join(', ')}`);
      } else if (item.summary && item.summary !== item.title && item.summary.length < 180) {
        renderSubBulletText(item.summary);
      }
      currentY += 1.2;
    });
  }

  // -------------------------------------------------------------
  // 4. RAMSOWARE:
  // -------------------------------------------------------------
  renderSectionHeader(labelRansomware);
  if (ransomwareItems.length === 0) {
    renderEmptySection();
  } else {
    ransomwareItems.forEach((item) => {
      currentY = ensurePageSpace(doc, currentY, 16, dateStr, title, showShield);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('•', bulletX, currentY);

      // Victim Name / URL
      const victim = extractVictimName(item.title, item.summary);
      renderClickableTitle(victim.name, item.url);

      // Group
      const groupName = extractRansomwareGroup(item);
      renderSubBulletText(`Grupo: ${groupName}`);

      // Date of incident / discovery
      const dateVal = item.publishedAt.substring(0, 10);
      renderSubBulletText(`Fecha / Descubierto: ${dateVal}`);

      currentY += 1.5;
    });
  }

  // -------------------------------------------------------------
  // 5. FILTRACIONES:
  // -------------------------------------------------------------
  renderSectionHeader('FILTRACIONES:');
  if (filtracionesItems.length === 0) {
    renderEmptySection();
  } else {
    filtracionesItems.forEach((item) => {
      currentY = ensurePageSpace(doc, currentY, 12, dateStr, title, showShield);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('•', bulletX, currentY);

      renderClickableTitle(item.title, item.url);
      renderSubBulletText(item.summary);
      currentY += 1.5;
    });
  }

  // -------------------------------------------------------------
  // 6. BOE y BOEU:
  // -------------------------------------------------------------
  renderSectionHeader(labelBoe);
  if (boeItems.length === 0) {
    renderEmptySection();
  } else {
    boeItems.forEach((item) => {
      currentY = ensurePageSpace(doc, currentY, 14, dateStr, title, showShield);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('•', bulletX, currentY);

      // Descriptive text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);

      const lines = doc.splitTextToSize(item.title, titleMaxWidth);
      const totalTitleHeight = lines.length * 4.0;
      currentY = ensurePageSpace(doc, currentY, totalTitleHeight, dateStr, title, showShield);
      if (lines.length > 1) {
        doc.text(item.title.trim(), bulletX + 3.5, currentY, { align: 'justify', maxWidth: titleMaxWidth });
      } else {
        doc.text(lines[0], bulletX + 3.5, currentY);
      }
      currentY += totalTitleHeight;

      // Sub-bullet with clickable official identifier
      const officialId = extractOfficialId(item) || 'Ver publicación oficial';
      currentY = ensurePageSpace(doc, currentY, 5, dateStr, title, showShield);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      doc.text('o  ', subBulletX, currentY);

      // Blue underlined link for ID
      doc.setTextColor(0, 32, 176);
      doc.setFont('helvetica', 'bold');
      doc.text(officialId, subBulletX + 4.5, currentY);
      const idWidth = doc.getTextWidth(officialId);
      doc.setDrawColor(0, 32, 176);
      doc.setLineWidth(0.2);
      doc.line(subBulletX + 4.5, currentY + 0.5, subBulletX + 4.5 + idWidth, currentY + 0.5);

      if (item.url) {
        doc.link(subBulletX + 4.5, currentY - 3.2, idWidth, 4.2, { url: item.url });
      }

      currentY += 5.2;
    });
  }

  const cleanDateSlug = (dateStr || 'boletin').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const fileName = `Novedades_OSINT_Ciber_${cleanDateSlug}.pdf`;
  return { doc, fileName };
}

export function exportOfficialOsintReport(
  items: NewsItem[],
  briefing: DailyBriefing | null,
  options: PdfExportOptions
) {
  const { doc, fileName } = buildOfficialOsintDoc(items, briefing, options);
  doc.save(fileName);
}

// ========================================================================
// 2. EXTENDED EXECUTIVE DASHBOARD REPORT (Alternative analytical view)
// ========================================================================
export function buildExecutiveDashboardDoc(
  items: NewsItem[],
  briefing: DailyBriefing | null,
  options: PdfExportOptions
): { doc: jsPDF; fileName: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  const primaryColor = [15, 23, 42];
  const accentColor = [14, 116, 144];
  const criticalColor = [225, 29, 72];
  const highColor = [217, 119, 6];
  const mediumColor = [202, 138, 4];
  const lightBg = [248, 250, 252];

  // HEADER BANNER
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 34, 'F');

  // Classification Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(criticalColor[0], criticalColor[1], criticalColor[2]);
  doc.roundedRect(margin, 8, 32, 5, 1, 1, 'F');
  doc.text(options.classification || 'TLP:CLEAR', margin + 3, 11.5);

  // Escudo
  if (options.showGuardiaCivilEmblem !== false && ESCUDO_CIBER_BASE64) {
    try {
      doc.addImage(ESCUDO_CIBER_BASE64, 'PNG', pageWidth - margin - 20, 6, 20, 20);
    } catch (e) {
      console.warn(e);
    }
  }

  // Document Title
  doc.setFontSize(13.5);
  doc.text(options.title || 'INFORME DIARIO DE CIBERSEGURIDAD', margin + 38, 12);

  // Subtitle / Date / Org
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const dateStr = options.customDate || formatSpanishDate(briefing?.date);
  doc.text(
    `Fecha: ${dateStr}   |   Org: ${options.organization || 'Unidad de Coordinación de Ciberseguridad'}   |   Artículos: ${items.length}`,
    margin,
    25
  );

  currentY = 40;

  // EXECUTIVE BRIEFING SECTION
  if (options.includeExecutiveSummary && briefing) {
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('1. RESUMEN EJECUTIVO Y NIVEL DE ALERTA GLOBAL', margin + 3, currentY + 5.5);

    const alertLevel = briefing.alertLevel || 'ELEVATED';
    const alertBadgeColor = alertLevel === 'CRITICAL' ? criticalColor : alertLevel === 'HIGH' ? highColor : accentColor;
    doc.setFillColor(alertBadgeColor[0], alertBadgeColor[1], alertBadgeColor[2]);
    doc.roundedRect(pageWidth - margin - 35, currentY + 1.5, 32, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(`ALERTA: ${alertLevel}`, pageWidth - margin - 33, currentY + 5);

    currentY += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const headlineLines = doc.splitTextToSize(briefing.headline, pageWidth - margin * 2);
    doc.text(headlineLines, margin, currentY);
    currentY += headlineLines.length * 4.5 + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const summaryWidth = pageWidth - margin * 2;
    const summaryLines = doc.splitTextToSize(briefing.summary, summaryWidth);
    doc.text(briefing.summary.trim(), margin, currentY, { align: 'justify', maxWidth: summaryWidth });
    currentY += summaryLines.length * 4.2 + 4;
  }

  // METRICS TABLE
  if (options.includeMetrics) {
    const criticalCount = items.filter((i) => i.severity === 'CRITICAL').length;
    const highCount = items.filter((i) => i.severity === 'HIGH').length;
    const mediumCount = items.filter((i) => i.severity === 'MEDIUM').length;
    const cveCount = Array.from(new Set(items.flatMap((i) => i.cves))).length;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Total Artículos', 'Críticas', 'Altas', 'Medias / Bajas', 'CVEs Únicos']],
      body: [
        [
          items.length.toString(),
          criticalCount.toString(),
          highCount.toString(),
          (mediumCount + (items.length - criticalCount - highCount - mediumCount)).toString(),
          cveCount.toString(),
        ],
      ],
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        textColor: [15, 23, 42],
      },
      theme: 'grid',
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 25;
  }

  // DETAILED INVENTORY
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = margin;
  }

  const sortedItems = [...items].sort((a, b) => {
    const codeA = CATEGORY_MAP[a.category]?.code || '99';
    const codeB = CATEGORY_MAP[b.category]?.code || '99';
    return codeA.localeCompare(codeB);
  });

  const tableRows = sortedItems.map((item, index) => {
    const catShort = CATEGORY_MAP[item.category]?.shortLabel || item.category;
    return [
      (index + 1).toString(),
      item.severity,
      catShort,
      `${item.title}\n\n${item.summary}`,
      item.source,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Severidad', 'Categoría', 'Incidente / Análisis Técnico', 'Fuente']],
    body: tableRows,
    headStyles: {
      fillColor: primaryColor as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontSize: 7.5 },
      1: { cellWidth: 20, halign: 'center', fontSize: 7.5, fontStyle: 'bold' },
      2: { cellWidth: 28, fontSize: 7.5 },
      3: { cellWidth: 'auto', fontSize: 7.5 },
      4: { cellWidth: 24, fontSize: 7.5, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Unidad de Coordinación de Ciberseguridad • ${dateStr}`, margin, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 22, pageHeight - 7);
  }

  const fileName = `Informe_Ejecutivo_Ciber_${new Date().toISOString().substring(0, 10)}.pdf`;
  return { doc, fileName };
}

export function exportExecutiveDashboardReport(
  items: NewsItem[],
  briefing: DailyBriefing | null,
  options: PdfExportOptions
) {
  const { doc, fileName } = buildExecutiveDashboardDoc(items, briefing, options);
  doc.save(fileName);
}

// Generate PDF as in-memory Blob (for Google Drive upload, etc.)
export function generatePdfBlob(
  items: NewsItem[],
  briefing: DailyBriefing | null,
  options: PdfExportOptions
): { blob: Blob; fileName: string } {
  if (options.templateType === 'executive_dashboard') {
    const { doc, fileName } = buildExecutiveDashboardDoc(items, briefing, options);
    return { blob: doc.output('blob'), fileName };
  }
  const { doc, fileName } = buildOfficialOsintDoc(items, briefing, options);
  return { blob: doc.output('blob'), fileName };
}

// Main dispatcher
export function exportNewsToPdf(
  items: NewsItem[],
  briefing: DailyBriefing | null,
  options: PdfExportOptions
) {
  if (options.templateType === 'executive_dashboard') {
    return exportExecutiveDashboardReport(items, briefing, options);
  }
  // Default to Official OSINT Bulletin requested by user
  return exportOfficialOsintReport(items, briefing, options);
}
