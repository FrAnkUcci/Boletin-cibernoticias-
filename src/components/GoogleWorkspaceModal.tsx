import { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Table,
  HardDrive,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  UploadCloud,
  FilePlus,
  Layers,
  Check,
  Copy,
  FileDown,
  Shield,
  Eye,
  FileUp,
  Sparkles,
} from 'lucide-react';
import type { DailyBriefing, NewsItem, PdfTemplateType } from '../types';
import {
  googleSignIn,
  logout,
  initAuth,
  getAccessToken,
  setCachedAccessToken,
} from '../services/googleAuth';
import {
  listDriveFiles,
  uploadPdfToDrive,
  deleteDriveFile,
  createBulletinInGoogleDocs,
  createNewsSpreadsheet,
  type DriveFileItem,
} from '../services/workspaceService';
import { generatePdfBlob } from '../utils/pdfExport';
import type { User } from 'firebase/auth';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  allNews: NewsItem[];
  selectedIds: Set<string>;
  briefing: DailyBriefing | null;
  initialTab?: 'pdfUpload' | 'actions' | 'driveFiles';
}

export function GoogleWorkspaceModal({
  isOpen,
  onClose,
  allNews,
  selectedIds,
  briefing,
  initialTab = 'pdfUpload',
}: GoogleWorkspaceModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'pdfUpload' | 'actions' | 'driveFiles'>(initialTab);

  // Sub-mode in PDF Upload tab: 'generate' (compile on the fly) vs 'localFile' (drag & drop existing PDF)
  const [pdfUploadMode, setPdfUploadMode] = useState<'generate' | 'localFile'>('generate');

  // --- PDF GENERATE & UPLOAD CONFIGURATION STATE ---
  const [pdfTitle, setPdfTitle] = useState('NOVEDADES OSINT CIBER');
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplateType>('official_osint');
  const [pdfClassification, setPdfClassification] = useState('TLP:CLEAR');
  const [pdfShowEmblem, setPdfShowEmblem] = useState(true);
  const [pdfIncludeSummary, setPdfIncludeSummary] = useState(true);
  const [pdfIncludeMetrics, setPdfIncludeMetrics] = useState(true);
  const [pdfScope, setPdfScope] = useState<'all' | 'selected'>(selectedIds.size > 0 ? 'selected' : 'all');
  const [customFileName, setCustomFileName] = useState('');

  // Execution states for Generate & Upload
  const [uploadStep, setUploadStep] = useState<'idle' | 'generating' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const [uploadedDriveFile, setUploadedDriveFile] = useState<DriveFileItem | null>(null);
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // --- LOCAL PDF UPLOAD (DRAG & DROP / SELECTOR) STATE ---
  const [localPdfFile, setLocalPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingLocalPdf, setIsUploadingLocalPdf] = useState(false);
  const [localPdfResult, setLocalPdfResult] = useState<DriveFileItem | null>(null);
  const [copiedLocalLink, setCopiedLocalLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- GOOGLE DOCS & SHEETS ACTIONS ---
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [docResult, setDocResult] = useState<{ id: string; webViewLink: string; title: string } | null>(null);

  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [sheetResult, setSheetResult] = useState<{ id: string; webViewLink: string; title: string } | null>(null);

  // --- DRIVE FILES EXPLORER ---
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Confirmation dialog for deletion (MANDATORY per Workspace Skill)
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // General error banner
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset tab when reopened if specified
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (selectedIds.size > 0) setPdfScope('selected');
      setCopiedLink(false);
      setCopiedLocalLink(false);
    }
  }, [isOpen, initialTab, selectedIds.size]);

  // Check auth state on mount/open
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (authedUser, authedToken) => {
        setUser(authedUser);
        setToken(authedToken);
        setErrorMessage(null);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    getAccessToken().then((cached) => {
      if (cached) setToken(cached);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Auto-fetch Drive files when entering driveFiles tab or after auth
  useEffect(() => {
    if (isOpen && token && (activeTab === 'driveFiles' || driveFiles.length === 0)) {
      loadDriveFiles();
    }
  }, [isOpen, activeTab, token]);

  if (!isOpen) return null;

  // Selected news or all
  const itemsToExport = pdfScope === 'selected' && selectedIds.size > 0
    ? allNews.filter((n) => selectedIds.has(n.id))
    : allNews;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setCachedAccessToken(res.accessToken);
        loadDriveFiles();
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMessage(err?.message || 'No se pudo iniciar sesión con Google Workspace.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setDriveFiles([]);
      setDocResult(null);
      setSheetResult(null);
      setUploadedDriveFile(null);
      setUploadedBlob(null);
      setLocalPdfResult(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const loadDriveFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await listDriveFiles(25);
      setDriveFiles(files);
    } catch (err: any) {
      console.warn('Error loading files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // --- FLOW 1: GENERATE PDF & UPLOAD DIRECTLY TO GOOGLE DRIVE ---
  const handleGenerateAndUploadPdf = async () => {
    if (!token) return;
    if (itemsToExport.length === 0) {
      setErrorMessage('No hay noticias seleccionadas para generar el informe.');
      return;
    }

    setUploadStep('generating');
    setUploadStatusMessage('Compilando informe en PDF vectorial con justificación y elementos gráficos...');
    setErrorMessage(null);
    setUploadedDriveFile(null);
    setUploadedBlob(null);
    setCopiedLink(false);

    try {
      // Small tick for smooth animation feedback
      await new Promise((r) => setTimeout(r, 250));

      const todayIso = new Date().toISOString().slice(0, 10);
      const defaultFileName = pdfTemplate === 'executive_dashboard'
        ? `Informe_Ejecutivo_Ciber_${todayIso}.pdf`
        : `Novedades_OSINT_Ciber_${todayIso}.pdf`;

      const finalFileName = customFileName.trim()
        ? (customFileName.trim().toLowerCase().endsWith('.pdf') ? customFileName.trim() : `${customFileName.trim()}.pdf`)
        : defaultFileName;

      const { blob } = generatePdfBlob(itemsToExport, briefing, {
        title: pdfTitle || 'NOVEDADES OSINT CIBER',
        organization: 'Unidad de Coordinación de Ciberseguridad',
        classification: pdfClassification,
        templateType: pdfTemplate,
        showGuardiaCivilEmblem: pdfShowEmblem,
        includeExecutiveSummary: pdfIncludeSummary,
        includeMetrics: pdfIncludeMetrics,
        includeActionList: false,
        selectedNewsOnly: pdfScope === 'selected',
      });

      setUploadedBlob(blob);
      setUploadStep('uploading');
      setUploadStatusMessage('Subiendo archivo PDF directamente a tu almacenamiento de Google Drive...');

      const description = `Boletín de Ciberseguridad (${pdfClassification}) generado el ${new Date().toLocaleDateString('es-ES')} con ${itemsToExport.length} artículos analizados.`;
      const uploadedItem = await uploadPdfToDrive(blob, finalFileName, description);

      setUploadedDriveFile(uploadedItem);
      setUploadStep('success');
      setUploadStatusMessage('¡Informe PDF subido con éxito a tu unidad de Google Drive!');

      // Instantly prepend to driveFiles list
      setDriveFiles((prev) => [uploadedItem, ...prev.filter((f) => f.id !== uploadedItem.id)]);
    } catch (err: any) {
      console.error('Error generating and uploading PDF to Drive:', err);
      setUploadStep('error');
      setErrorMessage(err?.message || 'Error al generar o subir el informe PDF a Google Drive.');
    }
  };

  // --- FLOW 2: LOCAL PDF FILE UPLOAD (DRAG & DROP / SELECTOR) ---
  const handleLocalFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Solo se permiten archivos en formato PDF (.pdf).');
      return;
    }
    setLocalPdfFile(file);
    setErrorMessage(null);
    setLocalPdfResult(null);
    setCopiedLocalLink(false);
  };

  const handleUploadLocalPdf = async () => {
    if (!token || !localPdfFile) return;
    setIsUploadingLocalPdf(true);
    setErrorMessage(null);
    setLocalPdfResult(null);
    setCopiedLocalLink(false);

    try {
      const description = `Archivo PDF cargado manualmente desde estación de trabajo (${new Date().toLocaleDateString('es-ES')}).`;
      const uploadedItem = await uploadPdfToDrive(localPdfFile, localPdfFile.name, description);

      setLocalPdfResult(uploadedItem);
      setLocalPdfFile(null);
      // Prepend to drive files
      setDriveFiles((prev) => [uploadedItem, ...prev.filter((f) => f.id !== uploadedItem.id)]);
    } catch (err: any) {
      console.error('Error uploading local PDF to Drive:', err);
      setErrorMessage(err?.message || 'Error al subir el archivo PDF local a Google Drive.');
    } finally {
      setIsUploadingLocalPdf(false);
    }
  };

  // Copy Drive URL to clipboard
  const handleCopyLink = (url?: string, isLocal = false) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      if (isLocal) {
        setCopiedLocalLink(true);
        setTimeout(() => setCopiedLocalLink(false), 2500);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    });
  };

  // Download local copy of the compiled Blob
  const handleDownloadBlobCopy = () => {
    if (!uploadedBlob || !uploadedDriveFile) return;
    const downloadUrl = URL.createObjectURL(uploadedBlob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = uploadedDriveFile.name || 'informe_ciberseguridad.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  // --- DOCS & SHEETS ACTIONS ---
  const handleExportDocs = async () => {
    if (!token) return;
    setIsCreatingDoc(true);
    setErrorMessage(null);
    try {
      const todayStr = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const res = await createBulletinInGoogleDocs('NOVEDADES OSINT CIBER', todayStr, itemsToExport, briefing);
      setDocResult({
        id: res.id,
        webViewLink: res.webViewLink,
        title: `NOVEDADES OSINT CIBER - ${todayStr}`,
      });
      loadDriveFiles();
    } catch (err: any) {
      console.error('Error creating Google Doc:', err);
      setErrorMessage(err?.message || 'Error al crear el documento en Google Docs.');
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const handleExportSheets = async () => {
    if (!token) return;
    setIsCreatingSheet(true);
    setErrorMessage(null);
    try {
      const res = await createNewsSpreadsheet('NOVEDADES OSINT CIBER', itemsToExport);
      setSheetResult({
        id: res.id,
        webViewLink: res.webViewLink,
        title: `Registro CTI - ${new Date().toISOString().slice(0, 10)}`,
      });
      loadDriveFiles();
    } catch (err: any) {
      console.error('Error creating Google Sheet:', err);
      setErrorMessage(err?.message || 'Error al crear la hoja de cálculo en Google Sheets.');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Delete file with confirmation dialog
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(fileToDelete.id);
      setDriveFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setFileToDelete(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      setErrorMessage(err?.message || 'No se pudo eliminar el archivo.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      id="modal-google-workspace-root"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-y-auto font-mono select-none"
    >
      <div
        id="modal-google-workspace-container"
        className="bg-[#0F172A] border border-[#1E293B] w-full max-w-3xl shadow-2xl overflow-hidden my-6 rounded-xs"
      >
        {/* Header */}
        <div
          id="workspace-modal-header"
          className="p-4 bg-[#0A0C10] border-b border-[#1E293B] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {/* Tri-Icon Badge */}
            <div className="flex items-center -space-x-1 p-1 bg-[#1E293B]/70 rounded-md border border-[#334155]">
              <div
                className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center"
                title="Google Drive"
              >
                <HardDrive className="w-3.5 h-3.5" />
              </div>
              <div
                className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center"
                title="Google Docs"
              >
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div
                className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center"
                title="Google Sheets"
              >
                <Table className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
                  GOOGLE WORKSPACE // CARGA DIRECTA A GOOGLE DRIVE
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold">
                  DRIVE v3 API
                </span>
              </div>
              <p className="text-[10px] text-[#64748B]">
                Almacenamiento personal en Google Drive • Informes PDF oficiales • Google Docs • Google Sheets
              </p>
            </div>
          </div>

          <button
            id="btn-close-workspace-modal"
            type="button"
            onClick={onClose}
            className="p-1 text-[#64748B] hover:text-[#E2E8F0] hover:bg-[#1E293B] transition"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            id="workspace-error-banner"
            className="px-4 py-2 bg-red-950/40 border-b border-red-500/40 flex items-center justify-between text-xs text-red-300"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Auth Bar */}
        <div
          id="workspace-auth-bar"
          className="p-3 bg-[#0A0C10]/90 border-b border-[#1E293B] flex items-center justify-between"
        >
          {user && token ? (
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-7 h-7 rounded-full border border-emerald-500/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-500/40">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">
                      {user.displayName || user.email}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Sesión activa" />
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">CONECTADO</span>
                  </div>
                  <p className="text-[10px] text-[#64748B]">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#64748B] hidden sm:inline">
                  Espacio: <strong className="text-slate-300">Google Drive Personal</strong>
                </span>
                <button
                  id="btn-workspace-signout"
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-500/30 transition rounded-xs"
                  title="Desconectar cuenta de Google"
                >
                  <LogOut className="w-3 h-3" />
                  <span>DESCONECTAR</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div>
                <p className="text-xs font-bold text-slate-200">
                  Conexión con Google Drive no iniciada
                </p>
                <p className="text-[10px] text-[#64748B]">
                  Inicia sesión para subir directamente los informes PDF generados a tu cuenta personal de Google Drive
                </p>
              </div>

              {/* Official Google Sign In Button */}
              <button
                id="btn-workspace-signin"
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold font-sans rounded-xs shadow-md transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isSigningIn ? 'CONECTANDO...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        {user && token && (
          <div
            id="workspace-modal-tabs"
            className="flex border-b border-[#1E293B] bg-[#0A0C10]/70 text-[11px] font-bold"
          >
            <button
              id="workspace-tab-pdf-upload"
              type="button"
              onClick={() => setActiveTab('pdfUpload')}
              className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 transition border-r border-[#1E293B] ${
                activeTab === 'pdfUpload'
                  ? 'text-amber-300 border-b-2 border-amber-400 bg-[#0F172A]'
                  : 'text-[#64748B] hover:text-slate-300'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-amber-400" />
              <span>CARGA DE PDF A DRIVE</span>
              <span className="px-1 py-0.2 rounded text-[8px] bg-amber-950/60 text-amber-300 border border-amber-500/40">
                DIRECTO
              </span>
            </button>

            <button
              id="workspace-tab-actions"
              type="button"
              onClick={() => setActiveTab('actions')}
              className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 transition border-r border-[#1E293B] ${
                activeTab === 'actions'
                  ? 'text-[#38BDF8] border-b-2 border-[#38BDF8] bg-[#0F172A]'
                  : 'text-[#64748B] hover:text-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>DOCS Y SHEETS</span>
            </button>

            <button
              id="workspace-tab-drive-files"
              type="button"
              onClick={() => setActiveTab('driveFiles')}
              className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 transition ${
                activeTab === 'driveFiles'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-[#0F172A]'
                  : 'text-[#64748B] hover:text-slate-300'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>EXPLORADOR DRIVE</span>
              {driveFiles.length > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono">
                  {driveFiles.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
          {!user || !token ? (
            /* Unauthenticated Prompt */
            <div
              id="workspace-auth-prompt-card"
              className="p-6 text-center space-y-3 bg-[#0A0C10] border border-[#1E293B] rounded-xs"
            >
              <div className="w-14 h-14 rounded-full bg-amber-950/40 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <HardDrive className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                Almacenamiento Personal en Google Drive
              </h4>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
                Permite la carga directa e instantánea de los informes PDF generados (con escudo oficial, justificación de texto bilateral y traducción al español) en tu propia unidad de Google Drive, además de crear documentos en Google Docs y hojas de cálculo en Google Sheets.
              </p>

              <div className="p-3 bg-[#0F172A] border border-[#1E293B] max-w-md mx-auto text-left text-[11px] text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Carga de informes PDF vectoriales a Google Drive</span>
                </div>
                <div className="flex items-center gap-2 text-blue-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Sincronización con Google Docs estructurado</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Libros con tablas de análisis CTI en Google Sheets</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-connect-workspace-main"
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xs transition shadow-lg shadow-amber-950/50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isSigningIn ? 'CONECTANDO CON GOOGLE...' : 'CONECTAR Y HABILITAR GOOGLE DRIVE'}</span>
                </button>
              </div>
            </div>
          ) : activeTab === 'pdfUpload' ? (
            /* ============================================================ */
            /* TAB 1: CARGA DIRECTA DE INFORMES PDF A GOOGLE DRIVE         */
            /* ============================================================ */
            <div id="tab-pdf-upload-content" className="space-y-4">
              
              {/* Scope & Mode Selector */}
              <div className="flex items-center justify-between bg-[#0A0C10] p-2 border border-[#1E293B] rounded-xs flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[#64748B] uppercase font-bold text-[10px]">
                    MODO_DE_CARGA:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      id="btn-mode-generate"
                      type="button"
                      onClick={() => setPdfUploadMode('generate')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-xs transition flex items-center gap-1 ${
                        pdfUploadMode === 'generate'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>GENERAR Y SUBIR INFORME</span>
                    </button>
                    <button
                      id="btn-mode-localfile"
                      type="button"
                      onClick={() => setPdfUploadMode('localFile')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-xs transition flex items-center gap-1 ${
                        pdfUploadMode === 'localFile'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <FileUp className="w-3 h-3" />
                      <span>SUBIR PDF LOCAL</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-[#64748B]">ALCANCE:</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-bold">
                    {itemsToExport.length} ARTÍCULOS ({pdfScope === 'selected' && selectedIds.size > 0 ? 'SELECCIÓN' : 'TODOS'})
                  </span>
                </div>
              </div>

              {pdfUploadMode === 'generate' ? (
                /* --- MODE A: COMPILE AND UPLOAD PDF ON THE FLY --- */
                <div id="panel-generate-and-upload" className="space-y-3">
                  
                  {/* Configuration Grid */}
                  <div className="p-3.5 bg-[#0A0C10] border border-[#1E293B] rounded-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
                      <div className="flex items-center gap-2 text-slate-100 font-bold text-xs">
                        <UploadCloud className="w-4 h-4 text-amber-400" />
                        <span>PARÁMETROS DEL INFORME PDF PARA GOOGLE DRIVE</span>
                      </div>
                      <span className="text-[10px] text-[#64748B] font-mono">
                        DESTINO: MI UNIDAD (DRIVE)
                      </span>
                    </div>

                    {/* Plantilla y Clasificación */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">
                          Plantilla de Diseño:
                        </label>
                        <select
                          id="select-pdf-template"
                          value={pdfTemplate}
                          onChange={(e) => setPdfTemplate(e.target.value as PdfTemplateType)}
                          className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-400 focus:outline-none"
                        >
                          <option value="official_osint">
                            Boletín Oficial CTI (Guardia Civil / Coordinación)
                          </option>
                          <option value="executive_dashboard">
                            Resumen Ejecutivo Dashboard CTI
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">
                          Clasificación de Seguridad:
                        </label>
                        <select
                          id="select-pdf-classification"
                          value={pdfClassification}
                          onChange={(e) => setPdfClassification(e.target.value)}
                          className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-400 focus:outline-none"
                        >
                          <option value="TLP:CLEAR">TLP:CLEAR (Público / Difusión abierta)</option>
                          <option value="TLP:GREEN">TLP:GREEN (Comunidad / Sector CTI)</option>
                          <option value="TLP:AMBER">TLP:AMBER (Restringido a la organización)</option>
                          <option value="TLP:RED">TLP:RED (Estrictamente confidencial)</option>
                        </select>
                      </div>
                    </div>

                    {/* Título y Nombre de Archivo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">
                          Encabezado del Documento:
                        </label>
                        <input
                          id="input-pdf-title"
                          type="text"
                          value={pdfTitle}
                          onChange={(e) => setPdfTitle(e.target.value)}
                          placeholder="NOVEDADES OSINT CIBER"
                          className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">
                          Nombre del Archivo en Drive:
                        </label>
                        <input
                          id="input-pdf-filename"
                          type="text"
                          value={customFileName}
                          onChange={(e) => setCustomFileName(e.target.value)}
                          placeholder={`Novedades_OSINT_Ciber_${new Date().toISOString().slice(0, 10)}.pdf`}
                          className="w-full bg-[#0F172A] border border-[#334155] px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Toggles de opciones */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#1E293B]">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                        <input
                          id="check-pdf-emblem"
                          type="checkbox"
                          checked={pdfShowEmblem}
                          onChange={(e) => setPdfShowEmblem(e.target.checked)}
                          className="rounded border-[#334155] bg-[#0F172A] text-amber-500 focus:ring-0"
                        />
                        <span>Escudo oficial Guardia Civil</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                        <input
                          id="check-pdf-summary"
                          type="checkbox"
                          checked={pdfIncludeSummary}
                          onChange={(e) => setPdfIncludeSummary(e.target.checked)}
                          className="rounded border-[#334155] bg-[#0F172A] text-amber-500 focus:ring-0"
                        />
                        <span>Resumen ejecutivo diario</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                        <input
                          id="check-pdf-metrics"
                          type="checkbox"
                          checked={pdfIncludeMetrics}
                          onChange={(e) => setPdfIncludeMetrics(e.target.checked)}
                          className="rounded border-[#334155] bg-[#0F172A] text-amber-500 focus:ring-0"
                        />
                        <span>Métricas y gráficos CTI</span>
                      </label>
                    </div>

                    {/* Scope Switcher */}
                    <div className="flex items-center justify-between text-[11px] text-slate-300 bg-[#0F172A] p-2 border border-[#1E293B]">
                      <span>Contenido a incluir en el informe:</span>
                      <div className="flex items-center gap-2">
                        <button
                          id="btn-scope-all"
                          type="button"
                          onClick={() => setPdfScope('all')}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-xs ${
                            pdfScope === 'all'
                              ? 'bg-blue-600 text-white'
                              : 'text-[#64748B] hover:text-slate-300'
                          }`}
                        >
                          Todas ({allNews.length})
                        </button>
                        <button
                          id="btn-scope-selected"
                          type="button"
                          onClick={() => setPdfScope('selected')}
                          disabled={selectedIds.size === 0}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-xs ${
                            pdfScope === 'selected'
                              ? 'bg-blue-600 text-white'
                              : 'text-[#64748B] hover:text-slate-300'
                          } disabled:opacity-40`}
                        >
                          Seleccionadas ({selectedIds.size})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Upload Action Button & Status */}
                  <div className="space-y-2">
                    <button
                      id="btn-generate-upload-pdf-drive"
                      type="button"
                      onClick={handleGenerateAndUploadPdf}
                      disabled={uploadStep === 'generating' || uploadStep === 'uploading' || itemsToExport.length === 0}
                      className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition rounded-xs flex items-center justify-center gap-2 shadow-md shadow-amber-950/40 disabled:opacity-50"
                    >
                      {uploadStep === 'generating' || uploadStep === 'uploading' ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>{uploadStatusMessage || 'PROCESANDO INFORME...'}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>GENERAR INFORME Y SUBIR DIRECTAMENTE A GOOGLE DRIVE</span>
                        </>
                      )}
                    </button>

                    {/* Dynamic Progress / Step Feedback */}
                    {(uploadStep === 'generating' || uploadStep === 'uploading') && (
                      <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xs flex items-center gap-2 text-[11px] text-amber-200 font-mono">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                        <span>{uploadStatusMessage}</span>
                      </div>
                    )}

                    {/* Success Card */}
                    {uploadStep === 'success' && uploadedDriveFile && (
                      <div
                        id="card-drive-upload-success"
                        className="p-3.5 bg-[#0A0C10] border-2 border-emerald-500/50 rounded-xs space-y-2.5 shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>¡INFORME PDF ALMACENADO CORRECTAMENTE EN TU GOOGLE DRIVE!</span>
                          </div>
                          <span className="text-[10px] text-emerald-300 font-mono px-1.5 py-0.5 bg-emerald-950/50 border border-emerald-500/30">
                            {uploadedBlob ? `${Math.round(uploadedBlob.size / 1024)} KB` : 'GUARDADO'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-[#0F172A] border border-[#1E293B] flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-slate-100 font-bold truncate">
                              {uploadedDriveFile.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                            ID: {uploadedDriveFile.id.slice(0, 8)}...
                          </span>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            {uploadedDriveFile.webViewLink && (
                              <a
                                id="link-open-in-google-drive"
                                href={uploadedDriveFile.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-xs transition shadow-sm"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>ABRIR EN GOOGLE DRIVE</span>
                              </a>
                            )}

                            {uploadedDriveFile.webViewLink && (
                              <button
                                id="btn-copy-drive-link"
                                type="button"
                                onClick={() => handleCopyLink(uploadedDriveFile.webViewLink)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-slate-200 text-[11px] font-bold rounded-xs transition border border-[#334155]"
                              >
                                {copiedLink ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">ENLACE COPIADO</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>COPIAR ENLACE</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {uploadedBlob && (
                            <button
                              id="btn-download-blob-copy"
                              type="button"
                              onClick={handleDownloadBlobCopy}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-[#38BDF8] hover:text-white transition"
                              title="Descargar una copia de seguridad en tu disco local"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>Descargar copia local</span>
                            </button>
                          )}
                        </div>

                        <p className="text-[10px] text-[#64748B] pt-1">
                          El archivo se encuentra sincronizado en tu cuenta y disponible en la pestaña <strong>EXPLORADOR DRIVE</strong>.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* --- MODE B: UPLOAD EXISTING LOCAL PDF VIA DRAG & DROP OR SELECTOR --- */
                <div id="panel-upload-local-pdf" className="space-y-3">
                  <div
                    id="dropzone-local-pdf"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) handleLocalFileSelect(droppedFile);
                    }}
                    className={`p-6 border-2 border-dashed rounded-xs text-center transition cursor-pointer ${
                      isDragging
                        ? 'border-blue-400 bg-blue-950/40'
                        : localPdfFile
                        ? 'border-emerald-500/60 bg-emerald-950/20'
                        : 'border-[#334155] bg-[#0A0C10] hover:border-blue-500/50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLocalFileSelect(file);
                      }}
                    />

                    <div className="w-12 h-12 rounded-full bg-blue-950/60 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 mb-2">
                      <FileUp className="w-6 h-6" />
                    </div>

                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      {localPdfFile ? 'ARCHIVO SELECCIONADO PARA SUBIR' : 'ARRASTRA Y SUELTA UN INFORME PDF AQUÍ'}
                    </h4>

                    <p className="text-[11px] text-[#64748B] mt-1">
                      O haz clic para seleccionar un documento PDF desde tu ordenador o estación de trabajo
                    </p>

                    {localPdfFile && (
                      <div className="mt-3 inline-flex items-center gap-2 p-2 bg-[#0F172A] border border-emerald-500/40 text-emerald-300 text-xs font-mono rounded-xs">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold">{localPdfFile.name}</span>
                        <span className="text-[#64748B]">({Math.round(localPdfFile.size / 1024)} KB)</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Local PDF Action Button */}
                  {localPdfFile && (
                    <button
                      id="btn-upload-local-pdf-drive"
                      type="button"
                      onClick={handleUploadLocalPdf}
                      disabled={isUploadingLocalPdf}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition rounded-xs flex items-center justify-center gap-2 shadow-md shadow-blue-950/40 disabled:opacity-50"
                    >
                      {isUploadingLocalPdf ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>SUBIENDO ARCHIVO A GOOGLE DRIVE...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>SUBIR &quot;{localPdfFile.name}&quot; A GOOGLE DRIVE</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Local PDF Success Card */}
                  {localPdfResult && (
                    <div className="p-3.5 bg-[#0A0C10] border-2 border-emerald-500/50 rounded-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>¡ARCHIVO PDF SUBIDO CORRECTAMENTE A GOOGLE DRIVE!</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#0F172A] border border-[#1E293B] flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="text-slate-100 font-bold truncate">
                            {localPdfResult.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {localPdfResult.webViewLink && (
                          <a
                            href={localPdfResult.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-xs transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>VER EN GOOGLE DRIVE</span>
                          </a>
                        )}

                        {localPdfResult.webViewLink && (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(localPdfResult.webViewLink, true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-slate-200 text-[11px] font-bold rounded-xs transition border border-[#334155]"
                          >
                            {copiedLocalLink ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">ENLACE COPIADO</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>COPIAR ENLACE</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          ) : activeTab === 'actions' ? (
            /* ============================================================ */
            /* TAB 2: SINCRONIZACIÓN GOOGLE DOCS & GOOGLE SHEETS            */
            /* ============================================================ */
            <div id="tab-actions-content" className="space-y-4">
              
              {/* Telemetry pill */}
              <div className="p-2.5 bg-[#0A0C10] border border-[#1E293B] flex items-center justify-between text-xs">
                <span className="text-[#64748B] uppercase font-bold text-[10px]">
                  NOTICIAS_A_EXPORTAR:
                </span>
                <span className="font-bold text-emerald-400">
                  {itemsToExport.length} ARTÍCULOS ({selectedIds.size > 0 ? 'SELECCIÓN MANUAL' : 'TODAS'})
                </span>
              </div>

              {/* Action 1: Google Docs */}
              <div
                id="card-action-google-docs"
                className="p-3.5 bg-[#0A0C10] border border-[#1E293B] hover:border-blue-500/50 transition rounded-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-950/60 border border-blue-500/30 text-blue-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs">
                        1. EXPORTAR A GOOGLE DOCS
                      </h4>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        Crea un documento en Google Docs estructurado en 6 secciones oficiales (Eventos, Noticias, Vulnerabilidades, Ransomware, Filtraciones, BOE) con enlaces hipertexto listos para colaboración de analistas.
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-export-google-docs"
                    type="button"
                    onClick={handleExportDocs}
                    disabled={isCreatingDoc}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold uppercase shrink-0 transition disabled:opacity-50 shadow-sm"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>{isCreatingDoc ? 'CREANDO DOC...' : 'CREAR EN DOCS'}</span>
                  </button>
                </div>

                {docResult && (
                  <div className="mt-3 p-2.5 bg-blue-950/30 border border-blue-500/40 flex items-center justify-between rounded-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-slate-200 truncate">
                        Documento creado: <strong>{docResult.title}</strong>
                      </span>
                    </div>
                    <a
                      href={docResult.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 underline shrink-0 ml-2"
                    >
                      <span>ABRIR EN DOCS</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Action 2: Google Sheets */}
              <div
                id="card-action-google-sheets"
                className="p-3.5 bg-[#0A0C10] border border-[#1E293B] hover:border-emerald-500/50 transition rounded-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 shrink-0">
                      <Table className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs">
                        2. EXPORTAR A GOOGLE SHEETS
                      </h4>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        Genera un libro en Google Sheets con 3 pestañas tabulares: <code className="text-emerald-300">Noticias y Alertas CTI</code>, <code className="text-purple-300">Ataques Ransomware</code> y <code className="text-amber-300">Vulnerabilidades CVE</code> formateadas para SOC.
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-export-google-sheets"
                    type="button"
                    onClick={handleExportSheets}
                    disabled={isCreatingSheet}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase shrink-0 transition disabled:opacity-50 shadow-sm"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>{isCreatingSheet ? 'CREANDO HOJA...' : 'CREAR EN SHEETS'}</span>
                  </button>
                </div>

                {sheetResult && (
                  <div className="mt-3 p-2.5 bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between rounded-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-slate-200 truncate">
                        Hoja creada: <strong>{sheetResult.title}</strong>
                      </span>
                    </div>
                    <a
                      href={sheetResult.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline shrink-0 ml-2"
                    >
                      <span>ABRIR EN SHEETS</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* ============================================================ */
            /* TAB 3: EXPLORADOR DE ARCHIVOS EN GOOGLE DRIVE                */
            /* ============================================================ */
            <div id="tab-drive-explorer-content" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#64748B]">
                  ARCHIVOS RECIENTES EN TU GOOGLE DRIVE ({driveFiles.length})
                </span>
                <button
                  id="btn-refresh-drive-files"
                  type="button"
                  onClick={loadDriveFiles}
                  disabled={isLoadingFiles}
                  className="inline-flex items-center gap-1 text-[11px] text-[#38BDF8] hover:text-white transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  <span>ACTUALIZAR LISTA</span>
                </button>
              </div>

              {isLoadingFiles ? (
                <div className="p-8 text-center text-[#64748B] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#38BDF8]" />
                  <span>Consultando archivos en Google Drive...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="p-6 text-center text-[#64748B] bg-[#0A0C10] border border-[#1E293B]">
                  <p>No se encontraron documentos o informes PDF recientes en tu Google Drive.</p>
                  <button
                    id="btn-goto-pdf-upload"
                    type="button"
                    onClick={() => setActiveTab('pdfUpload')}
                    className="mt-2 text-xs text-amber-400 underline font-bold"
                  >
                    Subir primer informe PDF a Google Drive ahora
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#1E293B] border border-[#1E293B] bg-[#0A0C10] max-h-[45vh] overflow-y-auto">
                  {driveFiles.map((file) => {
                    const isDoc = file.mimeType.includes('document');
                    const isSheet = file.mimeType.includes('spreadsheet');
                    const isPdf = file.mimeType.includes('pdf');

                    return (
                      <div
                        key={file.id}
                        id={`drive-file-${file.id}`}
                        className="p-2.5 flex items-center justify-between hover:bg-[#1E293B]/40 transition gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="shrink-0">
                            {isDoc ? (
                              <FileText className="w-4 h-4 text-blue-400" />
                            ) : isSheet ? (
                              <Table className="w-4 h-4 text-emerald-400" />
                            ) : isPdf ? (
                              <FileText className="w-4 h-4 text-amber-400" />
                            ) : (
                              <HardDrive className="w-4 h-4 text-[#64748B]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-slate-200 truncate font-semibold">
                              {file.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                              <span>{file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('es-ES') : ''}</span>
                              {file.size && <span>• {Math.round(parseInt(file.size, 10) / 1024)} KB</span>}
                              <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-[#1E293B] text-slate-400">
                                {isPdf ? 'PDF' : isDoc ? 'DOCS' : isSheet ? 'SHEETS' : 'ARCHIVO'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-[#1E293B] hover:bg-[#334155] text-amber-300 text-[10px] font-bold rounded-xs flex items-center gap-1 transition"
                              title="Abrir en Google Drive"
                            >
                              <span>ABRIR</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          {/* Delete button triggers explicit confirmation dialog */}
                          <button
                            type="button"
                            onClick={() => setFileToDelete(file)}
                            className="p-1 text-[#64748B] hover:text-red-400 transition"
                            title="Eliminar archivo de Google Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          id="workspace-modal-footer"
          className="p-3 bg-[#0A0C10] border-t border-[#1E293B] flex items-center justify-between flex-wrap gap-2"
        >
          <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
            <span className="inline-flex items-center gap-1 text-amber-400">
              <HardDrive className="w-3 h-3" />
              <span>Google Drive API v3</span>
            </span>
            <span>•</span>
            <span className="text-slate-400">Almacenamiento personal en la nube</span>
          </div>

          <button
            id="btn-footer-close-workspace"
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold uppercase text-[#64748B] hover:text-white border border-[#1E293B] hover:bg-[#1E293B] transition rounded-xs"
          >
            CERRAR
          </button>
        </div>

      </div>

      {/* MANDATORY USER CONFIRMATION MODAL FOR DESTRUCTIVE OPERATIONS */}
      {fileToDelete && (
        <div
          id="modal-confirm-delete-drive-file"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs font-mono"
        >
          <div className="bg-[#0F172A] border-2 border-red-500/60 p-4 max-w-md w-full shadow-2xl space-y-3 rounded-xs">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm uppercase tracking-wider">
                CONFIRMAR ELIMINACIÓN EN GOOGLE DRIVE
              </h4>
            </div>

            <p className="text-xs text-slate-300">
              ¿Estás seguro de que deseas eliminar permanentemente de tu Google Drive el siguiente archivo?
            </p>

            <div className="p-2.5 bg-[#0A0C10] border border-[#1E293B] text-xs text-slate-100 font-bold truncate">
              {fileToDelete.name}
            </div>

            <p className="text-[10px] text-[#64748B]">
              Esta acción no se puede deshacer y modificará el almacenamiento de tu cuenta personal de Google Drive.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                id="btn-cancel-delete-file"
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs text-[#64748B] hover:text-white border border-[#1E293B]"
              >
                CANCELAR
              </button>
              <button
                id="btn-confirm-delete-file"
                type="button"
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500"
              >
                {isDeleting ? 'ELIMINANDO...' : 'SÍ, ELIMINAR ARCHIVO'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
