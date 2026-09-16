import { getAccessToken } from './googleAuth';
import type { DailyBriefing, NewsItem } from '../types';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  iconLink?: string;
  size?: string;
}

/**
 * Helper to ensure valid access token exists
 */
async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED: Debes iniciar sesión con tu cuenta de Google Workspace para continuar.');
  }
  return token;
}

// =========================================================================
// 1. GOOGLE DRIVE API
// =========================================================================

/**
 * List files from Google Drive created by or accessible to this app
 */
export async function listDriveFiles(limit: number = 20): Promise<DriveFileItem[]> {
  const token = await requireAccessToken();
  const query = "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/pdf')";
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=${limit}&fields=files(id,name,mimeType,webViewLink,createdTime,modifiedTime,iconLink,size)`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error al consultar Google Drive (${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Upload a PDF Blob directly to Google Drive
 */
export async function uploadPdfToDrive(
  pdfBlob: Blob,
  fileName: string,
  description: string = 'Boletín Oficial de Ciberseguridad - Novedades OSINT Ciber'
): Promise<DriveFileItem> {
  const token = await requireAccessToken();

  const metadata = {
    name: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
    mimeType: 'application/pdf',
    description,
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', pdfBlob, metadata.name);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime,modifiedTime,size,iconLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error al subir archivo a Google Drive (${response.status})`);
  }

  return await response.json();
}

/**
 * Delete a file in Google Drive (Destructive operation)
 * Must be preceded by user confirmation dialog in UI!
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await requireAccessToken();

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error al eliminar archivo de Drive (${response.status})`);
  }
}

// =========================================================================
// 2. GOOGLE DOCS API
// =========================================================================

/**
 * Creates an official Google Doc containing the formatted "NOVEDADES OSINT CIBER" bulletin
 */
export async function createBulletinInGoogleDocs(
  title: string,
  dateStr: string,
  items: NewsItem[],
  briefing: DailyBriefing | null
): Promise<{ id: string; webViewLink: string }> {
  const token = await requireAccessToken();

  // 1. Create empty document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `${title} - ${dateStr}`,
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error al crear Google Doc (${createRes.status})`);
  }

  const docData = await createRes.json();
  const documentId = docData.documentId;

  // 2. Classify items into sections
  const eventos = items.filter((i) => i.category === 'Eventos España');
  const vulnerabilidades = items.filter((i) => i.category === 'Vulnerabilidades' || i.cves.length > 0);
  const ransomware = items.filter((i) => i.category === 'Ransomware');
  const boe = items.filter((i) => i.category === 'BOE y DOUE Normativa');
  const filtraciones = items.filter((i) => /filtraci[oó]n|brecha|dark web/i.test(`${i.title} ${i.summary}`) && !i.cves.length);
  const noticias = items.filter((i) => 
    !eventos.includes(i) &&
    !vulnerabilidades.includes(i) &&
    !ransomware.includes(i) &&
    !boe.includes(i) &&
    !filtraciones.includes(i)
  );

  // 3. Build text body
  let docContent = `${title}\n${dateStr}\n\n`;

  // Briefing if available
  if (briefing?.headline) {
    docContent += `RESUMEN EJECUTIVO (ALERTA: ${briefing.alertLevel || 'ELEVADA'})\n`;
    docContent += `${briefing.headline}\n${briefing.summary}\n\n`;
  }

  // Helper section builder
  const appendSection = (sectionName: string, sectionItems: NewsItem[], emptyText: string = '• Nada.') => {
    docContent += `${sectionName}\n`;
    if (sectionItems.length === 0) {
      docContent += `${emptyText}\n\n`;
      return;
    }

    sectionItems.forEach((item) => {
      docContent += `• ${item.title}\n`;
      if (item.summary) {
        docContent += `  o ${item.summary.trim()}\n`;
      }
      if (item.url) {
        docContent += `  o Fuente: ${item.url}\n`;
      }
    });
    docContent += '\n';
  };

  appendSection('EVENTOS:', eventos);
  appendSection('NOTICIAS:', noticias);
  appendSection('VULNERABILIDAD:', vulnerabilidades);
  appendSection('RAMSOWARE:', ransomware);
  appendSection('FILTRACIONES:', filtraciones);
  appendSection('BOE y BOEU:', boe);

  // 4. BatchUpdate insert text
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: docContent,
          },
        },
      ],
    }),
  });

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    console.warn('Google Doc batchUpdate notice:', errData);
  }

  const webViewLink = `https://docs.google.com/document/d/${documentId}/edit`;
  return { id: documentId, webViewLink };
}

