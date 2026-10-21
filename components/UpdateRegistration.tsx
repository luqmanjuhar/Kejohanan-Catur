
import React, { useState, useRef } from 'react';
import { Search, Save, X, Plus, Trash2, AlertCircle, RefreshCw, Info, UploadCloud, FileCheck, ExternalLink, CheckCircle2, FileText, CheckSquare, Sparkles, FolderArchive } from 'lucide-react';
import { Teacher, Student, RegistrationsMap, EventConfig } from '../types';
import { searchRemoteRegistration, syncRegistration, uploadDocument } from '../services/api';
import { formatSchoolName, formatPhoneNumber, formatIC, isValidEmail, isValidMalaysianPhone } from '../utils/formatters';

interface UpdateRegistrationProps {
  localRegistrations: RegistrationsMap;
  onUpdateSuccess: (regId: string, updatedData: any) => void;
  eventConfig: EventConfig;
}

const UpdateRegistration: React.FC<UpdateRegistrationProps> = ({ localRegistrations, onUpdateSuccess, eventConfig }) => {
  const [regPart1, setRegPart1] = useState('');
  const [regPart2, setRegPart2] = useState('');
  const [searchPassword, setSearchPassword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingReg, setEditingReg] = useState<{ id: string; data: any } | null>(null);
  const [formErrors, setFormErrors] = useState<{teachers: Record<number, string[]>, students: Record<number, string[]>, schoolCode?: string}>({
    teachers: {},
    students: {}
  });

  // State untuk Muat Naik 4 Dokumen Berasingan
  const [selectedSlotFiles, setSelectedSlotFiles] = useState<{ [key: string]: File | null }>({});
  const [slotDriveInputs, setSlotDriveInputs] = useState<{ [key: string]: string }>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadDocSuccess, setUploadDocSuccess] = useState<string | null>(null);
  const [uploadDocError, setUploadDocError] = useState<string | null>(null);

  const part2Ref = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchError(null);
    setEditingReg(null);

    // Format ID: MSSD-XX-XX
    const fullRegId = `MSSD-${regPart1}-${regPart2}`;

    try {
        let found = localRegistrations[fullRegId];
        let isValid = false;

        if (found && found.teachers.length > 0) {
            const phone = (found.teachers[0].phone || '').replace(/\D/g, '');
            const last4 = phone.slice(-4);
            if (last4 === searchPassword) isValid = true;
        }

        if (isValid) {
            setEditingReg({ id: fullRegId, data: JSON.parse(JSON.stringify(found)) });
            setIsSearching(false);
            return;
        }

        const remoteResult = await searchRemoteRegistration(fullRegId, searchPassword);
        if (remoteResult.found && remoteResult.registration) {
             setEditingReg({ id: fullRegId, data: remoteResult.registration });
        } else {
             setSearchError(remoteResult.error || "Pendaftaran tidak dijumpai atau kata laluan salah.");
        }

    } catch (err: any) {
        setSearchError(err.message || "Ralat mencari pendaftaran.");
    } finally {
        setIsSearching(false);
    }
  };

  const validateEditForm = (): boolean => {
    if (!editingReg) return false;
    const errors: any = { teachers: {}, students: {} };
    let hasError = false;

    // Validate School Code: 3-4 letters + 3-4 alphanumeric
    const schoolCodeRegex = /^[A-Z]{3,4}[A-Z0-9]{3,4}$/;
    if (!schoolCodeRegex.test(editingReg.data.schoolCode)) {
        errors.schoolCode = "Format Kod Sekolah Salah (Contoh: JEA1057 atau ABC1234)";
        hasError = true;
    }

    editingReg.data.teachers.forEach((t: Teacher, i: number) => {
      const tErrors = [];
      if (!isValidEmail(t.email)) tErrors.push('Email tidak sah');
      if (!isValidMalaysianPhone(t.phone)) tErrors.push('No. Telefon tidak sah');
      if (t.ic && t.ic.replace(/\D/g, '').length !== 12) tErrors.push('IC tidak lengkap');
      if (tErrors.length > 0) {
        errors.teachers[i] = tErrors;
        hasError = true;
      }
    });

    editingReg.data.students.forEach((s: Student, i: number) => {
        const sErrors = [];
        if (!s.isNonCitizen) {
            if ((s.ic || '').replace(/\D/g, '').length !== 12) sErrors.push('IC tidak lengkap');
        } else {
            if (!s.ic || s.ic.trim().length === 0) sErrors.push('No. Pasport diperlukan');
        }
        if (sErrors.length > 0) {
            errors.students[i] = sErrors;
            hasError = true;
        }
    });

    setFormErrors(errors);
    return !hasError;
  };

  const cancelEdit = () => {
    setEditingReg(null);
    setRegPart1('');
    setRegPart2('');
    setSearchPassword('');
    setFormErrors({ teachers: {}, students: {} });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg || isUpdating) return;

    if (!validateEditForm()) {
      alert("Sila betulkan ralat data.");
      return;
    }

    setIsUpdating(true);
    try {
        const updatedData = {
          ...editingReg.data,
          registrationId: editingReg.id,
          schoolName: formatSchoolName(editingReg.data.schoolName),
          schoolCode: (editingReg.data.schoolCode || '').toUpperCase().trim(),
          schoolType: (editingReg.data.schoolType || '').toUpperCase().trim(),
          teachers: editingReg.data.teachers.map((t: Teacher) => ({ ...t, name: t.name.toUpperCase() })),
          students: editingReg.data.students.map((s: Student) => ({ ...s, name: s.name.toUpperCase(), playerId: '' })),
          updatedAt: new Date().toISOString()
        };
        const response = await syncRegistration(editingReg.id, updatedData, true);
        
        if (response && response.status === 'success') {
            const finalData = { ...updatedData, students: response.students };
            onUpdateSuccess(editingReg.id, finalData);
            setEditingReg(null);
            setRegPart1('');
            setRegPart2('');
            setSearchPassword('');
        } else {
            throw new Error(response?.error || "Ralat tidak diketahui");
        }
    } catch (err: any) {
        console.error(err);
        alert("Ralat Rangkaian: Gagal menyambung ke awan. " + (err.message || "Sila cuba lagi."));
    } finally {
        setIsUpdating(false);
    }
  };

  const updateData = (updater: (prev: any) => any) => {
    setEditingReg(prev => prev ? { ...prev, data: updater(prev.data) } : null);
  };

  const getCategoryOptions = (schoolType: string, gender: string) => {
    if (schoolType === 'SEKOLAH RENDAH') {
        if (gender === 'Lelaki') return [{ value: 'L12', label: 'U12 Lelaki (L12)' }];
        if (gender === 'Perempuan') return [{ value: 'P12', label: 'U12 Perempuan (P12)' }];
        return [];
    }
    if (schoolType === 'SEKOLAH MENENGAH') {
        if (gender === 'Lelaki') return [
            { value: 'L15', label: 'U15 Lelaki (L15)' },
            { value: 'L18', label: 'U18 Lelaki (L18)' }
        ];
        if (gender === 'Perempuan') return [
            { value: 'P15', label: 'U15 Perempuan (P15)' },
            { value: 'P18', label: 'U18 Perempuan (P18)' }
        ];
        return [];
    }
    return [];
  };

  const handleUploadSlotFile = async (docType: 'borang' | 'ic' | 'kebenaran' | 'media') => {
    if (!editingReg) return;
    const file = selectedSlotFiles[docType];
    if (!file) return;

    setUploadingSlot(docType);
    setUploadDocError(null);
    setUploadDocSuccess(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64File = reader.result as string;
          const res = await uploadDocument({
            regId: editingReg.id,
            schoolCode: editingReg.data.schoolCode,
            schoolName: editingReg.data.schoolName,
            schoolType: editingReg.data.schoolType,
            docType: docType,
            base64File: base64File,
            originalFileName: file.name
          });

          if (res.success) {
            setUploadDocSuccess(`Dokumen berjaya dimuat naik & dinamakan semula sebagai: ${res.fileName}`);
            setSelectedSlotFiles(prev => ({ ...prev, [docType]: null }));

            updateData(d => {
              const urlKey = docType === 'borang' ? 'docFormUrl' : docType === 'ic' ? 'docIdUrl' : docType === 'kebenaran' ? 'docParentConsentUrl' : 'docMediaConsentUrl';
              const nameKey = docType === 'borang' ? 'docFormFileName' : docType === 'ic' ? 'docIdFileName' : docType === 'kebenaran' ? 'docParentConsentFileName' : 'docMediaConsentFileName';

              const updatedDoc = {
                ...d,
                [urlKey]: res.fileUrl || d[urlKey],
                [nameKey]: res.fileName,
                documentUploadedAt: new Date().toISOString()
              };

              const count = [
                updatedDoc.docFormUrl,
                updatedDoc.docIdUrl,
                updatedDoc.docParentConsentUrl,
                updatedDoc.docMediaConsentUrl
              ].filter(Boolean).length;

              updatedDoc.documentStatus = count === 4 ? 'LENGKAP' : count > 0 ? 'SEBAHAGIAN' : 'BELUM HANTAR';
              return updatedDoc;
            });
          } else {
            throw new Error(res.error || 'Gagal memuat naik fail');
          }
        } catch (err: any) {
          setUploadDocError(err.message || 'Ralat semasa memuat naik fail');
        } finally {
          setUploadingSlot(null);
        }
      };

      reader.onerror = () => {
        setUploadDocError('Gagal membaca fail PDF.');
        setUploadingSlot(null);
      };

      reader.readAsDataURL(file);
    } catch (e: any) {
      setUploadDocError(e.message || 'Ralat memproses fail.');
      setUploadingSlot(null);
    }
  };

  const handleSaveDriveUrlSlot = async (docType: 'borang' | 'ic' | 'kebenaran' | 'media') => {
    if (!editingReg) return;
    const url = (slotDriveInputs[docType] || '').trim();
    if (!url) return;

    setUploadingSlot(docType);
    setUploadDocError(null);
    setUploadDocSuccess(null);

    try {
      const res = await uploadDocument({
        regId: editingReg.id,
        schoolCode: editingReg.data.schoolCode,
        schoolName: editingReg.data.schoolName,
        schoolType: editingReg.data.schoolType,
        docType: docType,
        driveUrl: url
      });

      if (res.success) {
        setUploadDocSuccess(`Pautan Google Drive bagi dokumen berjaya disimpan!`);
        setSlotDriveInputs(prev => ({ ...prev, [docType]: '' }));

        updateData(d => {
          const urlKey = docType === 'borang' ? 'docFormUrl' : docType === 'ic' ? 'docIdUrl' : docType === 'kebenaran' ? 'docParentConsentUrl' : 'docMediaConsentUrl';
          const nameKey = docType === 'borang' ? 'docFormFileName' : docType === 'ic' ? 'docIdFileName' : docType === 'kebenaran' ? 'docParentConsentFileName' : 'docMediaConsentFileName';

          const updatedDoc = {
            ...d,
            [urlKey]: url,
            [nameKey]: res.fileName,
            documentUploadedAt: new Date().toISOString()
          };

          const count = [
            updatedDoc.docFormUrl,
            updatedDoc.docIdUrl,
            updatedDoc.docParentConsentUrl,
            updatedDoc.docMediaConsentUrl
          ].filter(Boolean).length;

          updatedDoc.documentStatus = count === 4 ? 'LENGKAP' : count > 0 ? 'SEBAHAGIAN' : 'BELUM HANTAR';
          return updatedDoc;
        });
      } else {
        throw new Error(res.error || 'Gagal menyimpan pautan');
      }
    } catch (err: any) {
      setUploadDocError(err.message || 'Ralat semasa menyimpan pautan');
    } finally {
      setUploadingSlot(null);
    }
  };

  if (editingReg) {
    const { data } = editingReg;
    return (
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-lg border-2 border-blue-100 animate-fadeIn space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-blue-600 uppercase">Kemaskini: {editingReg.id}</h3>
                <button onClick={cancelEdit} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:text-red-500 transition-colors"><X /></button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-10">
                 {/* Section 1: Sekolah */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Kod Sekolah *</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                required 
                                maxLength={4}
                                value={data.schoolCode ? data.schoolCode.replace(/[^A-Z]/g, '') : ''} 
                                onChange={e => {
                                    const letters = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                                    const suffix = data.schoolCode ? data.schoolCode.replace(/^[A-Z]+/, '') : '';
                                    updateData(d => ({...d, schoolCode: letters + suffix}));
                                }} 
                                className={`w-1/3 min-h-[50px] px-4 py-3 border-2 rounded-2xl outline-none transition-all font-bold uppercase text-sm text-center ${formErrors.schoolCode ? 'border-red-400 focus:border-red-400' : 'border-gray-100 focus:border-blue-300'}`}
                                placeholder="ABC"
                            />
                            <input 
                                type="text" 
                                required 
                                maxLength={4}
                                value={data.schoolCode ? data.schoolCode.replace(/^[A-Z]+/, '') : ''} 
                                onChange={e => {
                                    const suffix = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
                                    const letters = data.schoolCode ? data.schoolCode.match(/^[A-Z]+/)?.[0] || '' : '';
                                    updateData(d => ({...d, schoolCode: letters + suffix}));
                                }} 
                                className={`flex-1 min-h-[50px] px-4 py-3 border-2 rounded-2xl outline-none transition-all font-bold uppercase text-sm tracking-widest ${formErrors.schoolCode ? 'border-red-400 focus:border-red-400' : 'border-gray-100 focus:border-blue-300'}`}
                                placeholder="1234"
                            />
                        </div>
                        {formErrors.schoolCode && (
                            <p className="text-[9px] font-black text-red-500 flex items-center gap-1"><AlertCircle size={10}/> {formErrors.schoolCode}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Sekolah *</label>
                        <select 
                            value={data.schoolType}
                            onChange={e => {
                                const type = e.target.value;
                                updateData(d => {
                                    const students = d.students.map((s: Student) => {
                                        let cat = s.category;
                                        if (type === 'SEKOLAH RENDAH') {
                                            cat = s.gender === 'Lelaki' ? 'L12' : 'P12';
                                        }
                                        return {...s, category: cat};
                                    });
                                    return {...d, schoolType: type, students};
                                });
                            }}
                            className="w-full min-h-[50px] px-5 py-3 border-2 border-gray-100 rounded-2xl focus:border-blue-300 outline-none transition-all font-bold text-sm" 
                            required
                        >
                            <option value="SEKOLAH RENDAH">SEKOLAH RENDAH</option>
                            <option value="SEKOLAH MENENGAH">SEKOLAH MENENGAH</option>
                        </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Sekolah *</label>
                        <input 
                            value={data.schoolName} 
                            onChange={e => updateData(d => ({...d, schoolName: e.target.value}))} 
                            onBlur={() => updateData(d => ({...d, schoolName: formatSchoolName(d.schoolName)}))} 
                            className="w-full min-h-[50px] px-5 py-3 border-2 border-gray-100 rounded-2xl focus:border-blue-300 outline-none transition-all font-bold uppercase text-sm" 
                            placeholder="Contoh: SK TAMAN DESA"
                            required
                        />
                    </div>

                    <div className="md:col-span-2">
                         <div className="flex gap-2 items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                            <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-gray-600 font-medium leading-snug">
                                Jika sekolah kebangsaan hanya tulis <strong className="text-blue-700">SK</strong>, 
                                jika sekolah menengah kebangsaan tulis <strong className="text-blue-700">SMK</strong>, 
                                jika sekolah jenis kebangsaan cina atau india tulis sahaja <strong className="text-blue-700">SJKC</strong> atau <strong className="text-blue-700">SJKT</strong>.
                            </p>
                        </div>
                    </div>
                 </div>

                 {/* Section 2: Guru */}
                 <div className="bg-orange-50/30 p-6 rounded-[2rem] border-2 border-orange-50">
                    <h4 className="font-black text-orange-600 mb-6 flex items-center gap-2 text-xs uppercase tracking-widest">👨‍🏫 Maklumat Guru</h4>
                    {data.teachers.map((t: Teacher, i: number) => (
                        <div key={i} className="mb-6 p-5 bg-white rounded-2xl border-2 border-orange-50 relative">
                             <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{t.position}</span>
                                {i > 0 && <button type="button" onClick={() => updateData(d => ({...d, teachers: d.teachers.filter((_: any, idx: number) => idx !== i)}))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>}
                             </div>
                             <div className="grid md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Nama Guru Pengiring (Seperti dalam Kad Pengenalan) *</label>
                                    <input 
                                        placeholder="Contoh: MUHAMMAD ALI BIN ABU BAKAR"
                                        value={t.name}
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].name = e.target.value;
                                            return { ...d, teachers };
                                        })}
                                        className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none text-sm font-bold shadow-sm focus:border-orange-300 uppercase" required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">No. Kad Pengenalan *</label>
                                    <input 
                                        placeholder="000000000000"
                                        value={t.ic || ''}
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].ic = formatIC(e.target.value);
                                            return { ...d, teachers };
                                        })}
                                        maxLength={14}
                                        className={`w-full px-4 py-3 bg-white border-2 rounded-xl outline-none text-sm font-bold shadow-sm font-mono focus:border-orange-300 ${formErrors.teachers[i]?.includes('IC tidak lengkap') ? 'border-red-400' : 'border-gray-100'}`} required
                                    />
                                    {formErrors.teachers[i]?.includes('IC tidak lengkap') && <p className="text-[9px] text-red-500 font-black">IC tidak lengkap</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Alamat Emel *</label>
                                    <input 
                                        placeholder="Contoh: guru@moe.gov.my"
                                        value={t.email}
                                        type="email"
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].email = e.target.value;
                                            return { ...d, teachers };
                                        })}
                                        className={`w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none text-sm font-bold shadow-sm focus:border-orange-300 ${formErrors.teachers[i]?.includes('Email tidak sah') ? 'border-red-300' : ''}`} required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">No. Telefon *</label>
                                    <input 
                                        placeholder="Contoh: 0123456789"
                                        value={t.phone}
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].phone = formatPhoneNumber(e.target.value);
                                            return { ...d, teachers };
                                        })}
                                        className={`w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl outline-none text-sm font-bold shadow-sm focus:border-orange-300 ${formErrors.teachers[i]?.includes('No. Telefon tidak sah') ? 'border-red-300' : ''}`} required
                                    />
                                </div>
                             </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => updateData(d => ({...d, teachers: [...d.teachers, {name:'', email:'', phone:'', ic: '', position:'Pengiring'}]}))} className="w-full py-4 bg-orange-100 text-orange-600 text-xs font-black rounded-2xl border-2 border-dashed border-orange-200 hover:bg-orange-200 transition-all uppercase flex items-center justify-center gap-2">
                        <Plus size={14} /> Tambah Guru
                    </button>
                 </div>

                 {/* Section 3: Pelajar */}
                 <div className="bg-blue-50/30 p-6 rounded-[2rem] border-2 border-blue-50">
                    <h4 className="font-black text-blue-600 mb-6 flex items-center gap-2 text-xs uppercase tracking-widest">👥 Maklumat Pelajar</h4>
                    {data.students.map((s: Student, i: number) => (
                        <div key={i} className="mb-6 p-5 bg-white rounded-2xl border-2 border-blue-50 relative">
                             <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Pelajar {i + 1}</span>
                                <button type="button" onClick={() => updateData(d => ({...d, students: d.students.filter((_: any, idx: number) => idx !== i)}))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                             </div>
                            
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Nama Pelajar (Seperti dalam Kad Pengenalan) *</label>
                                    <input 
                                        placeholder="Contoh: AHMAD BIN ABDULLAH"
                                        value={s.name}
                                        onChange={e => updateData(d => {
                                            const students = [...d.students];
                                            students[i].name = e.target.value;
                                            return {...d, students};
                                        })}
                                        className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none text-sm font-bold bg-white focus:border-blue-300 uppercase" required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">{s.isNonCitizen ? 'No. Pasport *' : 'No. Kad Pengenalan *'}</label>
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={!!s.isNonCitizen} 
                                                onChange={(e) => updateData(d => {
                                                    const students = [...d.students];
                                                    students[i].isNonCitizen = e.target.checked;
                                                    
                                                    if (!e.target.checked) {
                                                         // Re-validate/format as IC if switching back to citizen
                                                         const formatted = formatIC(students[i].ic);
                                                         students[i].ic = formatted;
                                                         const digitsOnly = formatted.replace(/\D/g, '');
                                                         if (digitsOnly.length === 12) {
                                                             const lastDigit = parseInt(digitsOnly.charAt(11));
                                                             const detectedGender = lastDigit % 2 === 0 ? 'Perempuan' : 'Lelaki';
                                                             students[i].gender = detectedGender;
                                                             if (d.schoolType === 'SEKOLAH RENDAH') {
                                                                students[i].category = detectedGender === 'Lelaki' ? 'L12' : 'P12';
                                                             }
                                                         }
                                                    }
                                                    
                                                    return { ...d, students };
                                                })}
                                                className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Bukan Warganegara</span>
                                        </label>
                                    </div>
                                    <input 
                                        placeholder={s.isNonCitizen ? "A12345678" : "000000000000"}
                                        value={s.ic}
                                        onChange={e => updateData(d => {
                                            const students = [...d.students];
                                            let val = e.target.value;
                                            
                                            if (!s.isNonCitizen) {
                                                const formatted = formatIC(val);
                                                students[i].ic = formatted;
                                                const digits = formatted.replace(/\D/g, '');
                                                if (digits.length === 12) {
                                                  const last = parseInt(digits.charAt(11));
                                                  const detectedGender = last % 2 === 0 ? 'Perempuan' : 'Lelaki';
                                                  students[i].gender = detectedGender;
                                                  
                                                  if (d.schoolType === 'SEKOLAH RENDAH') {
                                                      students[i].category = detectedGender === 'Lelaki' ? 'L12' : 'P12';
                                                  }
                                                }
                                            } else {
                                                students[i].ic = val.toUpperCase();
                                            }

                                            return {...d, students};
                                        })}
                                        maxLength={s.isNonCitizen ? 20 : 14}
                                        className={`w-full px-4 py-3 border-2 rounded-xl outline-none text-sm font-bold font-mono bg-white focus:border-blue-300 ${formErrors.students[i]?.includes('IC tidak lengkap') || formErrors.students[i]?.includes('No. Pasport diperlukan') ? 'border-red-400' : 'border-gray-100'}`} required
                                    />
                                    {(formErrors.students[i]?.includes('IC tidak lengkap') || formErrors.students[i]?.includes('No. Pasport diperlukan')) && <p className="text-[9px] text-red-500 font-black">{s.isNonCitizen ? 'No. Pasport diperlukan' : 'IC tidak lengkap'}</p>}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Bangsa *</label>
                                    <select value={s.race} onChange={e => updateData(d => { const students = [...d.students]; students[i].race = e.target.value; return {...d, students}; })} className="w-full px-3 border-2 border-gray-100 rounded-xl text-xs font-bold outline-none bg-white min-h-[45px]">
                                        <option value="Melayu">Melayu</option>
                                        <option value="Cina">Cina</option>
                                        <option value="India">India</option>
                                        <option value="Lain-lain">Lain-lain</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Jantina *</label>
                                    <select value={s.gender} onChange={e => updateData(d => { const students = [...d.students]; students[i].gender = e.target.value as any; return {...d, students}; })} className="w-full px-3 border-2 border-gray-100 rounded-xl text-xs font-bold outline-none bg-white min-h-[45px]">
                                        <option value="Lelaki">Lelaki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Kategori *</label>
                                    <select 
                                      value={s.category} 
                                      disabled={!s.gender}
                                      onChange={e => updateData(d => { const students = [...d.students]; students[i].category = e.target.value; return {...d, students}; })} 
                                      className="w-full px-3 border-2 border-gray-100 rounded-xl text-xs font-bold outline-none disabled:bg-gray-100 bg-white min-h-[45px]"
                                    >
                                        <option value="">Pilih</option>
                                        {getCategoryOptions(data.schoolType, s.gender).map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Senarai Semak Dokumen Pelajar */}
                            <div className="mt-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-wrap items-center gap-3">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <FileCheck size={13} className="text-blue-600" />
                                Semakan Dokumen:
                              </span>
                              <label className="flex items-center gap-1.5 cursor-pointer bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
                                <input 
                                  type="checkbox"
                                  checked={!!s.documents?.hasForm}
                                  onChange={(e) => updateData(d => {
                                    const students = [...d.students];
                                    students[i] = {
                                      ...students[i],
                                      documents: {
                                        ...(students[i].documents || {}),
                                        hasForm: e.target.checked
                                      }
                                    };
                                    return { ...d, students };
                                  })}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[10px] font-bold text-slate-700">
                                  {data.schoolType === 'SEKOLAH MENENGAH' ? 'Borang M01' : 'Borang R01'}
                                </span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
                                <input 
                                  type="checkbox"
                                  checked={!!s.documents?.hasIdDoc}
                                  onChange={(e) => updateData(d => {
                                    const students = [...d.students];
                                    students[i] = {
                                      ...students[i],
                                      documents: {
                                        ...(students[i].documents || {}),
                                        hasIdDoc: e.target.checked
                                      }
                                    };
                                    return { ...d, students };
                                  })}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[10px] font-bold text-slate-700">
                                  {data.schoolType === 'SEKOLAH MENENGAH' ? 'Salinan IC / Pasport' : 'MyKid / S.Beranak'}
                                </span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
                                <input 
                                  type="checkbox"
                                  checked={!!s.documents?.hasParentConsent}
                                  onChange={(e) => updateData(d => {
                                    const students = [...d.students];
                                    students[i] = {
                                      ...students[i],
                                      documents: {
                                        ...(students[i].documents || {}),
                                        hasParentConsent: e.target.checked
                                      }
                                    };
                                    return { ...d, students };
                                  })}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[10px] font-bold text-slate-700">
                                  Kebenaran Kejohanan
                                </span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
                                <input 
                                  type="checkbox"
                                  checked={!!s.documents?.hasMediaConsent}
                                  onChange={(e) => updateData(d => {
                                    const students = [...d.students];
                                    students[i] = {
                                      ...students[i],
                                      documents: {
                                        ...(students[i].documents || {}),
                                        hasMediaConsent: e.target.checked
                                      }
                                    };
                                    return { ...d, students };
                                  })}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[10px] font-bold text-slate-700">
                                  Kebenaran Media
                                </span>
                              </label>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => updateData(d => {
                      return {...d, students: [...d.students, {name:'', ic:'', gender:'', race:'', category:'', playerId:''}]};
                    })} className="w-full py-4 bg-blue-100 text-blue-600 text-xs font-black rounded-2xl border-2 border-dashed border-blue-200 hover:bg-blue-200 transition-all uppercase flex items-center justify-center gap-2">
                        <Plus size={14} /> Tambah Pelajar
                    </button>
                 </div>

                  {/* Section 4: Pengurusan & Muat Naik 4 Jenis Dokumen Sekolah Berasingan */}
                  <div className="bg-slate-50/70 p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-200 mt-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                            <UploadCloud size={20} />
                          </span>
                          <h4 className="font-black text-slate-800 text-sm md:text-base uppercase tracking-tight">
                            📁 Pengurusan Dokumen Pendaftaran (4 Jenis Dokumen Berasingan)
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          Setiap dokumen boleh dimuat naik secara berasingan. Guru juga boleh menggantikan atau mengemas kini fail yang telah dihantar pada bila-bila masa.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] font-black uppercase px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                          data.documentStatus === 'LENGKAP' 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : data.documentStatus === 'SEBAHAGIAN' || data.documentStatus === 'DIHANTAR'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : data.documentStatus === 'PERLU PEMBETULAN'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          <span className="w-2 h-2 rounded-full bg-current"></span>
                          STATUS: {data.documentStatus || 'BELUM HANTAR'}
                        </span>
                      </div>
                    </div>

                    {/* Banner Catatan Urusetia (Jika ada ulasan/teguran daripada penganjur) */}
                    {data.adminNotes && (
                      <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 flex items-start gap-3.5 text-amber-950 shadow-sm animate-fadeIn">
                        <div className="p-2.5 bg-amber-200 text-amber-900 rounded-xl shrink-0 mt-0.5">
                          <Info size={22} className="stroke-[2.5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h5 className="font-black text-xs md:text-sm uppercase tracking-wide text-amber-950 flex items-center gap-1.5">
                              📢 Catatan & Arahan Urusetia Kejohanan
                            </h5>
                            {data.documentStatus && (
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${
                                data.documentStatus === 'PERLU PEMBETULAN' 
                                  ? 'bg-red-100 text-red-800 border-red-300' 
                                  : 'bg-amber-200/80 text-amber-900 border-amber-300'
                              }`}>
                                {data.documentStatus}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 p-3 bg-white/90 rounded-xl border border-amber-200 text-xs font-semibold text-slate-800 leading-relaxed shadow-xs">
                            {data.adminNotes}
                          </div>
                          <p className="text-[10px] text-amber-800 font-bold mt-1.5 italic">
                            * Sila kemas kini data atau muat naik semula dokumen yang berkaitan mengikut catatan di atas.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Notifikasi Kejayaan / Ralat */}
                    {uploadDocSuccess && (
                      <div className="p-3.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2 animate-fadeIn">
                        <CheckCircle2 size={16} className="shrink-0" />
                        {uploadDocSuccess}
                      </div>
                    )}
                    {uploadDocError && (
                      <div className="p-4 bg-red-50 text-red-800 text-xs rounded-2xl border-2 border-red-200 animate-fadeIn space-y-2">
                        <div className="flex items-start gap-2.5 font-bold">
                          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black text-red-900 block mb-0.5">Ralat Muat Naik Dokumen:</span>
                            <span className="font-normal text-red-700">{uploadDocError}</span>
                          </div>
                        </div>
                        {(uploadDocError.includes('permission') || uploadDocError.includes('createFile') || uploadDocError.includes('DriveApp')) && (
                          <div className="mt-2 pt-2 border-t border-red-200 text-[11px] text-red-800 bg-white/80 p-3 rounded-xl space-y-1">
                            <span className="font-black block uppercase text-red-900">💡 Cara Selesaikan Ralat Kebenaran Google Drive:</span>
                            <p>1. Buka <strong>Google Sheet &gt; Extensions &gt; Apps Script</strong>.</p>
                            <p>2. Pilih fungsi <code className="bg-red-100 text-red-900 font-bold px-1.5 py-0.5 rounded">authorizeScript</code> pada dropdown atas &gt; Klik <strong>Run (Jalankan ▶)</strong>.</p>
                            <p>3. Tekan <strong>Review permissions</strong> &gt; Pilih akaun anda &gt; <strong>Advanced</strong> &gt; <strong>Allow</strong>.</p>
                            <p>4. Klik <strong>Deploy &gt; Manage deployments &gt; Edit &gt; New version &gt; Deploy</strong>.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4 Slot Dokumen Berasingan */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {[
                        {
                          type: 'borang' as const,
                          number: '1',
                          title: data.schoolType === 'SEKOLAH MENENGAH' ? 'Borang M01' : 'Borang R01',
                          desc: 'Borang rasmi penyertaan kontinjen sekolah yang telah disahkan oleh Pentadbir.',
                          tag: data.schoolType === 'SEKOLAH MENENGAH' ? 'BORANG_M01' : 'BORANG_R01',
                          url: data.docFormUrl,
                          fileName: data.docFormFileName
                        },
                        {
                          type: 'ic' as const,
                          number: '2',
                          title: data.schoolType === 'SEKOLAH MENENGAH' ? 'Salinan Kad Pengenalan' : 'Salinan MyKid / S.Beranak',
                          desc: 'Salinan dokumen pengenalan bagi setiap peserta kontinjen sekolah.',
                          tag: 'SALINAN_IC_MYKID',
                          url: data.docIdUrl,
                          fileName: data.docIdFileName
                        },
                        {
                          type: 'kebenaran' as const,
                          number: '3',
                          title: 'Kebenaran Kejohanan',
                          desc: 'Surat pelepasan & kebenaran ibu bapa/penjaga untuk murid menyertai kejohanan.',
                          tag: 'KEBENARAN_KEJOHANAN',
                          url: data.docParentConsentUrl,
                          fileName: data.docParentConsentFileName
                        },
                        {
                          type: 'media' as const,
                          number: '4',
                          title: 'Kebenaran Media',
                          desc: 'Surat kebenaran penyiaran dan hebahan foto/video murid untuk rekod rasmi.',
                          tag: 'KEBENARAN_MEDIA',
                          url: data.docMediaConsentUrl,
                          fileName: data.docMediaConsentFileName
                        }
                      ].map((slot) => {
                        const isUploaded = !!slot.url;
                        const isThisUploading = uploadingSlot === slot.type;
                        const autoRenameExample = `${(data.schoolCode || 'KOD').toUpperCase()}_${(data.schoolName || 'SEKOLAH').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_${slot.tag}_${editingReg.id}.pdf`;

                        return (
                          <div 
                            key={slot.type}
                            className={`p-5 rounded-2xl border-2 transition-all bg-white flex flex-col justify-between ${
                              isUploaded 
                                ? 'border-emerald-200 shadow-sm bg-gradient-to-b from-emerald-50/20 to-white' 
                                : 'border-slate-200'
                            }`}
                          >
                            <div>
                              {/* Slot Header */}
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-white font-black text-xs flex items-center justify-center shrink-0">
                                    {slot.number}
                                  </span>
                                  <h5 className="font-black text-slate-800 text-xs uppercase tracking-wide">
                                    {slot.title}
                                  </h5>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                  isUploaded 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}>
                                  {isUploaded ? '✓ DIMUAT NAIK' : 'BELUM HANTAR'}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-500 font-medium mb-3">
                                {slot.desc}
                              </p>

                              {/* Fail Sedia Ada (Jika Dimuat Naik) */}
                              {isUploaded && (
                                <div className="mb-3 p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText size={16} className="text-emerald-700 shrink-0" />
                                    <span className="text-[10px] font-bold text-slate-800 truncate">
                                      {slot.fileName || 'Fail Dimuat Naik'}
                                    </span>
                                  </div>
                                  <a 
                                    href={slot.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all shrink-0"
                                  >
                                    <ExternalLink size={10} /> Buka Fail
                                  </a>
                                </div>
                              )}

                              {/* Format Penamaan Automatik */}
                              <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                                <div className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mb-0.5">
                                  <Sparkles size={10} className="text-blue-600" /> Format Auto-Rename:
                                </div>
                                <div className="font-mono text-[9px] text-slate-700 font-bold truncate">
                                  {autoRenameExample}
                                </div>
                              </div>
                            </div>

                            {/* Kotak Muat Naik Fail & Drive URL (Boleh Muat Naik Baharu atau Ganti Fail Lama) */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-slate-500">
                                  {isUploaded ? '🔄 Ganti / Kemas Kini Fail Baharu:' : '📤 Pilih Fail PDF / Imej:'}
                                </span>
                                {isUploaded && (
                                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Boleh ganti dokumen sedia ada
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                  type="file"
                                  accept=".pdf,application/pdf,image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setSelectedSlotFiles(prev => ({ ...prev, [slot.type]: file }));
                                  }}
                                  className="flex-1 text-[10px] text-slate-600 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg p-0.5 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUploadSlotFile(slot.type)}
                                  disabled={!selectedSlotFiles[slot.type] || !!uploadingSlot}
                                  className={`px-3.5 py-1.5 text-white text-[10px] font-black rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 uppercase tracking-wider whitespace-nowrap shadow-sm ${
                                    isUploaded ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                                  }`}
                                >
                                  {isThisUploading ? (
                                    <><RefreshCw size={12} className="animate-spin" /> Memproses...</>
                                  ) : isUploaded ? (
                                    <><RefreshCw size={12} /> Ganti Dokumen</>
                                  ) : (
                                    <><UploadCloud size={12} /> Hantar</>
                                  )}
                                </button>
                              </div>

                              {/* Pautan Google Drive Alternatif */}
                              <div className="flex gap-1.5">
                                <input 
                                  type="url"
                                  placeholder={isUploaded ? "Atau tampal pautan Google Drive baharu..." : "Atau masukkan pautan Google Drive..."}
                                  value={slotDriveInputs[slot.type] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSlotDriveInputs(prev => ({ ...prev, [slot.type]: val }));
                                  }}
                                  className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold outline-none focus:border-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveDriveUrlSlot(slot.type)}
                                  disabled={!(slotDriveInputs[slot.type] || '').trim() || !!uploadingSlot}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[9px] font-bold rounded-lg transition-all disabled:opacity-40 uppercase whitespace-nowrap"
                                >
                                  {isUploaded ? 'Ganti Link' : 'Simpan Link'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                 <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={cancelEdit} disabled={isUpdating} className="px-8 py-3 bg-gray-100 text-gray-400 font-black rounded-2xl hover:bg-gray-200 transition-all uppercase text-xs disabled:opacity-50">Batal</button>
                    <button 
                      type="submit" 
                      disabled={isUpdating}
                      className="px-10 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 transform active:scale-95 uppercase text-xs tracking-widest disabled:bg-blue-400"
                    >
                        {isUpdating ? <><RefreshCw className="animate-spin" size={20} /> Menyimpan...</> : <><Save size={20} /> Simpan Kemaskini</>}
                    </button>
                 </div>
            </form>
        </div>
    );
  }

  return (
    <div className="bg-blue-50/50 border-2 border-blue-100 rounded-[2.5rem] p-6 md:p-8 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100"><Search size={20} /></div>
          <h4 className="text-xl font-black text-blue-800 uppercase tracking-tighter">Cari & Kemaskini</h4>
      </div>
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-1">
            <label className="block text-gray-400 font-black text-[10px] mb-1 uppercase tracking-widest">ID Pendaftaran *</label>
            <div className="flex items-center gap-2">
                <div className="flex items-center px-4 py-3 border-2 border-white bg-white rounded-2xl shadow-sm select-none">
                    <span className="font-mono font-bold text-gray-400">MSSD</span>
                </div>
                <span className="font-black text-blue-200">-</span>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={regPart1}
                  onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setRegPart1(val);
                      if (val.length === 2) {
                          part2Ref.current?.focus();
                      }
                  }}
                  className="w-20 px-4 py-3 border-2 border-white bg-white rounded-2xl focus:border-blue-600 outline-none transition-all font-mono font-bold text-center shadow-sm text-slate-800"
                  placeholder="00"
                />
                <span className="font-black text-blue-200">-</span>
                <input
                  ref={part2Ref}
                  type="text"
                  required
                  maxLength={2}
                  value={regPart2}
                  onChange={(e) => setRegPart2(e.target.value.replace(/\D/g, ''))}
                  className="w-20 px-4 py-3 border-2 border-white bg-white rounded-2xl focus:border-blue-600 outline-none transition-all font-mono font-bold text-center shadow-sm text-slate-800"
                  placeholder="00"
                />
            </div>
            <p className="text-[9px] text-gray-400 mt-1 ml-1">Masukkan ID mengikut format: MSSD - XX - XX</p>
          </div>
          <div className="space-y-1">
            <label className="block text-gray-400 font-black text-[10px] mb-1 uppercase tracking-widest">4 Digit Akhir Telefon *</label>
            <input
              type="text"
              required
              maxLength={4}
              value={searchPassword}
              onChange={(e) => setSearchPassword(e.target.value)}
              className="w-full px-5 py-3 border-2 border-white bg-white rounded-2xl focus:border-blue-600 outline-none transition-all font-mono font-bold shadow-sm"
              placeholder="1234"
            />
          </div>
        </div>
        {searchError && (
          <div className="bg-red-50 border-2 border-red-100 text-red-600 p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-3 animate-shake">
            <AlertCircle size={18} /> {searchError}
          </div>
        )}
        <button
          type="submit"
          disabled={isSearching}
          className="flex items-center justify-center gap-3 w-full md:w-auto px-10 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black shadow-xl shadow-blue-100 disabled:opacity-50 transform active:scale-95 uppercase text-xs tracking-[0.2em]"
        >
          {isSearching ? <><RefreshCw className="animate-spin" size={18} /> Mencari...</> : <><Search size={18} /> Semak Data</>}
        </button>
      </form>
    </div>
  );
};

export default UpdateRegistration;
