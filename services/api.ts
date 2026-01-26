
import { RegistrationsMap, EventConfig, ScheduleDay } from "../types";

const PG_SS_ID = '1fzAo5ZLVS_Bt7ZYg2QE1jolakE_99gL42IBW5x2e890';
const PG_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQt4Xm-dp_nyrUfX0UiHwdRxbxCwPbdhoKL6PpSqEGQBDvAPubFsT8aoP81dXucmdN/exec';

const DEFAULT_SCHEDULE: ScheduleDay[] = [
  { date: "HARI PERTAMA", items: [{ time: "8.00 pagi", activity: "Pendaftaran" }] }
];

const BASE_CONFIG: EventConfig = {
  eventName: "KEJOHANAN CATUR MSSD PASIR GUDANG 2026",
  eventVenue: "SK TAMAN PASIR PUTIH",
  adminPhone: "601110000000",
  schedules: { primary: DEFAULT_SCHEDULE, secondary: DEFAULT_SCHEDULE },
  links: { rules: "#", results: "https://chess-results.com", photos: "#" },
  documents: { invitation: "#", meeting: "#", arbiter: "#" }
};

export const getEventConfig = (): EventConfig => BASE_CONFIG;

const jsonpRequest = (url: string, params: Record<string, string>): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = 'cb_' + Math.random().toString(36).substring(7);
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Masa tamat. Cloud tidak merespon."));
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
    const result = await jsonpRequest(PG_SCRIPT_URL, { 
      action: 'loadAll', 
      spreadsheetId: PG_SS_ID 
    });
    return result;
  } catch (e: any) {
    return { error: e.message };
  }
};

export const updateRemoteConfig = async (config: EventConfig) => {
  const payload = {
    action: 'updateConfig',
    spreadsheetId: PG_SS_ID,
    config: config
  };
  return fetch(PG_SCRIPT_URL, { 
    method: 'POST', 
    mode: 'no-cors', 
    body: JSON.stringify(payload) 
  });
};

export const syncRegistration = async (regId: string, data: any, isUpdate = false) => {
  const payload = {
    action: isUpdate ? 'update' : 'submit',
    registrationId: regId,
    spreadsheetId: PG_SS_ID,
    ...data,
    timestamp: new Date().toISOString()
  };
  
  return fetch(PG_SCRIPT_URL, { 
    method: 'POST', 
    mode: 'no-cors', 
    body: JSON.stringify(payload) 
  });
};

export const searchRemoteRegistration = async (regId: string, password: string): Promise<any> => {
  return jsonpRequest(PG_SCRIPT_URL, {
    action: 'search',
    regId,
    password,
    spreadsheetId: PG_SS_ID
  });
};