// =========================================================================
// 3. GOOGLE SHEETS API
// =========================================================================

/**
 * Creates a comprehensive Google Spreadsheet for incident and threat tracking
 */
export async function createNewsSpreadsheet(
  title: string,
  items: NewsItem[]
): Promise<{ id: string; webViewLink: string }> {
  const token = await requireAccessToken();

  // 1. Create spreadsheet with 3 tabs
  const createPayload = {
    properties: {
      title: `${title} - Registro CTI (${new Date().toISOString().slice(0, 10)})`,
    },
    sheets: [
      {
        properties: {
          title: 'Noticias y Alertas CTI',
          gridProperties: { rowCount: Math.max(100, items.length + 10), columnCount: 9 },
        },
      },
      {
        properties: {
          title: 'Ataques Ransomware',
          gridProperties: { rowCount: 100, columnCount: 7 },
        },
      },
      {
        properties: {
          title: 'Vulnerabilidades CVE',
          gridProperties: { rowCount: 100, columnCount: 6 },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error al crear Google Sheet (${createRes.status})`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // 2. Prepare Rows for Tab 1: Noticias y Alertas CTI
  const tab1Headers = [
    '#',
    'Severidad',
    'Categoría',
    'Titular',
    'Fuente / Feed',
    'Fecha',
    'CVEs Detectados',
    'Resumen Inteligencia',
    'URL Original',
  ];

  const tab1Rows = items.map((item, idx) => [
    idx + 1,
    item.severity,
    item.category,
    item.title,
    item.source,
    item.publishedAt ? new Date(item.publishedAt).toLocaleString('es-ES') : '',
    item.cves.join(', '),
    item.summary || '',
    item.url || '',
  ]);

  // Tab 2: Ransomware
  const ransomwareItems = items.filter((i) => i.category === 'Ransomware' || /ransomware|secuestro/i.test(`${i.title} ${i.summary}`));
  const tab2Headers = ['#', 'Afectado / Organización', 'Grupo Criminal', 'Fecha Alerta', 'Detalles Exfiltración', 'Enlace Noticia'];
  const tab2Rows = ransomwareItems.map((item, idx) => [
    idx + 1,
    item.title.replace(/^Ciberataque\s+(a\s+la|al|a)\s+/i, '').trim(),
    (item.threatActors && item.threatActors[0]) || 'En investigación',
    item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : '',
    item.summary || '',
    item.url || '',
  ]);

  // Tab 3: Vulnerabilidades CVE
  const cveItems = items.filter((i) => i.category === 'Vulnerabilidades' || i.cves.length > 0);
  const tab3Headers = ['#', 'CVE Identificador', 'Severidad', 'Titular de Seguridad', 'Fuente', 'Enlace Asesoría'];
  const tab3Rows = cveItems.map((item, idx) => [
    idx + 1,
    item.cves.join(', ') || 'N/A',
    item.severity,
    item.title,
    item.source,
    item.url || '',
  ]);

  // 3. Batch Update Values in Sheets
  const updateData = [
    {
      range: "'Noticias y Alertas CTI'!A1:I" + (tab1Rows.length + 1),
      values: [tab1Headers, ...tab1Rows],
    },
    {
      range: "'Ataques Ransomware'!A1:F" + (tab2Rows.length + 1),
      values: [tab2Headers, ...tab2Rows],
    },
    {
      range: "'Vulnerabilidades CVE'!A1:F" + (tab3Rows.length + 1),
      values: [tab3Headers, ...tab3Rows],
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updateData,
    }),
  });

  const webViewLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { id: spreadsheetId, webViewLink };
}
