
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, AlertCircle, Loader2, Info, Calendar, Link, FileText, Plus, Trash2, 
  Lock, ShieldCheck, Database, Check, Copy, Search, Filter, ExternalLink, School, 
  Users, CheckCircle2, Clock, Phone, MessageSquare, AlertTriangle, ChevronRight, 
  Eye, RefreshCw, Send, CheckSquare, Sparkles, Layers, Sliders, Settings, CheckCircle
} from 'lucide-react';
import { updateRemoteConfig, syncRegistration } from '../services/api';
import { getDirectImageUrl, splitNameToTwoLines } from '../utils/ecert';
import { EventConfig, RegistrationsMap, Registration } from '../types';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: EventConfig;
  onSaveSuccess: (config: EventConfig) => void;
  registrations?: RegistrationsMap;
  onUpdateRegistration?: (regId: string, updatedData: any) => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ 
  isOpen, 
  onClose, 
  currentConfig, 
  onSaveSuccess, 
  registrations = {}, 
  onUpdateRegistration 
}) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'info' | 'kawalan' | 'dokumen' | 'jadual' | 'pautan' | 'ecert' | 'system'>('monitor');
  const [config, setConfig] = useState<EventConfig>(currentConfig);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Password protection state
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState(false);

  // E-Cert state
  const [activeEcertTab, setActiveEcertTab] = useState<string>('');
  const [isSavingEcert, setIsSavingEcert] = useState(false);
  const [ecertSaveSuccess, setEcertSaveSuccess] = useState<string | null>(null);
  const [previewLongName, setPreviewLongName] = useState<boolean>(true);

  // Monitor tab states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'SR' | 'SM'>('all');
  const [filterDocStatus, setFilterDocStatus] = useState<'all' | 'LENGKAP' | 'SEBAHAGIAN' | 'PERLU PEMBETULAN' | 'BELUM HANTAR'>('all');
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<'primary' | 'secondary'>('primary');
  
  // Quick Notes Editor states
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [statusDraft, setStatusDraft] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [savedNoteSuccessId, setSavedNoteSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(JSON.parse(JSON.stringify(currentConfig))); // Deep copy to avoid mutating original props
      if (currentConfig.ecertTemplates && currentConfig.ecertTemplates.length > 0) {
        setActiveEcertTab(currentConfig.ecertTemplates[0].id);
      }
      setError(null);
      setIsAuthorized(false);
      setAuthError(false);
      setEcertSaveSuccess(null);
    }
  }, [isOpen, currentConfig]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'kamuscatur') {
      setIsAuthorized(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleSaveEcert = async () => {
    setError(null);
    setIsSavingEcert(true);
    setEcertSaveSuccess(null);
    try {
      const activeTemplate = config.ecertTemplates?.find(t => t.id === activeEcertTab);
      const orientLabel = activeTemplate?.orientation === 'portrait' ? 'Menegak (Portrait)' : 'Mendatar (Landscape)';
      
      await updateRemoteConfig(config);
      onSaveSuccess(config);
      setEcertSaveSuccess(`Tetapan E-Cert "${activeTemplate?.name || 'Sijil'}" (${orientLabel}) berjaya disegerakkan terus ke Google Sheet!`);
      setTimeout(() => setEcertSaveSuccess(null), 6000);
    } catch (err: any) {
      setError(err.message || "Ralat semasa menolak konfigurasi E-Cert ke Google Sheet.");
    } finally {
      setIsSavingEcert(false);
    }
  };

  const handleSaveAll = async () => {
    setError(null);
    setIsSaving(true);
    try {
        await updateRemoteConfig(config);
        onSaveSuccess(config);
        alert("Semua konfigurasi termasuk tetapan orientasi E-Cert berjaya dikemaskini terus ke Google Sheet!");
    } catch (err: any) {
        setError(err.message || "Ralat semasa menyimpan ke Cloud.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveAdminNote = async (schoolId: string, currentReg: Registration) => {
    setSavingNoteId(schoolId);
    try {
      const updatedStatus = (statusDraft[schoolId] !== undefined ? statusDraft[schoolId] : (currentReg.documentStatus || 'BELUM HANTAR')) as any;
      const updatedNote = notesDraft[schoolId] !== undefined ? notesDraft[schoolId] : (currentReg.adminNotes || '');
      
      const updatedData: any = {
        ...currentReg,
        registrationId: schoolId,
        documentStatus: updatedStatus,
        adminNotes: updatedNote,
        updatedAt: new Date().toISOString()
      };
      
      const res = await syncRegistration(schoolId, updatedData, true);
      if (res && res.status === 'success') {
        if (onUpdateRegistration) {
          onUpdateRegistration(schoolId, updatedData);
        }
        setSavedNoteSuccessId(schoolId);
        setTimeout(() => setSavedNoteSuccessId(null), 3500);
      } else {
        throw new Error(res?.error || "Gagal menyimpan catatan urusetia");
      }
    } catch (err: any) {
      alert("Ralat menyimpan catatan: " + (err.message || "Sila cuba lagi"));
    } finally {
      setSavingNoteId(null);
    }
  };

  const schoolList = useMemo(() => {
    return Object.entries(registrations || {}).map(([id, reg]) => ({
      id,
      reg: reg as Registration
    }));
  }, [registrations]);

  const monitorStats = useMemo(() => {
    let sr = 0;
    let sm = 0;
    let totalStudents = 0;
    let docsLengkap = 0;
    let docsSebahagian = 0;
    let docsPerlu = 0;
    let docsBelum = 0;

    schoolList.forEach(({ reg }) => {
      const type = (reg.schoolType || '').toUpperCase();
      if (type.includes('RENDAH') || type === 'SR') sr++;
      else sm++;

      totalStudents += reg.students?.length || 0;

      const st = reg.documentStatus || 'BELUM HANTAR';
      if (st === 'LENGKAP') docsLengkap++;
      else if (st === 'SEBAHAGIAN' || st === 'DIHANTAR') docsSebahagian++;
      else if (st === 'PERLU PEMBETULAN') docsPerlu++;
      else docsBelum++;
    });

    return {
      totalSchools: schoolList.length,
      sr,
      sm,
      totalStudents,
      docsLengkap,
      docsSebahagian,
      docsPerlu,
      docsBelum
    };
  }, [schoolList]);

  const filteredSchools = useMemo(() => {
    return schoolList.filter(({ id, reg }) => {
      const s = searchTerm.toLowerCase();
      const schoolName = (reg.schoolName || '').toLowerCase();
      const schoolCode = (reg.schoolCode || '').toLowerCase();
      const regId = id.toLowerCase();
      const teacherName = (reg.teachers?.[0]?.name || '').toLowerCase();
      const matchesSearch = !s || schoolName.includes(s) || schoolCode.includes(s) || regId.includes(s) || teacherName.includes(s);

      const type = (reg.schoolType || '').toUpperCase();
      const isSR = type.includes('RENDAH') || type === 'SR';
      const isSM = type.includes('MENENGAH') || type === 'SM';
      let matchesType = true;
      if (filterType === 'SR') matchesType = isSR;
      if (filterType === 'SM') matchesType = isSM;

      const docStatus = reg.documentStatus || 'BELUM HANTAR';
      let matchesDoc = true;
      if (filterDocStatus !== 'all') {
        if (filterDocStatus === 'SEBAHAGIAN') {
          matchesDoc = docStatus === 'SEBAHAGIAN' || docStatus === 'DIHANTAR';
        } else {
          matchesDoc = docStatus === filterDocStatus;
        }
      }

      return matchesSearch && matchesType && matchesDoc;
    });
  }, [schoolList, searchTerm, filterType, filterDocStatus]);

  const updateScheduleItem = (type: 'primary' | 'secondary', dayIndex: number, itemIndex: number, field: 'time' | 'activity', value: string) => {
    const newConfig = { ...config };
    newConfig.schedules[type][dayIndex].items[itemIndex][field] = value;
    setConfig(newConfig);
  };

  const addScheduleDay = (type: 'primary' | 'secondary') => {
    const newConfig = { ...config };
    const dayNumber = (newConfig.schedules[type]?.length || 0) + 1;
    newConfig.schedules[type] = newConfig.schedules[type] || [];
    newConfig.schedules[type].push({
      date: `HARI KE-${dayNumber}`,
      items: [{ time: '8:00 PAGI', activity: 'Pendaftaran & Taklimat' }]
    });
    setConfig(newConfig);
  };

  const removeScheduleDay = (type: 'primary' | 'secondary', dayIndex: number) => {
    const newConfig = { ...config };
    newConfig.schedules[type].splice(dayIndex, 1);
    setConfig(newConfig);
  };

  const addScheduleItem = (type: 'primary' | 'secondary', dayIndex: number) => {
    const newConfig = { ...config };
    newConfig.schedules[type][dayIndex].items.push({
      time: '9:00 PAGI',
      activity: 'Pusingan Kejohanan'
    });
    setConfig(newConfig);
  };

  const removeScheduleItem = (type: 'primary' | 'secondary', dayIndex: number, itemIndex: number) => {
    const newConfig = { ...config };
    newConfig.schedules[type][dayIndex].items.splice(itemIndex, 1);
    setConfig(newConfig);
  };

  const getScriptContent = () => {
    return `/**
 * SISTEM PENGURUSAN KEJOHANAN CATUR MSSD PASIR GUDANG - v4.1 (TERKINI)
 * 
 * PENAMBAHBAIKAN UTAMA:
 * - Setiap sekolah memiliki sub-folder sendiri secara automatik di Google Drive
 *   (Format: "KOD_SEKOLAH - NAMA_SEKOLAH", contoh: "JBA1234 - SK TAMAN JOHOR JAYA 1")
 * - Menyokong muat naik 4 jenis dokumen sekolah secara berasingan
 * - Auto-replace: Dokumen lama dengan nama sama dipadam/digantikan dengan dokumen terkini
 * - Format Auto-Rename automatik bagi setiap dokumen
 * - Tetapan Folder Google Drive sasaran (TARGET_FOLDER_ID)
 * 
 * STRUKTUR SHEET & COLUMN INDEX (A=0, B=1, ...):
 * 
 * 1. SHEET SEKOLAH
 *    [0] Timestamp, [1] ID Sekolah, [2] Kod Sekolah, [3] Nama Sekolah, [4] Jenis Sekolah, 
 *    [5] Last Update, 
 *    [6] Lelaki, [7] Perempuan, [8] Melayu, [9] Cina, [10] India, [11] Lain-lain, 
 *    [12] Jumlah Pelajar, [13] Jumlah Guru,
 *    [14] Pautan Borang R01/M01, [15] Pautan Salinan IC, [16] Pautan Kebenaran Kejohanan, 
 *    [17] Pautan Kebenaran Media, [18] Status Dokumen, [19] Tarikh Kemaskini, [20] Catatan Urusetia
 * 
 * 2. SHEET GURU
 *    [0] Last update, [1] ID Sekolah, [2] Kod Sekolah, [3] Nama Sekolah, [4] Jenis Sekolah, 
 *    [5] Nama Guru, [6] No Kad Pengenalan, [7] Email, [8] No Telefon, [9] Jawatan
 * 
 * 3. SHEET PELAJAR
 *    [0] Last Update, [1] ID Sekolah, [2] Kod Sekolah, [3] Nama Sekolah, [4] Jenis Sekolah, 
 *    [5] ID Pelajar, [6] Nama Pelajar, [7] No Kad Pengenalan, 
 *    [8] Jantina, [9] Kategori, [10] Bangsa,
 *    [11] Borang (R01/M01), [12] Pengenalan (MyKid/IC), [13] Kebenaran Kejohanan, 
 *    [14] Kebenaran Media, [15] Status Dokumen Pelajar
 * 
 * 4. SHEET INFO
 *    [0] Nama, [1] Lokasi, [2] Telefon Admin, [3] Tarikh Kejohanan, [4] Tarikh Akhir Pendaftaran, [5] Tarikh Akhir Pembayaran
 * 
 * 5. SHEET PAUTAN
 *    [0] Peraturan, [1] Keputusan, [2] Gambar
 * 
 * 6. SHEET DOKUMEN
 *    [0] Jemputan, [1] Mesyuarat, [2] Arbiter
 * 
 * 7. SHEET JADUAL
 *    [0] Kategori, [1] Hari, [2] Masa, [3] Aktiviti
 * 
 * 8. SHEET ECERT
 *    [0] Jenis Sijil, [1] Link Gambar Sijil, [2] JSON Koordinat
 */

const SS_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// =========================================================================
// TETAPAN FOLDER GOOGLE DRIVE (SIMPANAN DOKUMEN):
// Pautan Folder Anda: https://drive.google.com/drive/folders/1z8f7sHF_AOX39IJDhRYMZAM5tYejvDiR?usp=sharing
// =========================================================================
const TARGET_FOLDER_ID = "1z8f7sHF_AOX39IJDhRYMZAM5tYejvDiR"; 
const TARGET_FOLDER_NAME = "DOKUMEN PENDAFTARAN MSSD 2026";

/**
 * PENTING: Jalankan fungsi ini SEKALI di editor Google Apps Script untuk aktifkan kebenaran PENUH Google Drive:
 * 1. Pilih 'authorizeScript' pada dropdown fungsi di toolbar atas editor Apps Script.
 * 2. Klik butang 'Run' (Jalankan ▶).
 * 3. Pop-up "Authorization Required" -> "Review Permissions" -> Pilih akaun Google anda -> "Advanced" -> "Go to ... (unsafe)" -> "Allow".
 */
function authorizeScript() {
  SpreadsheetApp.getActiveSpreadsheet();
  // Mesti panggil createFile supaya Google Apps Script meminta kebenaran Tulis/Cipta Fail (Write Scope):
  const testFile = DriveApp.createFile("test_permission_mssd.txt", "OK");
  testFile.setTrashed(true);
  Logger.log("Kebenaran PENUH Google Drive (Write/Create File) BERJAYA diberikan!");
}

function doGet(e) {
  const params = e.parameter;
  const action = params.action;
  
  let result = {};
  
  try {
    if (action === 'loadAll') {
      result = loadAllData();
    } else if (action === 'search') {
      result = searchRegistration(params.regId, params.password);
    }
  } catch (error) {
    result = { error: error.toString() };
  }
  
  const callback = params.callback;
  const output = JSON.stringify(result);
  
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + output + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    let result = {};
    
    if (action === 'submit' || action === 'update') {
      result = saveRegistration(postData);
    } else if (action === 'updateConfig') {
      result = saveConfig(postData.config);
    } else if (action === 'uploadDocument') {
      result = uploadDocumentFile(postData);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function uploadDocumentFile(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const regId = data.regId || '';
  const schoolCode = (data.schoolCode || '').toUpperCase().trim();
  const schoolName = (data.schoolName || '').toUpperCase().trim();
  const schoolType = (data.schoolType || '').toUpperCase().trim();
  const base64File = data.base64File;
  const docType = data.docType || 'all';
  
  let fileUrl = data.driveUrl || '';
  let finalFileName = data.fileName || '';

  // =========================================================================
  // FOLDER KHUSUS SETIAP SEKOLAH:
  // Setiap sekolah mempunyai folder tersendiri di dalam folder utama Google Drive
  // Format nama: "JBA1234 - SK TAMAN JOHOR JAYA 1"
  // Ditakrifkan di peringkat fungsi untuk mengelakkan ReferenceError
  // =========================================================================
  let schoolFolderName = (schoolCode ? (schoolCode + ' - ' + schoolName) : schoolName).trim();
  if (!schoolFolderName) {
    schoolFolderName = (regId || 'SEKOLAH').replace(/[^a-zA-Z0-9]/g, '_');
  }

  if (base64File) {
    let parentFolder = null;
    let folderIdToUse = (data.folderId || TARGET_FOLDER_ID || "").trim();

    // Jika pengguna masukkan URL penuh folder Drive, ekstrak ID sahaja
    if (folderIdToUse.indexOf('/folders/') > -1) {
      const parts = folderIdToUse.split('/folders/')[1];
      if (parts) {
        folderIdToUse = parts.split('/')[0].split('?')[0];
      }
    }

    try {
      if (folderIdToUse !== "") {
        try {
          parentFolder = DriveApp.getFolderById(folderIdToUse);
        } catch (fErr) {
          Logger.log("Folder spesifik tidak dapat diakses: " + fErr);
        }
      }

      // Fallback jika tiada folder ID atau belum wujud: guna folder name
      if (!parentFolder) {
        const folders = DriveApp.getFoldersByName(TARGET_FOLDER_NAME);
        parentFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(TARGET_FOLDER_NAME);
      }
    } catch (permErr) {
      const errMsg = permErr.toString();
      if (errMsg.indexOf('permission') > -1 || errMsg.indexOf('DriveApp') > -1) {
        throw new Error("KEBENARAN DIPERLUKAN: Sila buka Google Apps Script, pilih fungsi 'authorizeScript' pada menu atas, dan klik 'Run' untuk benarkan capaian Google Drive.");
      }
      throw permErr;
    }

    const cleanName = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanCode = schoolCode.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanId = regId.replace(/[^a-zA-Z0-9]/g, '_');

    let schoolFolder = null;
    try {
      const existingSubFolders = parentFolder.getFoldersByName(schoolFolderName);
      schoolFolder = existingSubFolders.hasNext() ? existingSubFolders.next() : parentFolder.createFolder(schoolFolderName);
      schoolFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (subErr) {
      Logger.log("Gagal buat sub-folder sekolah, fallback guna parentFolder: " + subErr);
      schoolFolder = parentFolder;
    }
    
    let typeTag = 'DOKUMEN';
    if (docType === 'borang') typeTag = schoolType.includes('MENENGAH') ? 'BORANG_M01' : 'BORANG_R01';
    else if (docType === 'ic') typeTag = 'SALINAN_IC_MYKID';
    else if (docType === 'kebenaran') typeTag = 'KEBENARAN_KEJOHANAN';
    else if (docType === 'media') typeTag = 'KEBENARAN_MEDIA';
    else typeTag = 'DOKUMEN_KOMPILASI';

    finalFileName = cleanCode + '_' + cleanName + '_' + typeTag + '_' + cleanId + '.pdf';

    let cleanBase64 = base64File;
    if (cleanBase64.indexOf(',') > -1) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    const decodedBytes = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decodedBytes, 'application/pdf', finalFileName);
    
    // Jika fail lama dengan nama yang sama telah wujud dalam folder sekolah, padam fail lama tersebut (update terkini)
    try {
      const existingOldFiles = schoolFolder.getFilesByName(finalFileName);
      while (existingOldFiles.hasNext()) {
        existingOldFiles.next().setTrashed(true);
      }
    } catch (trashErr) {
      Logger.log("Info semakan fail lama: " + trashErr);
    }

    const file = schoolFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    fileUrl = file.getUrl();
  }

  // Rekod ke Sheet SEKOLAH:
  // Column 15 (O): BORANG R01 / M01
  // Column 16 (P): SALINAN IC / MYKID
  // Column 17 (Q): KEBENARAN KEJOHANAN
  // Column 18 (R): KEBENARAN MEDIA
  // Column 19 (S): STATUS DOKUMEN
  // Column 20 (T): TARIKH KEMASKINI DOKUMEN
  // Column 21 (U): CATATAN URUSETIA
  const schoolSheet = ss.getSheetByName('SEKOLAH');
  const schoolData = schoolSheet.getDataRange().getValues();
  for (let i = 1; i < schoolData.length; i++) {
    if (schoolData[i][1] === regId) {
      const rowIdx = i + 1;
      let targetCol = 15;
      if (docType === 'borang') targetCol = 15;
      else if (docType === 'ic') targetCol = 16;
      else if (docType === 'kebenaran') targetCol = 17;
      else if (docType === 'media') targetCol = 18;

      schoolSheet.getRange(rowIdx, targetCol).setValue(fileUrl);

      const rowValues = schoolSheet.getRange(rowIdx, 1, 1, 21).getValues()[0];
      const hasBorang = !!(targetCol === 15 ? fileUrl : rowValues[14]);
      const hasIc = !!(targetCol === 16 ? fileUrl : rowValues[15]);
      const hasKebenaran = !!(targetCol === 17 ? fileUrl : rowValues[16]);
      const hasMedia = !!(targetCol === 18 ? fileUrl : rowValues[17]);

      const count = [hasBorang, hasIc, hasKebenaran, hasMedia].filter(Boolean).length;
      let newStatus = 'BELUM HANTAR';
      if (count === 4) newStatus = 'LENGKAP';
      else if (count > 0) newStatus = 'SEBAHAGIAN';

      schoolSheet.getRange(rowIdx, 19).setValue(newStatus);
      schoolSheet.getRange(rowIdx, 20).setValue(new Date());
      break;
    }
  }

  return {
    status: 'success',
    fileName: finalFileName,
    fileUrl: fileUrl,
    docType: docType,
    schoolFolderName: schoolFolderName || '',
    message: 'Dokumen ' + (docType).toUpperCase() + ' berjaya dimuat naik ke folder ' + (schoolFolderName || 'sekolah') + ' & dinamakan semula mengikut format rasmi.'
  };
}

// --- FUNGSI UTAMA ---

function loadAllData() {
  const ss = SpreadsheetApp.openById(SS_ID);
  
  // 1. INFO (Row 2, Cols A-J)
  const infoSheet = ss.getSheetByName('INFO');
  const infoData = infoSheet.getRange(2, 1, 1, 10).getValues()[0];

  // 2. PAUTAN (Row 2, Cols A-C)
  const linkSheet = ss.getSheetByName('PAUTAN');
  const linkData = linkSheet.getRange(2, 1, 1, 3).getValues()[0];

  // 3. DOKUMEN: Boleh baca sama ada format Baris (Key-Value) atau format Lajur (Horizontal)
  const docSheet = ss.getSheetByName('DOKUMEN');
  let docsMap = {
    invitation: '',
    meeting: '',
    arbiter: '',
    borangR01: '',
    borangM01: '',
    kebenaranKejohanan: '',
    kebenaranMedia: ''
  };

  if (docSheet) {
    const docValues = docSheet.getDataRange().getValues();
    if (docValues.length > 0) {
      // 1. Semak jika format Key-Value (Row by Row)
      let isKeyValue = false;
      for (let r = 0; r < docValues.length; r++) {
        const k = String(docValues[r][0] || '').trim().toLowerCase();
        if (k.indexOf('borang') > -1 || k.indexOf('r01') > -1 || k.indexOf('m01') > -1 || k.indexOf('kebenaran') > -1 || k.indexOf('jemputan') > -1 || k.indexOf('mesyuarat') > -1 || k.indexOf('arbiter') > -1) {
          isKeyValue = true;
          break;
        }
      }

      if (isKeyValue) {
        for (let r = 0; r < docValues.length; r++) {
          const k = String(docValues[r][0] || '').trim().toLowerCase();
          const v = String(docValues[r][1] || '').trim();
          if (k.indexOf('r01') > -1) docsMap.borangR01 = v;
          else if (k.indexOf('m01') > -1) docsMap.borangM01 = v;
          else if (k.indexOf('kejohanan') > -1 || k.indexOf('pelepasan') > -1) docsMap.kebenaranKejohanan = v;
          else if (k.indexOf('media') > -1) docsMap.kebenaranMedia = v;
          else if (k.indexOf('jemputan') > -1 || k.indexOf('invitation') > -1) docsMap.invitation = v;
          else if (k.indexOf('mesyuarat') > -1 || k.indexOf('meeting') > -1) docsMap.meeting = v;
          else if (k.indexOf('arbiter') > -1) docsMap.arbiter = v;
        }
      } else {
        // 2. Format Lajur Horizontal (Header di Row 1, Pautan di Row 2)
        const headerRow = docValues[0] || [];
        const dataRow = docValues[1] || [];

        for (let c = 0; c < headerRow.length; c++) {
          const h = String(headerRow[c] || '').trim().toLowerCase();
          const val = String(dataRow[c] || '').trim();
          if (h.indexOf('r01') > -1) docsMap.borangR01 = val;
          else if (h.indexOf('m01') > -1) docsMap.borangM01 = val;
          else if (h.indexOf('kejohanan') > -1) docsMap.kebenaranKejohanan = val;
          else if (h.indexOf('media') > -1) docsMap.kebenaranMedia = val;
          else if (h.indexOf('jemputan') > -1 || h.indexOf('invitation') > -1) docsMap.invitation = val;
          else if (h.indexOf('mesyuarat') > -1 || h.indexOf('meeting') > -1) docsMap.meeting = val;
          else if (h.indexOf('arbiter') > -1) docsMap.arbiter = val;
        }

        // Positional fallbacks jika nama header lain:
        if (!docsMap.invitation && dataRow[0]) docsMap.invitation = String(dataRow[0]).trim();
        if (!docsMap.meeting && dataRow[1]) docsMap.meeting = String(dataRow[1]).trim();
        if (!docsMap.arbiter && dataRow[2]) docsMap.arbiter = String(dataRow[2]).trim();
        if (!docsMap.borangR01 && dataRow[3]) docsMap.borangR01 = String(dataRow[3]).trim();
        if (!docsMap.borangM01 && dataRow[4]) docsMap.borangM01 = String(dataRow[4]).trim();
        if (!docsMap.kebenaranKejohanan && dataRow[5]) docsMap.kebenaranKejohanan = String(dataRow[5]).trim();
        if (!docsMap.kebenaranMedia && dataRow[6]) docsMap.kebenaranMedia = String(dataRow[6]).trim();
      }
    }
  }

  // 4. JADUAL (Baca semua baris bermula row 2)
  const schedSheet = ss.getSheetByName('JADUAL');
  const schedRows = schedSheet.getDataRange().getValues().slice(1); // Skip header row 1
  
  // Asingkan mengikut column A (Kategori: SR atau SM)
  const primarySched = transformSchedule(schedRows.filter(r => r[0] === 'SR'));
  const secondarySched = transformSchedule(schedRows.filter(r => r[0] === 'SM'));
  
  let ecertTemplates = [];
  const ecertSheet = ss.getSheetByName('ECERT');
  if (ecertSheet) {
    const ecertRows = ecertSheet.getDataRange().getValues();
    for (let i = 1; i < ecertRows.length; i++) {
      if (ecertRows[i][0]) {
        let configJson = null;
        try {
          if (ecertRows[i][2]) configJson = JSON.parse(ecertRows[i][2]);
        } catch(e) {}
        
        const isOldFormat = configJson && configJson.name && configJson.name.x;
        const rawFields = isOldFormat ? configJson : (configJson?.fields || {
          name: { x: 50, y: 50, fontSize: 30, color: '#000000', align: 'center', show: true },
          ic: { x: 50, y: 60, fontSize: 20, color: '#000000', align: 'center', show: true },
          school: { x: 50, y: 70, fontSize: 20, color: '#000000', align: 'center', show: true },
          category: { x: 50, y: 80, fontSize: 20, color: '#000000', align: 'center', show: true }
        });
        const orientation = configJson?.orientation || (configJson?.fields && configJson.fields.orientation) || (rawFields && rawFields.orientation) || 'landscape';
        const fields = { ...rawFields };
        delete fields.orientation;
        delete fields._orientation;
        
        ecertTemplates.push({
          id: ecertRows[i][0].toLowerCase().replace(/\\s+/g, '-'),
          name: ecertRows[i][0],
          backgroundUrl: ecertRows[i][1],
          orientation: orientation,
          fields: fields
        });
      }
    }
  }

  const config = {
    eventName: infoData[0],
    eventVenue: infoData[1],
    adminPhone: infoData[2],
    tournamentDate: infoData[3],
    registrationDeadline: infoData[4],
    paymentDeadline: infoData[5],
    isRegistrationOpen: infoData[6] === 'AKTIF' ? true : false,
    isUpdateOpen: infoData[7] === 'AKTIF' ? true : false,
    isPrintOpen: infoData[8] === 'AKTIF' ? true : false,
    isEcertOpen: infoData[9] === 'AKTIF' ? true : false,
    links: {
      rules: linkData[0],
      results: linkData[1],
      photos: linkData[2]
    },
    documents: {
      invitation: docsMap.invitation || '',
      meeting: docsMap.meeting || '',
      arbiter: docsMap.arbiter || '',
      borangR01: docsMap.borangR01 || '',
      borangM01: docsMap.borangM01 || '',
      kebenaranKejohanan: docsMap.kebenaranKejohanan || '',
      kebenaranMedia: docsMap.kebenaranMedia || ''
    },
    schedules: {
      primary: primarySched,
      secondary: secondarySched
    },
    ecertTemplates: ecertTemplates
  };
  
  // 5. DATA PENDAFTARAN
  const registrations = {};
  
  // Load SEKOLAH (ID di Column B [Index 1])
  const schoolSheet = ss.getSheetByName('SEKOLAH');
  const schools = schoolSheet.getDataRange().getValues().slice(1);
  schools.forEach(row => {
    // Row: [0]Timestamp, [1]ID, [2]Kod, [3]Nama, [4]Jenis, [5]Update, [6-13]Stats,
    // [14]Borang, [15]IC, [16]Kebenaran Kejohanan, [17]Kebenaran Media, [18]Status, [19]TarikhHantar, [20]Catatan
    if(row[1]) { 
      registrations[row[1]] = {
        schoolCode: row[2],
        schoolName: row[3],
        schoolType: row[4],
        status: 'AKTIF',
        createdAt: row[0],
        updatedAt: row[5],
        docFormUrl: row[14] || '',
        docIdUrl: row[15] || '',
        docParentConsentUrl: row[16] || '',
        docMediaConsentUrl: row[17] || '',
        documentUrl: row[14] || row[15] || row[16] || row[17] || '',
        documentStatus: row[18] || 'BELUM HANTAR',
        documentUploadedAt: row[19] || '',
        adminNotes: row[20] || '',
        teachers: [],
        students: []
      };
    }
  });

  // Load GURU (ID Sekolah di Column B [Index 1])
  const teacherSheet = ss.getSheetByName('GURU');
  const teachers = teacherSheet.getDataRange().getValues().slice(1);
  teachers.forEach(row => {
    // Row: [0]Update, [1]ID, [2]Kod, [3]NamaSek, [4]Jenis, [5]NamaGuru, [6]IC, [7]Email, [8]Tel, [9]Jawatan
    const id = row[1];
    if (registrations[id]) {
      registrations[id].teachers.push({
        name: row[5],
        ic: row[6],
        email: row[7],
        phone: row[8],
        position: row[9]
      });
    }
  });

  // Load PELAJAR (ID Sekolah di Column B [Index 1])
  const studentSheet = ss.getSheetByName('PELAJAR');
  const students = studentSheet.getDataRange().getValues().slice(1);
  students.forEach(row => {
    // Row: [0]Update, [1]ID, [2]Kod, [3]NamaSek, [4]Jenis, [5]IDPel, [6]Nama, [7]IC, [8]Jan, [9]Kat, [10]Bangsa, 
    // [11]Borang, [12]Pengenalan, [13]Kebenaran Kejohanan, [14]Kebenaran Media, [15]Status
    const id = row[1];
    if (registrations[id]) {
      registrations[id].students.push({
        playerId: row[5],
        name: row[6],
        ic: row[7],
        gender: row[8],
        category: row[9],
        race: row[10],
        documents: {
          hasForm: row[11] === 'ADA',
          hasIdDoc: row[12] === 'ADA',
          hasParentConsent: row[13] === 'ADA',
          hasMediaConsent: row[14] === 'ADA'
        }
      });
    }
  });
  
  return { config, registrations };
}

function saveRegistration(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let regId = data.registrationId;
  const isUpdate = data.action === 'update';
  const now = new Date();
  
  // Pastikan schoolType ditakrifkan dengan selamat (elakkan ReferenceError)
  const schoolType = (data.schoolType || (data.students && data.students.some(function(s) { return s.category && s.category.indexOf('12') > -1; }) ? 'SEKOLAH RENDAH' : 'SEKOLAH MENENGAH')).toUpperCase();

  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  if (!lock.hasLock()) throw new Error("Server sibuk. Sila cuba sebentar lagi.");
  
  try {
    // --- 1. SHEET SEKOLAH ---
    const schoolSheet = ss.getSheetByName('SEKOLAH');
    const schoolData = schoolSheet.getDataRange().getValues();
    
    // Cari jika rekod sekolah sedia ada wujud berdasarkan regId
    let existingRowIndex = -1;
    let existingRow = null;
    if (regId) {
      for (let i = 1; i < schoolData.length; i++) {
        if (String(schoolData[i][1]).trim() === String(regId).trim()) {
          existingRowIndex = i + 1; // 1-based row index in Google Sheets
          existingRow = schoolData[i];
          break;
        }
      }
    }
    
    if (!isUpdate && !existingRow) {
      // Generate Registration ID baharu
      let categoryCount = 0;
      for (let i = 1; i < schoolData.length; i++) {
        if (schoolData[i][4] === schoolType) {
          categoryCount++;
        }
      }
      const categoryCode = schoolType === 'SEKOLAH RENDAH' ? '01' : '02';
      const countStr = String(categoryCount + 1).padStart(2, '0');
      regId = 'MSSD-' + categoryCode + '-' + countStr;
    }

    // Generate Player IDs for all students
    const year = new Date().getFullYear().toString().slice(-2);
    const schoolNo = (regId || '01').split('-').pop().padStart(2, '0');
    
    if (Array.isArray(data.students)) {
      data.students.forEach((s, index) => {
        let catCode = '15';
        if (s.category) {
          if (s.category.includes('12')) catCode = '12';
          else if (s.category.includes('15')) catCode = '15';
          else if (s.category.includes('18')) catCode = '18';
        }
        const genderCode = s.gender === 'Lelaki' ? '01' : '02';
        const playerCount = String(index + 1).padStart(2, '0');
        s.playerId = year + catCode + genderCode + schoolNo + playerCount;
      });
    }

    // Kira Statistik untuk Sheet SEKOLAH
    const studentsArr = Array.isArray(data.students) ? data.students : [];
    const teachersArr = Array.isArray(data.teachers) ? data.teachers : [];
    const teacherCount = teachersArr.length;
    const studentCount = studentsArr.length;
    const maleCount = studentsArr.filter(s => s.gender === 'Lelaki').length;
    const femaleCount = studentsArr.filter(s => s.gender === 'Perempuan').length;
    const malayCount = studentsArr.filter(s => s.race === 'Melayu').length;
    const chineseCount = studentsArr.filter(s => s.race === 'Cina').length;
    const indianCount = studentsArr.filter(s => s.race === 'India').length;
    const othersCount = studentsArr.filter(s => s.race === 'Lain-lain' || !['Melayu', 'Cina', 'India'].includes(s.race)).length;

    // Pelihara pautan dokumen sedia ada jika kemaskini tidak menghantar fail baharu
    const docFormUrl = data.docFormUrl || (existingRow ? existingRow[14] : '') || '';
    const docIdUrl = data.docIdUrl || (existingRow ? existingRow[15] : '') || '';
    const docParentConsentUrl = data.docParentConsentUrl || (existingRow ? existingRow[16] : '') || '';
    const docMediaConsentUrl = data.docMediaConsentUrl || (existingRow ? existingRow[17] : '') || '';
    
    const docCount = [docFormUrl, docIdUrl, docParentConsentUrl, docMediaConsentUrl].filter(Boolean).length;
    let docStatus = data.documentStatus || (existingRow ? existingRow[18] : 'BELUM HANTAR');
    if (docCount === 4) docStatus = 'LENGKAP';
    else if (docCount > 0) docStatus = 'SEBAHAGIAN';

    const createdAtVal = data.createdAt ? new Date(data.createdAt) : (existingRow && existingRow[0] ? existingRow[0] : now);
    const documentUploadedAtVal = data.documentUploadedAt ? new Date(data.documentUploadedAt) : (existingRow && existingRow[19] ? existingRow[19] : '');
    const adminNotesVal = (data.adminNotes !== undefined && data.adminNotes !== null) ? data.adminNotes : (existingRow ? existingRow[20] : '');

    // Susunan Column SEKOLAH:
    // [0]Timestamp, [1]ID, [2]Kod, [3]Nama, [4]Jenis, [5]Last Update, 
    // [6]Lelaki, [7]Perempuan, [8]Melayu, [9]Cina, [10]India, [11]Lain, [12]J.Pelajar, [13]J.Guru,
    // [14]Borang R01/M01, [15]Salinan IC/MyKid, [16]Kebenaran Kejohanan, [17]Kebenaran Media,
    // [18]Status Dokumen, [19]Tarikh Hantar, [20]Catatan Urusetia
    const schoolRow = [
      createdAtVal,
      regId,
      data.schoolCode,
      data.schoolName,
      schoolType,
      now,
      maleCount,
      femaleCount,
      malayCount,
      chineseCount,
      indianCount,
      othersCount,
      studentCount,
      teacherCount,
      docFormUrl,
      docIdUrl,
      docParentConsentUrl,
      docMediaConsentUrl,
      docStatus,
      documentUploadedAtVal,
      adminNotesVal
    ];

    if (existingRowIndex > 0) {
      // KEMASKINI SETEMPAT (IN-PLACE UPDATE):
      // Kemaskini rekod sedia ada tanpa memadam baris. Data TIDAK AKAN HILANG jika berlaku sebarang gangguan!
      schoolSheet.getRange(existingRowIndex, 1, 1, schoolRow.length).setValues([schoolRow]);
    } else {
      schoolSheet.appendRow(schoolRow);
    }
    
    // --- 2. SHEET GURU ---
    const teacherSheet = ss.getSheetByName('GURU');
    const teacherRows = teachersArr.map(t => [
      now,
      regId,
      data.schoolCode,
      data.schoolName,
      schoolType,
      t.name,
      t.ic,
      t.email,
      t.phone,
      t.position
    ]);

    if (isUpdate || existingRowIndex > 0) {
      deleteRowsById(teacherSheet, regId, 1);
    }
    if (teacherRows.length > 0) {
      teacherSheet.getRange(teacherSheet.getLastRow() + 1, 1, teacherRows.length, 10).setValues(teacherRows);
    }
    
    // --- 3. SHEET PELAJAR ---
    const studentSheet = ss.getSheetByName('PELAJAR');
    const studentRows = studentsArr.map(s => {
      const docs = s.documents || {};
      const hasForm = !!docs.hasForm;
      const hasId = !!docs.hasIdDoc;
      const hasParent = !!docs.hasParentConsent;
      const hasMedia = !!docs.hasMediaConsent;
      const isComplete = (hasForm && hasId && hasParent && hasMedia) ? 'LENGKAP' : 'BELUM LENGKAP';

      return [
        now,
        regId,
        data.schoolCode,
        data.schoolName,
        schoolType,
        s.playerId,
        s.name,
        s.ic,
        s.gender,
        s.category,
        s.race,
        hasForm ? 'ADA' : 'TIADA',
        hasId ? 'ADA' : 'TIADA',
        hasParent ? 'ADA' : 'TIADA',
        hasMedia ? 'ADA' : 'TIADA',
        isComplete
      ];
    });

    if (isUpdate || existingRowIndex > 0) {
      deleteRowsById(studentSheet, regId, 1);
    }
    if (studentRows.length > 0) {
      studentSheet.getRange(studentSheet.getLastRow() + 1, 1, studentRows.length, 16).setValues(studentRows);
    }
    
    return { status: 'success', regId: regId, students: data.students };
    
  } finally {
    lock.releaseLock();
  }
}

function saveConfig(config) {
  const ss = SpreadsheetApp.openById(SS_ID);
  
  // 1. INFO (Row 2, Cols A-J)
  const infoSheet = ss.getSheetByName('INFO');
  infoSheet.getRange(2, 1, 1, 10).setValues([[
    config.eventName,
    config.eventVenue,
    config.adminPhone,
    config.tournamentDate,
    config.registrationDeadline,
    config.paymentDeadline,
    config.isRegistrationOpen === false ? 'TIDAK AKTIF' : 'AKTIF',
    config.isUpdateOpen === false ? 'TIDAK AKTIF' : 'AKTIF',
    config.isPrintOpen === false ? 'TIDAK AKTIF' : 'AKTIF',
    config.isEcertOpen === false ? 'TIDAK AKTIF' : 'AKTIF'
  ]]);

  const ecertSheet = ss.getSheetByName('ECERT');
  if (ecertSheet && config.ecertTemplates) {
    const numRowsToClear = Math.max(ecertSheet.getLastRow() - 1, 1);
    ecertSheet.getRange(2, 1, numRowsToClear, 3).clearContent();
    if (config.ecertTemplates.length > 0) {
      const writeData = config.ecertTemplates.map(t => [
        t.name,
        t.backgroundUrl,
        JSON.stringify({ orientation: t.orientation || 'landscape', fields: t.fields })
      ]);
      ecertSheet.getRange(2, 1, writeData.length, 3).setValues(writeData);
    }
  }

  // 2. PAUTAN (Row 2, Cols A-C)
  const linkSheet = ss.getSheetByName('PAUTAN');
  linkSheet.getRange(2, 1, 1, 3).setValues([[
    config.links.rules,
    config.links.results,
    config.links.photos
  ]]);

  // 3. DOKUMEN: Kemas kini mengikut lajur header yang wujud atau tulis 7 dokumen
  const docSheet = ss.getSheetByName('DOKUMEN');
  if (docSheet) {
    const existingRange = docSheet.getDataRange();
    const existingValues = existingRange.getValues();
    if (existingValues.length > 0 && existingValues[0].length >= 4) {
      const headerRow = existingValues[0];
      const newRow2 = [...(existingValues[1] || [])];
      for (let c = 0; c < headerRow.length; c++) {
        const h = String(headerRow[c] || '').toLowerCase();
        if (h.indexOf('r01') > -1) newRow2[c] = config.documents.borangR01 || newRow2[c] || '';
        else if (h.indexOf('m01') > -1) newRow2[c] = config.documents.borangM01 || newRow2[c] || '';
        else if (h.indexOf('kejohanan') > -1) newRow2[c] = config.documents.kebenaranKejohanan || newRow2[c] || '';
        else if (h.indexOf('media') > -1) newRow2[c] = config.documents.kebenaranMedia || newRow2[c] || '';
        else if (h.indexOf('jemputan') > -1 || h.indexOf('invitation') > -1) newRow2[c] = config.documents.invitation || newRow2[c] || '';
        else if (h.indexOf('mesyuarat') > -1 || h.indexOf('meeting') > -1) newRow2[c] = config.documents.meeting || newRow2[c] || '';
        else if (h.indexOf('arbiter') > -1) newRow2[c] = config.documents.arbiter || newRow2[c] || '';
      }
      docSheet.getRange(2, 1, 1, newRow2.length).setValues([newRow2]);
    } else {
      docSheet.getRange(1, 1, 1, 7).setValues([[
        'SURAT JEMPUTAN', 'SURAT MESYUARAT', 'LANTIKAN ARBITER',
        'BORANG R01', 'BORANG M01', 'KEBENARAN KEJOHANAN', 'KEBENARAN MEDIA'
      ]]);
      docSheet.getRange(2, 1, 1, 7).setValues([[
        config.documents.invitation || '',
        config.documents.meeting || '',
        config.documents.arbiter || '',
        config.documents.borangR01 || '',
        config.documents.borangM01 || '',
        config.documents.kebenaranKejohanan || '',
        config.documents.kebenaranMedia || ''
      ]]);
    }
  }

  // 4. JADUAL (Flatten Data)
  const schedSheet = ss.getSheetByName('JADUAL');
  
  // Clear data lama (simpan header di Row 1)
  const lastRow = schedSheet.getLastRow();
  if (lastRow > 1) {
    schedSheet.getRange(2, 1, lastRow - 1, 4).clearContent();
  }

  const newRows = [];
  // Primary (SR)
  if (config.schedules.primary) {
    config.schedules.primary.forEach(day => {
      day.items.forEach(item => {
        // [0]Kategori, [1]Hari, [2]Masa, [3]Aktiviti
        newRows.push(['SR', day.date, item.time, item.activity]);
      });
    });
  }
  // Secondary (SM)
  if (config.schedules.secondary) {
    config.schedules.secondary.forEach(day => {
      day.items.forEach(item => {
        newRows.push(['SM', day.date, item.time, item.activity]);
      });
    });
  }

  if (newRows.length > 0) {
    schedSheet.getRange(2, 1, newRows.length, 4).setValues(newRows);
  }

  return { status: 'success' };
}

function searchRegistration(regId, password) {
  const data = loadAllData();
  const reg = data.registrations[regId];
  
  if (!reg) return { found: false, error: 'ID Pendaftaran tidak wujud.' };
  
  // Password check: 4 digit akhir no telefon guru pertama
  if (reg.teachers.length > 0) {
    const phone = String(reg.teachers[0].phone || '').replace(/[^0-9]/g, '');
    const last4 = phone.slice(-4);
    if (last4 === password) {
      return { found: true, registration: reg };
    }
  }
  
  return { found: false, error: 'Kata laluan salah.' };
}

// Helpers
function deleteRowsById(sheet, id, idColIndex) {
  const data = sheet.getDataRange().getValues();
  // Loop dari bawah ke atas untuk delete dengan selamat
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idColIndex] === id) {
      sheet.deleteRow(i + 1);
    }
  }
}

function transformSchedule(rows) {
  // Tukar format Flat DB (Row by Row) ke Nested JSON (Date > Items)
  const daysMap = {};
  rows.forEach(r => {
    const date = r[1]; // Col B: Hari
    if (!daysMap[date]) daysMap[date] = [];
    daysMap[date].push({ time: r[2], activity: r[3] }); // Col C: Masa, Col D: Aktiviti
  });

  return Object.keys(daysMap).map(date => ({
    date: date,
    items: daysMap[date]
  }));
}

function initSheets(ss) {
  const configs = {
    'SEKOLAH': ['TIMESTAMP', 'ID SEKOLAH', 'KOD SEKOLAH', 'NAMA SEKOLAH', 'JENIS SEKOLAH', 'LAST UPDATE', 'LELAKI', 'PEREMPUAN', 'MELAYU', 'CINA', 'INDIA', 'LAIN-LAIN', 'JUMLAH PELAJAR', 'JUMLAH GURU', 'PAUTAN BORANG R01 / M01', 'PAUTAN SALINAN IC / MYKID', 'PAUTAN KEBENARAN KEJOHANAN', 'PAUTAN KEBENARAN MEDIA', 'STATUS DOKUMEN', 'TARIKH KEMASKINI DOKUMEN', 'CATATAN URUSETIA'],
    'GURU': ['ID', 'KOD SEKOLAH', 'NAMA SEKOLAH', 'NAMA GURU', 'EMAIL', 'TELEFON', 'JAWATAN', 'URUTAN', 'DAFTAR', 'KEMASKINI', 'STATUS'],
    'PELAJAR': ['UPDATE', 'ID SEKOLAH', 'KOD SEKOLAH', 'NAMA SEKOLAH', 'JENIS SEKOLAH', 'ID PEMAIN', 'NAMA PELAJAR', 'NO IC', 'JANTINA', 'KATEGORI', 'BANGSA', 'BORANG (R01/M01)', 'PENGENALAN (MYKID/IC)', 'KEBENARAN KEJOHANAN', 'KEBENARAN MEDIA', 'STATUS DOKUMEN PELAJAR'],
    'INFO': ['NAMA', 'LOKASI', 'TELEFON ADMIN', 'TARIKH KEJOHANAN', 'TARIKH AKHIR PENDAFTARAN', 'TARIKH AKHIR PEMBAYARAN', 'STATUS PENDAFTARAN BARU', 'STATUS SEMAK/KEMASKINI', 'STATUS CETAK SLIP'],
    'JADUAL': ['TYPE', 'DAY', 'TIME', 'ACTIVITY'],
    'PAUTAN': ['KEY', 'VALUE'],
    'DOKUMEN': ['SURAT JEMPUTAN', 'SURAT MESYUARAT', 'LANTIKAN ARBITER', 'BORANG R01', 'BORANG M01', 'KEBENARAN KEJOHANAN', 'KEBENARAN MEDIA'],
    'ECERT': ['JENIS SIJIL', 'BACKGROUND URL', 'KOORDINAT JSON']
  };
  
  Object.keys(configs).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.appendRow(configs[name]);
      sh.getRange(1,1,1,configs[name].length).setFontWeight('bold').setBackground('#f3f3f3');
      sh.setFrozenRows(1);
    }
  });
}
`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl flex flex-col overflow-hidden h-[95vh] border border-slate-200">
        
        {/* Header Bar */}
        <div className="p-5 md:p-6 bg-slate-900 text-white flex justify-between items-center relative shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
                <div className="bg-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-900/40 text-white shrink-0">
                    {isAuthorized ? <ShieldCheck size={26} /> : <Lock size={26} />}
                </div>
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg md:text-xl font-black tracking-tight uppercase">Kemas Kini Maklumat & Pusat Kawalan Admin</h2>
                      {isAuthorized && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Mod Admin Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 tracking-wide mt-0.5">
                      Kejohanan Catur MSSD Pasir Gudang • Panel Pengurusan & Pemantauan Urusetia
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2.5 rounded-xl transition-all"
                title="Tutup Panel"
              >
                <X size={20} />
              </button>
            </div>
        </div>

        {!isAuthorized ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
            <form onSubmit={handleAuth} className="w-full max-w-sm bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
               <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                 <Lock size={30} />
               </div>

               <div className="space-y-1.5">
                 <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Pengesahan Kata Laluan</h3>
                 <p className="text-xs text-slate-500 font-medium leading-relaxed">
                   Sila masukkan kata laluan urusetia untuk mengakses panel kemas kini dan pemantauan data.
                 </p>
               </div>
               
               <div className="space-y-2">
                 <input 
                   type="password"
                   autoFocus
                   value={password}
                   onChange={(e) => {
                     setPassword(e.target.value);
                     setAuthError(false);
                   }}
                   placeholder="Kata Laluan Urusetia"
                   className={`w-full px-5 py-3.5 bg-slate-50 border-2 rounded-2xl text-center font-black tracking-widest text-slate-800 focus:border-orange-500 focus:bg-white outline-none transition-all ${
                     authError ? 'border-red-400 bg-red-50 animate-shake' : 'border-slate-200'
                   }`}
                 />
                 {authError && (
                   <p className="text-[10px] text-red-600 font-black uppercase tracking-wider flex items-center justify-center gap-1">
                     <AlertCircle size={12}/> Kata laluan salah. Sila cuba lagi.
                   </p>
                 )}
               </div>

               <button 
                 type="submit"
                 className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg shadow-orange-200 active:scale-95 transition-all"
               >
                 Buka Panel Kawalan
               </button>
            </form>
          </div>
        ) : (
          <>
            {/* Top Navigation Tabs Bar */}
            <div className="flex bg-slate-100/80 border-b border-slate-200 p-2 overflow-x-auto no-scrollbar shrink-0 gap-1.5">
                {[
                    { id: 'monitor', label: 'Monitor & Urusetia', icon: <School size={16}/>, badge: schoolList.length },
                    { id: 'info', label: 'Info Kejohanan', icon: <Info size={16}/> },
                    { id: 'kawalan', label: 'Kawalan Portal', icon: <Sliders size={16}/> },
                    { id: 'dokumen', label: 'Dokumen Hebahan', icon: <FileText size={16}/>, badge: '7' },
                    { id: 'jadual', label: 'Jadual Acara', icon: <Calendar size={16}/> },
                    { id: 'pautan', label: 'Pautan Rasmi', icon: <Link size={16}/> },
                    { id: 'ecert', label: 'Sijil E-Cert', icon: <CheckCircle2 size={16}/> },
                    { id: 'system', label: 'Skrip Backend (GAS)', icon: <Database size={16}/> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0 ${
                            activeTab === tab.id 
                              ? 'bg-white text-orange-600 shadow-sm border border-slate-200' 
                              : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                        }`}
                    >
                        {tab.icon} 
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                            activeTab === tab.id ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {tab.badge}
                          </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Scrollable Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 bg-slate-50/60 no-scrollbar">
                {error && (
                    <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-start gap-3 text-xs font-bold text-red-800 animate-shake">
                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="font-black text-red-900 uppercase">Ralat Sistem</p>
                            <p className="font-medium text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* TAB 1: MONITOR & URUSETIA (Sekolah & Dokumen & Catatan Urusetia) */}
                {activeTab === 'monitor' && (
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* Executive Monitoring KPI Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[10px] font-black uppercase tracking-wider">Jumlah Sekolah</span>
                          <School size={18} className="text-orange-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-800">{monitorStats.totalSchools}</span>
                          <span className="text-[10px] font-bold text-slate-500">
                            (SR: {monitorStats.sr} | SM: {monitorStats.sm})
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold mt-1">
                          {monitorStats.totalStudents} Jumlah Peserta
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-emerald-700">
                          <span className="text-[10px] font-black uppercase tracking-wider">Dokumen Lengkap</span>
                          <CheckCircle2 size={18} className="text-emerald-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-emerald-800">{monitorStats.docsLengkap}</span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {monitorStats.totalSchools > 0 ? Math.round((monitorStats.docsLengkap / monitorStats.totalSchools) * 100) : 0}%
                          </span>
                        </div>
                        <span className="text-[9px] text-emerald-600 font-bold mt-1">4 daripada 4 slot lengkap</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-blue-700">
                          <span className="text-[10px] font-black uppercase tracking-wider">Sebahagian / Dihantar</span>
                          <Clock size={18} className="text-blue-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-blue-800">{monitorStats.docsSebahagian}</span>
                          <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                            {monitorStats.totalSchools > 0 ? Math.round((monitorStats.docsSebahagian / monitorStats.totalSchools) * 100) : 0}%
                          </span>
                        </div>
                        <span className="text-[9px] text-blue-600 font-bold mt-1">Sedang menunggu baki dokumen</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-amber-700">
                          <span className="text-[10px] font-black uppercase tracking-wider">Perlu Tindakan</span>
                          <AlertTriangle size={18} className="text-amber-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-amber-800">{monitorStats.docsPerlu + monitorStats.docsBelum}</span>
                          <span className="text-[10px] font-bold text-amber-700">
                            ({monitorStats.docsPerlu} Teguran | {monitorStats.docsBelum} Belum)
                          </span>
                        </div>
                        <span className="text-[9px] text-amber-700 font-bold mt-1">Perlu semakan semula / pembetulan</span>
                      </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                      {/* Search Input */}
                      <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Cari nama sekolah, kod, ID atau nama guru..."
                          className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-orange-500 outline-none transition-all"
                        />
                        {searchTerm && (
                          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Filters */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* School Type Filter */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                          <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${filterType === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            Semua
                          </button>
                          <button
                            onClick={() => setFilterType('SR')}
                            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${filterType === 'SR' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            SR
                          </button>
                          <button
                            onClick={() => setFilterType('SM')}
                            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${filterType === 'SM' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            SM
                          </button>
                        </div>

                        {/* Document Status Filter */}
                        <select
                          value={filterDocStatus}
                          onChange={(e) => setFilterDocStatus(e.target.value as any)}
                          className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-orange-500"
                        >
                          <option value="all">Semua Status Dokumen</option>
                          <option value="LENGKAP">✅ Dokumen Lengkap</option>
                          <option value="SEBAHAGIAN">⏳ Sebahagian Dihantar</option>
                          <option value="PERLU PEMBETULAN">⚠️ Perlu Pembetulan</option>
                          <option value="BELUM HANTAR">❌ Belum Hantar</option>
                        </select>
                      </div>
                    </div>

                    {/* School Cards Monitoring List */}
                    <div className="space-y-4">
                      {filteredSchools.length === 0 ? (
                        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-2">
                          <School size={36} className="text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-500">Tiada sekolah ditemui mengikut tapisan carian ini.</p>
                          <button 
                            onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterDocStatus('all'); }} 
                            className="text-[11px] font-black text-orange-600 hover:underline uppercase"
                          >
                            Set Semula Tapisan
                          </button>
                        </div>
                      ) : (
                        filteredSchools.map(({ id, reg }) => {
                          const schoolTypeUpper = (reg.schoolType || '').toUpperCase();
                          const isSR = schoolTypeUpper.includes('RENDAH') || schoolTypeUpper === 'SR';
                          const isExpanded = expandedSchoolId === id;
                          const teacher = reg.teachers?.[0];
                          const docStatus = reg.documentStatus || 'BELUM HANTAR';
                          const currentNote = notesDraft[id] !== undefined ? notesDraft[id] : (reg.adminNotes || '');
                          const currentStatus = statusDraft[id] !== undefined ? statusDraft[id] : docStatus;
                          const isSavingThis = savingNoteId === id;
                          const isSavedThis = savedNoteSuccessId === id;

                          return (
                            <div 
                              key={id} 
                              className={`bg-white rounded-2xl border transition-all shadow-xs ${
                                docStatus === 'PERLU PEMBETULAN' ? 'border-red-200 bg-red-50/10' :
                                docStatus === 'LENGKAP' ? 'border-emerald-200' :
                                'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {/* Header Card Row */}
                              <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                      {id}
                                    </span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                      isSR ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {isSR ? 'SR (Sekolah Rendah)' : 'SM (Sekolah Menengah)'}
                                    </span>
                                    {reg.schoolCode && (
                                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase bg-slate-50 px-1.5 py-0.5 rounded">
                                        Kod: {reg.schoolCode}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                      {reg.students?.length || 0} Pelajar
                                    </span>
                                  </div>

                                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight truncate">
                                    {reg.schoolName || 'Nama Sekolah'}
                                  </h3>

                                  {/* Contact Info Preview */}
                                  {teacher && (
                                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                                      <span className="font-bold text-slate-700">👨‍🏫 {teacher.name}</span>
                                      {teacher.phone && (
                                        <a 
                                          href={`https://wa.me/${teacher.phone.replace(/\D/g, '')}`} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                        >
                                          <Phone size={10} /> {teacher.phone} (WhatsApp)
                                        </a>
                                      )}
                                      {teacher.email && (
                                        <span className="text-slate-400 font-mono text-[10px]">{teacher.email}</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Right Side: Status Badge & Actions */}
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                                    docStatus === 'LENGKAP' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                    docStatus === 'SEBAHAGIAN' || docStatus === 'DIHANTAR' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                    docStatus === 'PERLU PEMBETULAN' ? 'bg-red-100 text-red-800 border-red-300' :
                                    'bg-amber-100 text-amber-800 border-amber-300'
                                  }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                    {docStatus}
                                  </span>

                                  <button
                                    onClick={() => setExpandedSchoolId(isExpanded ? null : id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                      isExpanded 
                                        ? 'bg-slate-800 text-white' 
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {isExpanded ? 'Tutup Butiran' : 'Semak & Catat'}
                                    <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                  </button>
                                </div>
                              </div>

                              {/* Active Catatan Urusetia Banner if exists */}
                              {reg.adminNotes && !isExpanded && (
                                <div className="mx-4 mb-4 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-start gap-2">
                                  <span className="text-[10px] font-black text-amber-900 uppercase shrink-0 bg-amber-200/80 px-1.5 py-0.5 rounded">
                                    Catatan Urusetia:
                                  </span>
                                  <span className="text-slate-700 font-medium">{reg.adminNotes}</span>
                                </div>
                              )}

                              {/* Expanded Detailed Section (4 Documents + Interactive Note Editor) */}
                              {isExpanded && (
                                <div className="p-4 md:p-6 bg-slate-50/80 border-t border-slate-200 rounded-b-2xl space-y-5 animate-fadeIn">
                                  
                                  {/* 4 Document Status & View Slots */}
                                  <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                      <FileText size={13} className="text-orange-600" />
                                      Pautan 4 Dokumen Pendaftaran Sekolah:
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                      {[
                                        {
                                          label: isSR ? '1. Borang R01' : '1. Borang M01',
                                          url: reg.docFormUrl,
                                          fileName: reg.docFormFileName
                                        },
                                        {
                                          label: isSR ? '2. Salinan MyKid' : '2. Salinan IC / Pasport',
                                          url: reg.docIdUrl,
                                          fileName: reg.docIdFileName
                                        },
                                        {
                                          label: '3. Kebenaran Kejohanan',
                                          url: reg.docParentConsentUrl,
                                          fileName: reg.docParentConsentFileName
                                        },
                                        {
                                          label: '4. Kebenaran Media',
                                          url: reg.docMediaConsentUrl,
                                          fileName: reg.docMediaConsentFileName
                                        }
                                      ].map((doc, idx) => (
                                        <div 
                                          key={idx} 
                                          className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                                            doc.url 
                                              ? 'bg-white border-emerald-200 shadow-xs' 
                                              : 'bg-slate-100/60 border-slate-200 text-slate-400'
                                          }`}
                                        >
                                          <div className="mb-2">
                                            <span className="text-[9px] font-black uppercase text-slate-500 block">
                                              {doc.label}
                                            </span>
                                            <p className="text-[10px] font-bold text-slate-700 truncate mt-0.5" title={doc.fileName || ''}>
                                              {doc.fileName || (doc.url ? 'Fail Dimuat Naik' : 'Tiada fail dihantar')}
                                            </p>
                                          </div>

                                          {doc.url ? (
                                            <a 
                                              href={doc.url} 
                                              target="_blank" 
                                              rel="noreferrer" 
                                              className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all"
                                            >
                                              <ExternalLink size={10} /> Buka Fail
                                            </a>
                                          ) : (
                                            <span className="text-[9px] font-bold text-slate-400 text-center py-1 bg-slate-200/50 rounded-lg">
                                              Belum Dihantar
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Interactive Urusetia Action Panel (Update Catatan Urusetia & Status) */}
                                  <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                        <MessageSquare size={14} className="text-orange-600" />
                                        Kemaskini Catatan & Status Urusetia Untuk Sekolah Ini:
                                      </h4>

                                      {/* Document Status Selector */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Status:</span>
                                        <select
                                          value={currentStatus}
                                          onChange={(e) => setStatusDraft(prev => ({ ...prev, [id]: e.target.value }))}
                                          className="text-xs font-black px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                                        >
                                          <option value="LENGKAP">LENGKAP (Disahkan)</option>
                                          <option value="SEBAHAGIAN">SEBAHAGIAN (Menunggu)</option>
                                          <option value="PERLU PEMBETULAN">PERLU PEMBETULAN</option>
                                          <option value="BELUM HANTAR">BELUM HANTAR</option>
                                        </select>
                                      </div>
                                    </div>

                                    {/* Textarea for Note */}
                                    <textarea
                                      rows={2}
                                      value={currentNote}
                                      onChange={(e) => setNotesDraft(prev => ({ ...prev, [id]: e.target.value }))}
                                      placeholder="Masukkan arahan atau ulasan urusetia untuk sekolah ini (cth: 'Sila muat naik semula Borang R01 yang telah dicop Guru Besar')..."
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-orange-500 outline-none transition-all"
                                    />

                                    {/* Quick Preset Remark Buttons */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Templat Catatan:</span>
                                      {[
                                        { text: '✅ Dokumen disemak dan lengkap disahkan.', status: 'LENGKAP' },
                                        { text: '⚠️ Sila muat naik semula Borang rasmi bertandatangan & cop Pengetua/Guru Besar.', status: 'PERLU PEMBETULAN' },
                                        { text: '⚠️ Salinan Kad Pengenalan / MyKid tidak lengkap atau kabur.', status: 'PERLU PEMBETULAN' },
                                        { text: '⚠️ Borang Kebenaran Ibu Bapa / Media belum dimuat naik.', status: 'PERLU PEMBETULAN' }
                                      ].map((preset, pIdx) => (
                                        <button
                                          key={pIdx}
                                          type="button"
                                          onClick={() => {
                                            setNotesDraft(prev => ({ ...prev, [id]: preset.text }));
                                            setStatusDraft(prev => ({ ...prev, [id]: preset.status }));
                                          }}
                                          className="text-[9px] font-bold px-2 py-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-600 rounded-lg transition-colors border border-slate-200"
                                        >
                                          {preset.text.slice(0, 32)}...
                                        </button>
                                      ))}
                                    </div>

                                    {/* Save Button & Feedback */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                      <div>
                                        {isSavedThis && (
                                          <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 animate-fadeIn">
                                            <CheckCircle2 size={12} /> Catatan & status berjaya disimpan ke Cloud!
                                          </span>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        disabled={isSavingThis}
                                        onClick={() => handleSaveAdminNote(id, reg)}
                                        className="px-4 py-2 bg-slate-800 hover:bg-black text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 uppercase tracking-wider"
                                      >
                                        {isSavingThis ? (
                                          <><RefreshCw size={13} className="animate-spin" /> Menyimpan...</>
                                        ) : (
                                          <><Save size={13} /> Simpan Catatan Urusetia</>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* List of Registered Students & Teachers */}
                                  <div className="grid md:grid-cols-2 gap-4 pt-1">
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">
                                        Guru Pengiring ({reg.teachers?.length || 0})
                                      </span>
                                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {reg.teachers?.map((t, tIdx) => (
                                          <div key={tIdx} className="text-[11px] p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                                            <span className="font-bold text-slate-700">{t.name}</span>
                                            <span className="text-[9px] font-black text-orange-600 uppercase">{t.position}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">
                                        Senarai Peserta ({reg.students?.length || 0})
                                      </span>
                                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {reg.students?.map((s, sIdx) => (
                                          <div key={sIdx} className="text-[11px] p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                                            <span className="font-bold text-slate-700 truncate pr-2">{sIdx + 1}. {s.name}</span>
                                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 shrink-0">
                                              {s.category || '-'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                )}

                {/* TAB 2: INFO KEJOHANAN (Dengan Tarikh-tarikh Lengkap) */}
                {activeTab === 'info' && (
                    <div className="space-y-6 animate-fadeIn max-w-4xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Card 1: Profil Rasmi Kejohanan */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100 flex items-center gap-2">
                                  <School size={16} className="text-orange-600"/> Profil Rasmi Kejohanan
                                </h4>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Nama Rasmi Kejohanan *</label>
                                    <input 
                                      type="text" 
                                      value={config.eventName} 
                                      onChange={(e) => setConfig({...config, eventName: e.target.value})} 
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white outline-none transition-all font-black text-sm text-orange-600" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">Lokasi / Venue Kejohanan *</label>
                                    <input 
                                      type="text" 
                                      value={config.eventVenue} 
                                      onChange={(e) => setConfig({...config, eventVenue: e.target.value})} 
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-xs" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">No. Telefon Urusetia / Admin *</label>
                                    <input 
                                      type="text" 
                                      value={config.adminPhone} 
                                      onChange={(e) => setConfig({...config, adminPhone: e.target.value})} 
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-xs font-mono" 
                                      placeholder="601110000000"
                                    />
                                </div>
                            </div>

                            {/* Card 2: Tarikh-Tarikh Penting */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100 flex items-center gap-2">
                                  <Clock size={16} className="text-orange-600"/> Tarikh-Tarikh Penting Kejohanan
                                </h4>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">📅 Tarikh Kejohanan</label>
                                    <input 
                                      type="text" 
                                      value={config.tournamentDate || ''} 
                                      onChange={(e) => setConfig({...config, tournamentDate: e.target.value})} 
                                      placeholder="Contoh: 1 - 3 OGOS 2026"
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-xs" 
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Dipaparkan pada bahagian header sistem untuk rujukan umum.</p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">⏰ Tarikh Tutup Pendaftaran</label>
                                    <input 
                                      type="text" 
                                      value={config.registrationDeadline || ''} 
                                      onChange={(e) => setConfig({...config, registrationDeadline: e.target.value})} 
                                      placeholder="Contoh: 30 JULAI 2026, 5:00 PM"
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-xs text-red-600" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">💵 Tarikh Akhir Pembayaran</label>
                                    <input 
                                      type="text" 
                                      value={config.paymentDeadline || ''} 
                                      onChange={(e) => setConfig({...config, paymentDeadline: e.target.value})} 
                                      placeholder="Contoh: 30 JULAI 2026, 12:00 TENGAHARI"
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-xs text-emerald-700" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: KAWALAN PORTAL (Suis Sistem Buka/Tutup) */}
                {activeTab === 'kawalan' && (
                  <div className="space-y-6 animate-fadeIn max-w-4xl">
                    <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 text-xs font-semibold text-orange-950 flex items-center gap-2.5">
                      <Sliders size={18} className="text-orange-600 shrink-0" />
                      <span>Kawal pembukaan modul portal pendaftaran untuk sekolah dan guru. Sebarang perubahan akan disimpan ke Google Sheet apabila menekan butang Kemaskini Cloud.</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          key: 'isRegistrationOpen' as const,
                          title: 'Modul Pendaftaran Baru',
                          desc: 'Membenarkan sekolah untuk menghantar pendaftaran kontingen baharu.',
                          isOpen: config.isRegistrationOpen !== false,
                          setIsOpen: (val: boolean) => setConfig({ ...config, isRegistrationOpen: val })
                        },
                        {
                          key: 'isUpdateOpen' as const,
                          title: 'Modul Semakan & Kemaskini',
                          desc: 'Membenarkan guru menyemak data dan memuat naik 4 slot dokumen sokongan.',
                          isOpen: config.isUpdateOpen !== false,
                          setIsOpen: (val: boolean) => setConfig({ ...config, isUpdateOpen: val })
                        },
                        {
                          key: 'isPrintOpen' as const,
                          title: 'Modul Cetakan Slip Pendaftaran',
                          desc: 'Membenarkan guru memuat turun dan mencetak slip rasmi penyertaan kejohanan.',
                          isOpen: config.isPrintOpen !== false,
                          setIsOpen: (val: boolean) => setConfig({ ...config, isPrintOpen: val })
                        },
                        {
                          key: 'isEcertOpen' as const,
                          title: 'Modul Cetakan E-Cert',
                          desc: 'Membenarkan murid & guru menjana dan memuat turun e-sijil penyertaan kejohanan.',
                          isOpen: config.isEcertOpen !== false,
                          setIsOpen: (val: boolean) => setConfig({ ...config, isEcertOpen: val })
                        }
                      ].map((modul) => (
                        <div 
                          key={modul.key} 
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                            modul.isOpen ? 'bg-white border-emerald-200 shadow-xs' : 'bg-slate-100/70 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">
                                {modul.title}
                              </h4>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                modul.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {modul.isOpen ? '● DIBUKA' : '○ DITUTUP'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-4">
                              {modul.desc}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Status Modul: <strong className={modul.isOpen ? 'text-emerald-700' : 'text-slate-600'}>{modul.isOpen ? 'Aktif' : 'Tidak Aktif'}</strong>
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={modul.isOpen} 
                                onChange={(e) => modul.setIsOpen(e.target.checked)} 
                              />
                              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: DOKUMEN HEBAHAN (7 Dokumen Penganjur) */}
                {activeTab === 'dokumen' && (
                    <div className="space-y-6 animate-fadeIn max-w-4xl">
                        <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 text-xs font-semibold text-orange-950">
                            Pautan dokumen di bawah dipaparkan secara rasmi di menu <strong>Info / Dokumen</strong> untuk dimuat turun oleh kontinjen sekolah, guru, dan peserta.
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { key: 'borangR01', label: 'Borang R01 (Sekolah Rendah)', desc: 'Borang pendaftaran individu rasmi MSSD murid Rendah' },
                                { key: 'borangM01', label: 'Borang M01 (Sekolah Menengah)', desc: 'Borang pendaftaran individu rasmi MSSD murid Menengah' },
                                { key: 'kebenaranKejohanan', label: 'Surat Kebenaran Kejohanan', desc: 'Surat pelepasan dan kebenaran ibu bapa/penjaga' },
                                { key: 'kebenaranMedia', label: 'Surat Kebenaran Media', desc: 'Surat persetujuan penyiaran foto/video murid' },
                                { key: 'invitation', label: 'Surat Jemputan Kejohanan', desc: 'Surat rasmi jemputan kontinjen sekolah' },
                                { key: 'meeting', label: 'Surat Mesyuarat Pengurus', desc: 'Notis mesyuarat pengurus pasukan dan taklimat' },
                                { key: 'arbiter', label: 'Surat Lantikan Arbiter', desc: 'Surat rasmi lantikan arbiter/pegawai teknikal' }
                            ].map(({ key, label, desc }) => {
                                const currentUrl = (config.documents as any)?.[key] || '';
                                return (
                                  <div key={key} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                                      <div>
                                          <div className="flex items-center justify-between mb-1">
                                              <label className="block text-xs font-black text-slate-800 uppercase tracking-tight">{label}</label>
                                              <span className="text-[9px] font-bold text-slate-400 font-mono">{key}</span>
                                          </div>
                                          <p className="text-[10px] text-slate-500 mb-3 font-medium">{desc}</p>
                                      </div>

                                      <div className="space-y-2">
                                          <input 
                                              type="text" 
                                              value={currentUrl} 
                                              onChange={(e) => setConfig({
                                                  ...config, 
                                                  documents: { ...config.documents, [key]: e.target.value }
                                              })} 
                                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white outline-none transition-all font-mono text-[11px] text-blue-700" 
                                              placeholder="https://drive.google.com/..." 
                                          />
                                          
                                          {currentUrl && (
                                            <div className="flex justify-end">
                                              <a 
                                                href={currentUrl} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="text-[9px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 uppercase"
                                              >
                                                <ExternalLink size={10} /> Uji Pautan
                                              </a>
                                            </div>
                                          )}
                                      </div>
                                  </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB 5: JADUAL ACARA */}
                {activeTab === 'jadual' && (
                    <div className="space-y-6 animate-fadeIn max-w-4xl">
                        {/* Sub-selector Rendah vs Menengah */}
                        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                            <button
                              type="button"
                              onClick={() => setScheduleType('primary')}
                              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                scheduleType === 'primary' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              🏫 Sekolah Rendah
                            </button>
                            <button
                              type="button"
                              onClick={() => setScheduleType('secondary')}
                              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                scheduleType === 'secondary' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              🎓 Sekolah Menengah
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                <div>
                                  <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">
                                      {scheduleType === 'primary' ? 'Jadual Kejohanan: Sekolah Rendah' : 'Jadual Kejohanan: Sekolah Menengah'}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 font-medium">Urus masa dan tentatif pusingan perlawanan.</p>
                                </div>
                                <button 
                                  onClick={() => addScheduleDay(scheduleType)} 
                                  className="px-4 py-2 bg-slate-800 hover:bg-black text-white text-[10px] font-black rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-wider shadow-xs"
                                >
                                    <Plus size={14}/> Tambah Hari
                                </button>
                            </div>
                            
                            <div className="space-y-6">
                                {config.schedules[scheduleType]?.map((day, dIdx) => (
                                    <div key={dIdx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 relative group">
                                        <div className="flex items-center justify-between gap-4 mb-4">
                                          <input 
                                              type="text" 
                                              value={day.date} 
                                              onChange={(e) => {
                                                  const newConfig = {...config};
                                                  newConfig.schedules[scheduleType][dIdx].date = e.target.value;
                                                  setConfig(newConfig);
                                              }}
                                              placeholder="Tajuk Hari (Cth: HARI PERTAMA - 1 OGOS 2026)"
                                              className="font-black text-orange-600 bg-transparent outline-none border-b border-orange-200 focus:border-orange-500 text-sm uppercase py-1 flex-1"
                                          />
                                          <button 
                                            onClick={() => removeScheduleDay(scheduleType, dIdx)} 
                                            className="text-slate-400 hover:text-red-600 p-1.5 transition-colors"
                                            title="Padam Hari Ini"
                                          >
                                            <Trash2 size={16}/>
                                          </button>
                                        </div>

                                        <div className="space-y-2.5">
                                            {day.items.map((item, iIdx) => (
                                                <div key={iIdx} className="flex gap-2.5 items-center">
                                                    <input 
                                                      value={item.time} 
                                                      onChange={(e) => updateScheduleItem(scheduleType, dIdx, iIdx, 'time', e.target.value)} 
                                                      placeholder="Masa (8.00 PG)" 
                                                      className="w-28 text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-orange-500 outline-none" 
                                                    />
                                                    <input 
                                                      value={item.activity} 
                                                      onChange={(e) => updateScheduleItem(scheduleType, dIdx, iIdx, 'activity', e.target.value)} 
                                                      placeholder="Aktiviti / Perlawanan" 
                                                      className="flex-1 text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl focus:border-orange-500 outline-none" 
                                                    />
                                                    <button 
                                                      onClick={() => removeScheduleItem(scheduleType, dIdx, iIdx)} 
                                                      className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                                                      title="Padam Slot"
                                                    >
                                                      <Trash2 size={15}/>
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            <button 
                                              onClick={() => addScheduleItem(scheduleType, dIdx)} 
                                              className="w-full py-2.5 bg-white hover:bg-orange-50 text-orange-600 text-[10px] font-black rounded-xl border border-dashed border-orange-200 flex items-center justify-center gap-1.5 transition-all uppercase tracking-wider"
                                            >
                                                <Plus size={13}/> Tambah Slot Masa
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 6: PAUTAN RASMI */}
                {activeTab === 'pautan' && (
                    <div className="space-y-6 animate-fadeIn max-w-3xl">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100 flex items-center gap-2">
                              <Link size={16} className="text-orange-600"/> Pautan Luar & Media Kejohanan
                            </h4>

                            {[
                              { key: 'rules', label: 'Buku Peraturan & Syarat Pertandingan', icon: '📖' },
                              { key: 'results', label: 'Pautan Keputusan Rasmi (Chess-Results)', icon: '♟️' },
                              { key: 'photos', label: 'Galeri Foto & Dokumentasi Kejohanan', icon: '📸' }
                            ].map(({ key, label, icon }) => (
                              <div key={key}>
                                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                                    {icon} {label}
                                  </label>
                                  <input 
                                    type="text" 
                                    value={(config.links as any)?.[key] || ''} 
                                    onChange={(e) => setConfig({
                                      ...config, 
                                      links: { ...config.links, [key]: e.target.value }
                                    })} 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white outline-none transition-all font-mono text-xs text-blue-700" 
                                    placeholder="https://..." 
                                  />
                              </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 7: SIJIL E-CERT */}
                {activeTab === 'ecert' && (
                    <div className="space-y-6 animate-fadeIn max-w-5xl">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-1">
                                  Tetapan Format & Segerak E-Cert
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Laras orientasi (Potret/Landskap) dan koordinat kedudukan teks pada templat sijil.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleSaveEcert}
                                disabled={isSavingEcert || isSaving}
                                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
                            >
                                {isSavingEcert ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Menyegerak...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={15} />
                                        <span>Segerak E-Cert ke Sheet</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {ecertSaveSuccess && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-fadeIn">
                                <Check size={16} className="text-emerald-600 shrink-0" />
                                <span>{ecertSaveSuccess}</span>
                            </div>
                        )}
                        
                        {!config.ecertTemplates || config.ecertTemplates.length === 0 ? (
                            <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                                <p className="text-xs font-bold text-slate-500">Tiada templat E-Cert dijumpai dalam Sheet "ECERT".</p>
                            </div>
                        ) : (
                            <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
                                {config.ecertTemplates.map(template => (
                                    <button 
                                        key={template.id}
                                        onClick={() => setActiveEcertTab(template.id)}
                                        className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
                                          activeEcertTab === template.id 
                                            ? 'bg-orange-600 text-white shadow-sm' 
                                            : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                    >
                                        {template.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {config.ecertTemplates && activeEcertTab && config.ecertTemplates.find(t => t.id === activeEcertTab) && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Side: Controls */}
                                <div className="space-y-4">
                                    {(() => {
                                        const templateIndex = config.ecertTemplates!.findIndex(t => t.id === activeEcertTab);
                                        const template = config.ecertTemplates![templateIndex];

                                        return (
                                            <div key="orientation" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                                <div className="flex items-center justify-between mb-3">
                                                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider">Orientasi Kertas (A4)</label>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${template.orientation === 'portrait' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {template.orientation === 'portrait' ? 'Menegak (Portrait)' : 'Mendatar (Landscape)'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${template.orientation !== 'portrait' ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-black' : 'border-slate-200 hover:border-slate-300 text-slate-600 font-bold'}`}>
                                                        <input 
                                                            type="radio" 
                                                            name={`orientation-${template.id}`} 
                                                            value="landscape" 
                                                            checked={template.orientation !== 'portrait'} 
                                                            onChange={() => {
                                                                const newTemplates = [...config.ecertTemplates!];
                                                                newTemplates[templateIndex] = { ...template, orientation: 'landscape' };
                                                                setConfig({...config, ecertTemplates: newTemplates});
                                                            }} 
                                                        />
                                                        <span className="text-xs">🖼️ Mendatar (Landscape)</span>
                                                    </label>
                                                    <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${template.orientation === 'portrait' ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-black' : 'border-slate-200 hover:border-slate-300 text-slate-600 font-bold'}`}>
                                                        <input 
                                                            type="radio" 
                                                            name={`orientation-${template.id}`} 
                                                            value="portrait" 
                                                            checked={template.orientation === 'portrait'} 
                                                            onChange={() => {
                                                                const newTemplates = [...config.ecertTemplates!];
                                                                newTemplates[templateIndex] = { ...template, orientation: 'portrait' };
                                                                setConfig({...config, ecertTemplates: newTemplates});
                                                            }} 
                                                        />
                                                        <span className="text-xs">📄 Menegak (Portrait)</span>
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    
                                    {['name', 'ic', 'school', 'category'].map((fieldKey) => {
                                        const templateIndex = config.ecertTemplates!.findIndex(t => t.id === activeEcertTab);
                                        const template = config.ecertTemplates![templateIndex];
                                        const field = template.fields[fieldKey as keyof typeof template.fields];
                                        const labels: any = { name: 'Nama Pelajar', ic: 'No Kad Pengenalan', school: 'Nama Sekolah', category: 'Kategori (Cth: L12)' };
                                        
                                        return (
                                            <div key={fieldKey} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">{labels[fieldKey]}</label>
                                                        {fieldKey === 'name' && (
                                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                                                                Sokong 2 Baris Pintar
                                                            </span>
                                                        )}
                                                    </div>
                                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={field.show} 
                                                            onChange={(e) => {
                                                                const newTemplates = [...config.ecertTemplates!];
                                                                newTemplates[templateIndex] = {
                                                                    ...template,
                                                                    fields: { ...template.fields, [fieldKey]: { ...field, show: e.target.checked } }
                                                                };
                                                                setConfig({...config, ecertTemplates: newTemplates});
                                                            }} 
                                                        />
                                                        Tunjuk
                                                    </label>
                                                </div>
                                                
                                                {field.show && (
                                                    <div className="space-y-3 pt-2 border-t border-slate-100">
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Kedudukan X (%)</label>
                                                                <input type="number" value={field.x} onChange={e => {
                                                                    const newTemplates = [...config.ecertTemplates!];
                                                                    newTemplates[templateIndex] = {
                                                                        ...template,
                                                                        fields: { ...template.fields, [fieldKey]: { ...field, x: Number(e.target.value) } }
                                                                    };
                                                                    setConfig({...config, ecertTemplates: newTemplates});
                                                                }} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Kedudukan Y (%)</label>
                                                                <input type="number" value={field.y} onChange={e => {
                                                                    const newTemplates = [...config.ecertTemplates!];
                                                                    newTemplates[templateIndex] = {
                                                                        ...template,
                                                                        fields: { ...template.fields, [fieldKey]: { ...field, y: Number(e.target.value) } }
                                                                    };
                                                                    setConfig({...config, ecertTemplates: newTemplates});
                                                                }} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Saiz Font (px)</label>
                                                                <input type="number" value={field.fontSize} onChange={e => {
                                                                    const newTemplates = [...config.ecertTemplates!];
                                                                    newTemplates[templateIndex] = {
                                                                        ...template,
                                                                        fields: { ...template.fields, [fieldKey]: { ...field, fontSize: Number(e.target.value) } }
                                                                    };
                                                                    setConfig({...config, ecertTemplates: newTemplates});
                                                                }} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Warna Teks</label>
                                                                <input type="color" value={field.color} onChange={e => {
                                                                    const newTemplates = [...config.ecertTemplates!];
                                                                    newTemplates[templateIndex] = {
                                                                        ...template,
                                                                        fields: { ...template.fields, [fieldKey]: { ...field, color: e.target.value } }
                                                                    };
                                                                    setConfig({...config, ecertTemplates: newTemplates});
                                                                }} className="w-full h-[32px] p-0.5 border border-slate-200 rounded-lg cursor-pointer bg-white" />
                                                            </div>
                                                        </div>

                                                        {/* Extra Controls: Had Lebar (%) & Penjajaran */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <label className="block text-[10px] font-black text-slate-700 uppercase">
                                                                        Had Lebar / Max Width (%)
                                                                    </label>
                                                                    <span className="text-[9px] text-orange-600 font-bold">{field.maxWidth || 75}%</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <input 
                                                                        type="number" 
                                                                        min="20"
                                                                        max="100"
                                                                        value={field.maxWidth || 75} 
                                                                        placeholder="75"
                                                                        onChange={e => {
                                                                            const newTemplates = [...config.ecertTemplates!];
                                                                            newTemplates[templateIndex] = {
                                                                                ...template,
                                                                                fields: { ...template.fields, [fieldKey]: { ...field, maxWidth: Number(e.target.value) || 75 } }
                                                                            };
                                                                            setConfig({...config, ecertTemplates: newTemplates});
                                                                        }} 
                                                                        className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white font-bold" 
                                                                    />
                                                                    <span className="text-[10px] text-slate-400">Cadangan: 65% - 80%</span>
                                                                </div>
                                                                <p className="text-[9px] text-slate-500 mt-1">
                                                                    {fieldKey === 'name' 
                                                                        ? 'Nama melebihi lebar ini automatik dibahagikan 2 baris seimbang supaya tidak meleret.' 
                                                                        : 'Mengehadkan panjang teks agar tidak melepasi sempadan sijil.'}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">
                                                                    Penjajaran (Align)
                                                                </label>
                                                                <div className="grid grid-cols-3 gap-1">
                                                                    {(['left', 'center', 'right'] as const).map((alignChoice) => (
                                                                        <button
                                                                            key={alignChoice}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newTemplates = [...config.ecertTemplates!];
                                                                                newTemplates[templateIndex] = {
                                                                                    ...template,
                                                                                    fields: { ...template.fields, [fieldKey]: { ...field, align: alignChoice } }
                                                                                };
                                                                                setConfig({...config, ecertTemplates: newTemplates});
                                                                            }}
                                                                            className={`py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                                                                (field.align || 'center') === alignChoice
                                                                                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                                            }`}
                                                                        >
                                                                            {alignChoice === 'left' ? 'Kiri' : alignChoice === 'center' ? 'Tengah' : 'Kanan'}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Right Side: Live Preview */}
                                <div>
                                    <div className="sticky top-4">
                                        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pratonton Langsung</p>
                                                    <p className="text-[9px] text-slate-500 font-semibold">Uji saiz & rupa nama 2-baris</p>
                                                </div>
                                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewLongName(false)}
                                                        className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${!previewLongName ? 'bg-white text-orange-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        Nama Biasa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewLongName(true)}
                                                        className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all ${previewLongName ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        Nama Panjang (2-Baris)
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {(() => {
                                                const template = config.ecertTemplates!.find(t => t.id === activeEcertTab)!;
                                                const dummyData: any = {
                                                    name: previewLongName 
                                                        ? 'MUHAMMAD NUR SYAHMI DANIAL BIN MOHAMMAD SHAHRUL NIZAM'
                                                        : 'MUHAMMAD ALI BIN ABU BAKAR',
                                                    ic: '100203-01-1234',
                                                    school: 'SK BANDAR BARU PASIR GUDANG',
                                                    category: 'L12'
                                                };
                                                
                                                return (
                                                    <div className="relative w-full bg-slate-100 rounded-xl shadow-inner overflow-hidden border border-slate-200" 
                                                         style={{ 
                                                             aspectRatio: template.orientation === 'portrait' ? '1 / 1.414' : '1.414 / 1',
                                                             backgroundImage: template.backgroundUrl ? `url(${getDirectImageUrl(template.backgroundUrl)})` : 'none', 
                                                             backgroundSize: '100% 100%',
                                                             backgroundPosition: 'center',
                                                             backgroundRepeat: 'no-repeat'
                                                         }}>
                                                        {!template.backgroundUrl && (
                                                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                                                <p className="text-xs text-slate-400 font-bold text-center">URL Gambar tidak dijumpai.<br/>Sila masukkan url di ruangan Sheet "ECERT".</p>
                                                            </div>
                                                        )}
                                                        {['name', 'ic', 'school', 'category'].map(key => {
                                                            const field = template.fields[key as keyof typeof template.fields];
                                                            if (!field || !field.show) return null;
                                                            
                                                            let transform = 'translate(-50%, -50%)';
                                                            if (field.align === 'left') transform = 'translate(0, -50%)';
                                                            if (field.align === 'right') transform = 'translate(-100%, -50%)';
                                                            
                                                            const scaledFontSize = `calc(${field.fontSize}px * 0.7)`; 
                                                            const fontParts = (field.fontFamily || 'helvetica').split('-');
                                                            const fontName = fontParts[0];
                                                            const isBold = fontParts[1] === 'bold';
                                                            const isItalic = fontParts[1] === 'italic';

                                                            let cssFontFamily = 'sans-serif';
                                                            if (fontName === 'times') cssFontFamily = 'serif';
                                                            if (fontName === 'courier') cssFontFamily = 'monospace';

                                                            const effectiveMaxWidth = field.maxWidth || 75;
                                                            const rawText = dummyData[key];

                                                            // Check if 2 lines rendering for name
                                                            let isTwoLines = false;
                                                            let line1 = rawText;
                                                            let line2 = '';

                                                            if (key === 'name' && (previewLongName || rawText.length > 28)) {
                                                                const [p1, p2] = splitNameToTwoLines(rawText);
                                                                if (p2) {
                                                                    isTwoLines = true;
                                                                    line1 = p1;
                                                                    line2 = p2;
                                                                }
                                                            }

                                                            let style: React.CSSProperties = {
                                                                left: `${field.x}%`,
                                                                top: `${field.y}%`,
                                                                color: field.color,
                                                                fontSize: scaledFontSize,
                                                                transform: transform,
                                                                fontFamily: cssFontFamily,
                                                                fontWeight: isBold ? 'bold' : 'normal',
                                                                fontStyle: isItalic ? 'italic' : 'normal',
                                                                textAlign: (field.align || 'center') as any,
                                                                maxWidth: `${effectiveMaxWidth}%`,
                                                                width: 'max-content'
                                                            };

                                                            return (
                                                                <span 
                                                                    key={key} 
                                                                    className="absolute drop-shadow-sm transition-all"
                                                                    style={style}
                                                                >
                                                                    {isTwoLines ? (
                                                                        <span className="flex flex-col items-center justify-center leading-tight">
                                                                            <span>{line1}</span>
                                                                            <span>{line2}</span>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="leading-tight">{rawText}</span>
                                                                    )}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}

                                            <div className="mt-3 p-3 bg-amber-50 rounded-2xl border border-amber-200/60 text-amber-900 text-xs">
                                                <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
                                                    <Sparkles size={14} className="text-amber-600" /> Tips Paparan 2 Baris:
                                                </p>
                                                <p className="text-[11px] leading-relaxed text-amber-800/90">
                                                    Apabila nama pelajar panjang (cth: melebihi 28 aksara atau Had Lebar 75%), sistem sijil automatik membahagikan nama kepada 2 baris kemas di perkataan <b>BIN / BINTI / A/L</b>, dan mengimbangi kedudukan paksi Y secara menegak agar tidak menolak garisan lain ke bawah.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 8: SKRIP BACKEND (Google Apps Script) */}
                {activeTab === 'system' && (
                    <div className="space-y-6 animate-fadeIn max-w-4xl">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                        Google Apps Script (Backend) - Versi Terkini
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium mt-1">
                                        Menyokong 4 slot muat naik dokumen berasingan, auto-rename mengikut kod sekolah, dan pembahagian sub-folder Google Drive.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(getScriptContent());
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }} 
                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wider shrink-0"
                                >
                                    {copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'KOD TELAH DISALIN!' : 'SALIN KOD PENUH'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-black text-blue-800 uppercase block mb-1">1. Salin Kod</span>
                                    <p className="text-[10px] text-slate-600">Buka Sheet &gt; Extensions &gt; Apps Script. Gantikan semua kod lama dengan kod baharu ini.</p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                                    <span className="text-[10px] font-black text-amber-900 uppercase block mb-1">2. Benarkan Akses</span>
                                    <p className="text-[10px] text-slate-600">Pilih fungsi <code className="text-amber-800 font-bold">authorizeScript</code> &gt; Klik <strong>Run</strong> &gt; Review permissions &gt; Allow.</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-black text-blue-800 uppercase block mb-1">3. Folder Drive</span>
                                    <p className="text-[10px] text-slate-600">Set ID folder Google Drive sasaran di <code className="text-blue-700 font-bold">TARGET_FOLDER_ID</code>.</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-black text-blue-800 uppercase block mb-1">4. Deploy Versi Baru</span>
                                    <p className="text-[10px] text-slate-600">Klik Deploy &gt; Manage deployments &gt; Edit &gt; Pilih New version &gt; Deploy.</p>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden border border-slate-800">
                                <pre className="text-[10px] font-mono text-slate-300 h-80 overflow-y-auto custom-scrollbar select-all">
                                    {getScriptContent()}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="p-4 md:p-5 bg-white flex justify-between items-center border-t border-slate-200 shrink-0">
                <div className="text-[11px] font-bold text-slate-500">
                  {activeTab === 'monitor' ? (
                    <span>Memaparkan <strong className="text-slate-800">{filteredSchools.length}</strong> daripada {schoolList.length} buah sekolah</span>
                  ) : (
                    <span>Konfigurasi disimpan secara terus ke awan Google Sheets</span>
                  )}
                </div>

                <div className="flex gap-3">
                    <button 
                      onClick={onClose} 
                      className="px-6 py-2.5 font-black text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all uppercase text-xs"
                    >
                      Tutup
                    </button>
                    <button 
                      onClick={handleSaveAll} 
                      disabled={isSaving} 
                      className="px-7 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-xl font-black shadow-md shadow-orange-200 flex items-center gap-2 transition-all transform active:scale-95 uppercase text-xs tracking-wider"
                    >
                        {isSaving ? <><Loader2 className="animate-spin" size={16}/> Menyimpan...</> : <><Save size={16}/> Kemaskini Cloud</>}
                    </button>
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SetupModal;
