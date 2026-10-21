
import { RegistrationsMap, EventConfig, ScheduleDay } from "../types";

const PG_SS_ID = '1fzAo5ZLVS_Bt7ZYg2QE1jolakE_99gL42IBW5x2e890';
const PG_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWC9iylUvTB6fPpl6JtYAAeczatsmSd29RylR6m1_Zx7qUkAg1QhF0UNaUvYfZo3Kv/exec';

const DEFAULT_SCHEDULE: ScheduleDay[] = [
  { date: "HARI PERTAMA", items: [{ time: "8.00 pagi", activity: "Pendaftaran" }] }
];

const FALLBACK_CONFIG: EventConfig = {
  eventName: "KEJOHANAN CATUR MSSD PASIR GUDANG 2026",
  eventVenue: "SK TAMAN PASIR PUTIH",
  adminPhone: "601110000000",
  tournamentDate: "1 - 3 OGOS 2026",
  registrationDeadline: "30 JULAI 2026",
  paymentDeadline: "30 JULAI 2026",
  isRegistrationOpen: false,
  isUpdateOpen: false,
  isPrintOpen: false,
  isEcertOpen: false,
  schedules: { primary: DEFAULT_SCHEDULE, secondary: DEFAULT_SCHEDULE },
  links: { rules: "#", results: "https://chess-results.com", photos: "#" },
  documents: { invitation: "#", meeting: "#", arbiter: "#" }
};

export const getEventConfig = (): EventConfig => FALLBACK_CONFIG;

const jsonpRequest = (url: string, params: Record<string, string>): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = 'cb_' + Math.random().toString(36).substring(7);
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Masa tamat. Cloud Google tidak merespon."));
    }, 25000);

    const cleanup = () => {
      clearTimeout(timeout);
      delete (window as any)[callbackName];
      const s = document.getElementById(callbackName);
      if (s) s.remove();
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Gagal menyambung ke Cloud Google Script."));
    };

    const queryParams = { ...params, callback: callbackName, t: Date.now().toString() };
    const queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    
    script.id = callbackName;
    script.src = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    script.async = true;
    document.head.appendChild(script);
  });
};

export const loadAllData = async (): Promise<{ registrations?: RegistrationsMap, config?: EventConfig, error?: string }> => {
  try {
    // 1. Cuba panggil backend API server terlebih dahulu untuk kestabilan dan bypass sekatan browser
    try {
      const resp = await fetch(`/api/load-all?spreadsheetId=${encodeURIComponent(PG_SS_ID)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.config) {
          if (Array.isArray(data.config.ecertTemplates)) {
            data.config.ecertTemplates = data.config.ecertTemplates.map((t: any) => ({
              ...t,
              orientation: t.orientation || t.fields?.orientation || t.fields?._orientation || 'landscape'
            }));
          }
          return data;
        }
      } else {
        console.warn("Backend /api/load-all returned status:", resp.status);
      }
    } catch (err) {
      console.warn("Backend load-all error, falling back to JSONP:", err);
    }

    // 2. Fallback: Panggil Google Apps Script terus menggunakan JSONP
    try {
      const result = await jsonpRequest(PG_SCRIPT_URL, { 
        action: 'loadAll', 
        spreadsheetId: PG_SS_ID 
      });

      if (result && result.config) {
        if (Array.isArray(result.config.ecertTemplates)) {
          result.config.ecertTemplates = result.config.ecertTemplates.map((t: any) => ({
            ...t,
            orientation: t.orientation || t.fields?.orientation || t.fields?._orientation || 'landscape'
          }));
        }
        return result;
      }
    } catch (jsonpErr) {
      console.warn("JSONP fallback failed:", jsonpErr);
    }

    // 3. Fallback ke Cache Tempatan (Offline / Server Glitch Resilience)
    try {
      const cachedConfig = localStorage.getItem('MSSD_CONFIG_CACHE');
      const cachedRegs = localStorage.getItem('MSSD_DATA_CACHE_V1');
      if (cachedConfig) {
        return {
          config: JSON.parse(cachedConfig),
          registrations: cachedRegs ? JSON.parse(cachedRegs) : {}
        };
      }
    } catch (cacheErr) {}

    return { error: "Gagal menyambung ke pangkalan data Google." };
  } catch (e: any) {
    return { error: e.message };
  }
};

export const updateRemoteConfig = async (config: EventConfig) => {
  // Pastikan orientasi dipelihara dalam setiap templat E-Cert
  const sanitizedConfig = {
    ...config,
    ecertTemplates: config.ecertTemplates?.map(t => ({
      ...t,
      orientation: t.orientation || 'landscape',
      fields: {
        ...t.fields,
        orientation: t.orientation || 'landscape'
      }
    }))
  };

  // 1. Panggil backend API server untuk menolak terus data ke Google Sheet
  try {
    const response = await fetch('/api/update-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        spreadsheetId: PG_SS_ID,
        config: sanitizedConfig
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Ralat pelayan: ${response.status}`);
    }
  } catch (backendError: any) {
    console.warn("Backend API save failed, attempting direct fetch fallback:", backendError);

    // 2. Fallback: Cuba simpan terus ke Google Apps Script
    const payload = {
      action: 'updateConfig',
      spreadsheetId: PG_SS_ID,
      config: sanitizedConfig
    };
    
    const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
    await fetch(PG_SCRIPT_URL, { 
      method: 'POST', 
      mode: 'no-cors', 
      body: blob 
    });

    return { success: true, fallback: true };
  }
};

export const syncRegistration = async (regId: string, data: any, isUpdate = false) => {
  const payload = {
    action: isUpdate ? 'update' : 'submit',
    registrationId: regId,
    spreadsheetId: PG_SS_ID,
    ...data,
    timestamp: new Date().toISOString()
  };

  // 1. Cuba melalui backend API server (paling stabil, elak sekatan pelayar & kendali redirect Google)
  try {
    const backendRes = await fetch('/api/sync-registration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      return data;
    } else {
      const errData = await backendRes.json().catch(() => ({}));
      if (errData.error) {
        throw new Error(errData.error);
      }
    }
  } catch (backendErr: any) {
    console.warn("Backend sync-registration gagal, mencuba panggilan terus ke Google Apps Script:", backendErr);
    if (backendErr.message && backendErr.message.includes('ReferenceError')) {
      throw backendErr;
    }
  }
  
  // 2. Fallback: Panggilan terus ke Google Apps Script
  const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
  const response = await fetch(PG_SCRIPT_URL, { 
    method: 'POST', 
    body: blob
  });
  return response.json();
};

export const searchRemoteRegistration = async (regId: string, password: string): Promise<any> => {
  return jsonpRequest(PG_SCRIPT_URL, {
    action: 'search',
    regId,
    password,
    spreadsheetId: PG_SS_ID
  });
};

export type DocumentType = 'borang' | 'ic' | 'kebenaran' | 'media' | 'all';

export const TARGET_DRIVE_FOLDER_ID = '1z8f7sHF_AOX39IJDhRYMZAM5tYejvDiR';

export const uploadDocument = async (params: {
  regId: string;
  schoolCode: string;
  schoolName: string;
  schoolType?: string;
  docType: DocumentType;
  base64File?: string;
  originalFileName?: string;
  driveUrl?: string;
  folderId?: string;
}): Promise<{ success: boolean; fileName?: string; fileUrl?: string; docType?: DocumentType; error?: string }> => {
  try {
    const cleanSchoolName = (params.schoolName || 'SEKOLAH').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const cleanSchoolCode = (params.schoolCode || 'KOD').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const cleanRegId = (params.regId || 'MSSD').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const isSecondary = (params.schoolType || '').toUpperCase().includes('MENENGAH');
    const folderId = params.folderId || TARGET_DRIVE_FOLDER_ID;

    let typeTag = 'DOKUMEN';
    if (params.docType === 'borang') {
      typeTag = isSecondary ? 'BORANG_M01' : 'BORANG_R01';
    } else if (params.docType === 'ic') {
      typeTag = 'SALINAN_IC_MYKID';
    } else if (params.docType === 'kebenaran') {
      typeTag = 'KEBENARAN_KEJOHANAN';
    } else if (params.docType === 'media') {
      typeTag = 'KEBENARAN_MEDIA';
    } else {
      typeTag = 'DOKUMEN_KOMPILASI';
    }

    const targetFileName = `${cleanSchoolCode}_${cleanSchoolName}_${typeTag}_${cleanRegId}.pdf`;

    // 1. Cuba panggil backend API server terlebih dahulu
    try {
      const resp = await fetch('/api/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          folderId: folderId,
          docType: params.docType,
          fileName: targetFileName
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        return {
          ...data,
          docType: params.docType
        };
      }
    } catch (backendErr) {
      console.warn("Backend upload failed, attempting direct Google Apps Script call:", backendErr);
    }

    // 2. Direct fallback ke Google Apps Script
    const payload = {
      action: 'uploadDocument',
      spreadsheetId: PG_SS_ID,
      regId: params.regId,
      schoolCode: cleanSchoolCode,
      schoolName: cleanSchoolName,
      schoolType: params.schoolType || '',
      docType: params.docType,
      fileName: targetFileName,
      base64File: params.base64File,
      driveUrl: params.driveUrl,
      folderId: folderId,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'text/plain' });
    const response = await fetch(PG_SCRIPT_URL, {
      method: 'POST',
      body: blob
    });
    
    try {
      const result = await response.json();
      return {
        ...result,
        fileName: targetFileName,
        docType: params.docType
      };
    } catch {
      return { 
        success: true, 
        fileName: targetFileName, 
        fileUrl: params.driveUrl || '',
        docType: params.docType
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat naik fail dokumen' };
  }
};

