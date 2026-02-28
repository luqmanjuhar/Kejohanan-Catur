
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RefreshCw, Info, AlertCircle } from 'lucide-react';
import { Teacher, Student, RegistrationsMap, EventConfig } from '../types';
import { formatSchoolName, formatPhoneNumber, formatIC, generatePlayerId, generateRegistrationId, isValidEmail, isValidMalaysianPhone } from '../utils/formatters';
import { syncRegistration } from '../services/api';

interface RegistrationFormProps {
  registrations: RegistrationsMap;
  onSuccess: (regId: string, data: any) => void;
  eventConfig: EventConfig;
  draft: {
    schoolName: string;
    schoolCode: string;
    schoolType: string;
    teachers: Teacher[];
    students: Student[];
  };
  onDraftChange: (updated: any) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ registrations, onSuccess, eventConfig, draft, onDraftChange }) => {
  const [generatedRegId, setGeneratedRegId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{teachers: Record<number, string[]>, students: Record<number, string[]>, schoolCode?: string}>({
    teachers: {},
    students: {}
  });

  const { schoolName, schoolCode, schoolType, teachers, students } = draft;

  // Logik Kategori Automatik berasaskan jenis sekolah
  useEffect(() => {
    const updatedStudents = students.map(s => {
      let newCat = s.category;
      if (schoolType === 'SEKOLAH RENDAH') {
        if (s.gender === 'Lelaki') newCat = 'L12';
        else if (s.gender === 'Perempuan') newCat = 'P12';
      } else if (schoolType === 'SEKOLAH MENENGAH') {
        // Jika tukar ke SM, reset kategori lama SK jika belum ada kategori SM
        if (s.category === 'L12' || s.category === 'P12') newCat = '';
      }
      return { ...s, category: newCat };
    });
    
    const hasChanged = updatedStudents.some((s, i) => s.category !== students[i].category);
    if (hasChanged) {
      onDraftChange({ ...draft, students: updatedStudents });
    }
  }, [schoolType]);

  useEffect(() => {
    // Gunakan kategori pelajar pertama untuk menentukan ID Sekolah (MSSD-01 atau 02)
    if (students.length > 0 && students[0].category) {
        const tempId = generateRegistrationId(students[0].category, registrations);
        setGeneratedRegId(tempId);
    }
  }, [students, registrations]);

  useEffect(() => {
    const updatedStudents = students.map((student, index) => {
        if (student.category && student.gender && schoolName && generatedRegId) {
             const newId = generatePlayerId(student.gender, schoolName, index, student.category, generatedRegId);
             if (newId !== student.playerId) {
                 return { ...student, playerId: newId };
             }
        }
        return student;
    });
    
    const hasChanged = updatedStudents.some((s, idx) => s.playerId !== students[idx].playerId);
    if (hasChanged) {
        onDraftChange({ ...draft, students: updatedStudents });
    }
  }, [schoolName, generatedRegId, students]);

  const validateForm = (): boolean => {
    const errors: any = { teachers: {}, students: {} };
    let hasError = false;

    // Validate School Code: 3 letters + 4 numbers
    const schoolCodeRegex = /^[A-Z]{3}\d{4}$/;
    if (!schoolCodeRegex.test(schoolCode)) {
        errors.schoolCode = "Format Kod Sekolah Salah (Contoh: JEA1057)";
        hasError = true;
    }

    teachers.forEach((t, i) => {
      const tErrors = [];
      if (!isValidEmail(t.email)) tErrors.push('Email tidak sah');
      if (!isValidMalaysianPhone(t.phone)) tErrors.push('No. Telefon tidak sah');
      if (t.ic.replace(/\D/g, '').length !== 12) tErrors.push('IC tidak lengkap');
      if (tErrors.length > 0) {
        errors.teachers[i] = tErrors;
        hasError = true;
      }
    });

    students.forEach((s, i) => {
        const sErrors = [];
        if (s.ic.replace(/\D/g, '').length !== 12) sErrors.push('IC tidak lengkap');
        if (sErrors.length > 0) {
            errors.students[i] = sErrors;
            hasError = true;
        }
    });

    setFormErrors(errors);
    return !hasError;
  };

  const handleSchoolNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDraftChange({ ...draft, schoolName: e.target.value });
  };

  const handleSchoolNameBlur = () => {
    onDraftChange({ ...draft, schoolName: formatSchoolName(schoolName) });
  };

  const handleTeacherChange = (index: number, field: keyof Teacher, value: string) => {
    const updated = [...teachers];
    let val = value;
    if (field === 'phone') val = formatPhoneNumber(val);
    if (field === 'ic') val = formatIC(val);
    updated[index] = { ...updated[index], [field]: val };
    onDraftChange({ ...draft, teachers: updated });
  };

  const addTeacher = () => {
    onDraftChange({ ...draft, teachers: [...teachers, { name: '', email: '', phone: '', ic: '', position: 'Pengiring' }] });
  };

  const removeTeacher = (index: number) => {
    if (index === 0) return;
    const updated = teachers.filter((_, i) => i !== index);
    onDraftChange({ ...draft, teachers: updated });
  };

  const handleStudentChange = (index: number, field: keyof Student, value: string) => {
    const updated = [...students];
    let val = value;
    
    if (field === 'ic') {
      val = formatIC(val);
      const digitsOnly = val.replace(/\D/g, '');
      if (digitsOnly.length === 12) {
        const lastDigit = parseInt(digitsOnly.charAt(11));
        const detectedGender = lastDigit % 2 === 0 ? 'Perempuan' : 'Lelaki';
        updated[index].gender = detectedGender;
        
        // Auto-category for SK
        if (schoolType === 'SEKOLAH RENDAH') {
            updated[index].category = detectedGender === 'Lelaki' ? 'L12' : 'P12';
        }
      }
    }
    
    if (field === 'gender') {
       const genderVal = val as any;
       updated[index].gender = genderVal;
       if (schoolType === 'SEKOLAH RENDAH') {
           updated[index].category = genderVal === 'Lelaki' ? 'L12' : 'P12';
       }
    } else if (field === 'category') {
       updated[index].category = val;
    } else {
       (updated[index] as any)[field] = val;
    }
    
    onDraftChange({ ...draft, students: updated });
  };

  const addStudent = () => {
    onDraftChange({ ...draft, students: [...students, { name: '', ic: '', gender: '', race: '', category: '', playerId: '' }] });
  };

  const removeStudent = (index: number) => {
    const updated = students.filter((_, i) => i !== index);
    onDraftChange({ ...draft, students: updated });
  };

  const resetForm = () => {
    if (confirm("Kosongkan semua data dalam borang ini?")) {
        onDraftChange({
            schoolName: '',
            schoolCode: '',
            schoolType: '',
            teachers: [{ name: '', email: '', phone: '', ic: '', position: 'Ketua' }],
            students: [{ name: '', ic: '', gender: '', race: '', category: '', playerId: '' }]
        });
        setFormErrors({ teachers: {}, students: {} });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;
    
    if (students.some(s => !s.category)) {
        alert("Sila pastikan semua pelajar mempunyai kategori.");
        return;
    }

    setIsSubmitting(true);
    const firstCategory = students[0].category;
    const regId = generateRegistrationId(firstCategory, registrations);

    const data = { 
        schoolName: formatSchoolName(schoolName), 
        schoolCode,
        schoolType, 
        teachers: Array.isArray(teachers) ? teachers.map(t => t ? ({ ...t, name: (t.name || '').toUpperCase() }) : { name: '', email: '', phone: '', ic: '', position: 'Pengiring' }) : [], 
        students: Array.isArray(students) ? students.map(s => s ? ({ ...s, name: (s.name || '').toUpperCase() }) : { name: '', ic: '', gender: '', race: '', category: '', playerId: '' }) : [], 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(), 
        status: 'AKTIF' 
    };

    try {
        await syncRegistration(regId, data, false);
        setIsSubmitting(false); // Reset loading state
        onSuccess(regId, data);
    } catch (err) {
        alert("Gagal menghantar data. Sila periksa internet.");
        setIsSubmitting(false);
    }
  };

  const getCategoryOptions = (gender: string) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-10 animate-fadeIn">
      <section className="bg-white p-4 md:p-8 rounded-[2rem] border-2 border-orange-50">
        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3 uppercase tracking-tighter">
            <span className="bg-orange-600 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm">1</span>
            Maklumat Sekolah
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Kod Sekolah - Split into 2 inputs */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Kod Sekolah *</label>
            <div className="flex gap-2">
                <input 
                  type="text" 
                  required 
                  maxLength={3}
                  value={schoolCode.replace(/[^A-Z]/g, '')} 
                  onChange={(e) => {
                      const letters = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
                      const numbers = schoolCode.replace(/[^0-9]/g, '');
                      onDraftChange({ ...draft, schoolCode: letters + numbers });
                  }} 
                  className={`w-1/3 min-h-[50px] px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none transition-all font-bold text-sm uppercase text-center ${formErrors.schoolCode ? 'border-red-400 focus:border-red-400' : 'border-gray-100 focus:border-orange-500'}`}
                  placeholder="ABC" 
                />
                <input 
                  type="text" 
                  required 
                  maxLength={4}
                  value={schoolCode.replace(/[^0-9]/g, '')} 
                  onChange={(e) => {
                      const numbers = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      const letters = schoolCode.replace(/[^A-Z]/g, '');
                      onDraftChange({ ...draft, schoolCode: letters + numbers });
                  }} 
                  className={`flex-1 min-h-[50px] px-4 py-3 bg-gray-50 border-2 rounded-2xl outline-none transition-all font-bold text-sm uppercase tracking-widest ${formErrors.schoolCode ? 'border-red-400 focus:border-red-400' : 'border-gray-100 focus:border-orange-500'}`}
                  placeholder="1234" 
                />
            </div>
            {formErrors.schoolCode && (
                <p className="text-[9px] font-black text-red-500 flex items-center gap-1"><AlertCircle size={10}/> {formErrors.schoolCode}</p>
            )}
          </div>

          {/* Jenis Sekolah */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Sekolah *</label>
            <select required value={schoolType} onChange={(e) => onDraftChange({ ...draft, schoolType: e.target.value })} className="w-full min-h-[50px] px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold text-sm">
              <option value="">Pilih...</option>
              <option value="SEKOLAH RENDAH">SEKOLAH RENDAH</option>
              <option value="SEKOLAH MENENGAH">SEKOLAH MENENGAH</option>
            </select>
          </div>

          {/* Nama Sekolah */}
          <div className="space-y-2 md:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Sekolah *</label>
            <input 
              type="text" 
              required 
              value={schoolName} 
              onChange={handleSchoolNameChange} 
              onBlur={handleSchoolNameBlur}
              className="w-full min-h-[50px] px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold text-sm uppercase" 
              placeholder="Contoh: SK TAMAN DESA" 
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex gap-2 items-start bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                <Info size={14} className="text-orange-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-gray-600 font-medium leading-snug">
                    Jika sekolah kebangsaan hanya tulis <strong className="text-orange-700">SK</strong>, 
                    jika sekolah menengah kebangsaan tulis <strong className="text-orange-700">SMK</strong>, 
                    jika sekolah jenis kebangsaan cina atau india tulis sahaja <strong className="text-orange-700">SJKC</strong> atau <strong className="text-orange-700">SJKT</strong>.
                </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white p-4 md:p-8 rounded-[2rem] border-2 border-orange-50">
        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3 uppercase tracking-tighter">
            <span className="bg-orange-600 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm">2</span>
            Maklumat Guru
        </h3>
        <div className="space-y-4">
            {teachers.map((teacher, index) => (
              <div key={index} className="p-5 bg-orange-50/30 rounded-2xl border-2 border-orange-50 relative">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{index === 0 ? 'Ketua Guru Pembimbing' : 'Guru Pengiring'}</span>
                    {index > 0 && <button type="button" onClick={() => removeTeacher(index)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 md:col-span-2">
                         <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Nama Guru Pengiring (Seperti dalam Kad Pengenalan) *</label>
                         <input required placeholder="Contoh: MUHAMMAD ALI BIN ABU BAKAR" value={teacher.name} onChange={(e) => handleTeacherChange(index, 'name', e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-white rounded-xl outline-none text-sm font-bold shadow-sm focus:border-orange-300 uppercase" />
                    </div>
                    <div className="space-y-1">
                         <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">No. Kad Pengenalan *</label>
                         <input required placeholder="000000000000" value={teacher.ic} onChange={(e) => handleTeacherChange(index, 'ic', e.target.value)} maxLength={14} className={`w-full px-4 py-3 bg-white border-2 rounded-xl outline-none text-sm font-bold shadow-sm font-mono focus:border-orange-300 ${formErrors.teachers[index]?.includes('IC tidak lengkap') ? 'border-red-400' : 'border-white'}`} />
                         {formErrors.teachers[index]?.includes('IC tidak lengkap') && (
                             <p className="text-[9px] font-black text-red-500 flex items-center gap-1"><AlertCircle size={10}/> IC tidak lengkap</p>
                         )}
                    </div>
                    <div className="space-y-1">
                         <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Alamat Emel *</label>
                         <input required type="email" placeholder="Contoh: guru@moe.gov.my" value={teacher.email} onChange={(e) => handleTeacherChange(index, 'email', e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-white rounded-xl outline-none text-sm font-bold shadow-sm focus:border-orange-300" />
                    </div>
                    <div className="space-y-1">
                         <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">No. Telefon *</label>
                         <input required type="tel" placeholder="Contoh: 0123456789" value={teacher.phone} onChange={(e) => handleTeacherChange(index, 'phone', e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-white rounded-xl outline-none text-sm font-bold shadow-sm focus:border-orange-300" />
                    </div>
                 </div>
              </div>
            ))}
            <button type="button" onClick={addTeacher} className="w-full py-4 bg-orange-50 text-orange-600 text-xs font-black rounded-2xl border-2 border-dashed border-orange-100 hover:bg-orange-100 transition-all uppercase">+ Tambah Guru</button>
        </div>
      </section>

      <section className="bg-white p-4 md:p-8 rounded-[2rem] border-2 border-blue-50">
        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3 uppercase tracking-tighter">
            <span className="bg-blue-600 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm">3</span>
            Maklumat Pelajar
        </h3>
        <div className="space-y-4">
          {students.map((student, index) => (
            <div key={index} className="p-5 bg-blue-50/30 rounded-2xl border-2 border-blue-50">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Pelajar {index + 1}</span>
                  {students.length > 1 && <button type="button" onClick={() => removeStudent(index)} className="text-red-400"><Trash2 size={18} /></button>}
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                 <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Nama Pelajar (Seperti dalam Kad Pengenalan) *</label>
                    <input required placeholder="Contoh: AHMAD BIN ABDULLAH" value={student.name} onChange={(e) => handleStudentChange(index, 'name', e.target.value)} className="w-full px-4 py-3 border-2 border-white rounded-xl outline-none text-sm font-bold bg-white focus:border-blue-300 uppercase" />
                 </div>
                 <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">No. Kad Pengenalan *</label>
                    <input required placeholder="000000000000" value={student.ic} onChange={(e) => handleStudentChange(index, 'ic', e.target.value)} maxLength={14} className={`w-full px-4 py-3 border-2 rounded-xl outline-none text-sm font-bold font-mono bg-white focus:border-blue-300 ${formErrors.students[index]?.includes('IC tidak lengkap') ? 'border-red-400' : 'border-white'}`} />
                    {formErrors.students[index]?.includes('IC tidak lengkap') && (
                        <p className="text-[9px] font-black text-red-500 flex items-center gap-1"><AlertCircle size={10}/> IC tidak lengkap</p>
                    )}
                 </div>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Bangsa *</label>
                    <select required value={student.race} onChange={(e) => handleStudentChange(index, 'race', e.target.value)} className="w-full px-3 border-2 border-white rounded-xl text-xs font-bold outline-none bg-white min-h-[45px]">
                        <option value="">Pilih</option>
                        <option value="Melayu">Melayu</option>
                        <option value="Cina">Cina</option>
                        <option value="India">India</option>
                        <option value="Lain-lain">Lain-lain</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Jantina *</label>
                    <select required value={student.gender} onChange={(e) => handleStudentChange(index, 'gender', e.target.value)} className="w-full px-3 border-2 border-white rounded-xl text-xs font-bold outline-none bg-white min-h-[45px]">
                        <option value="">Pilih</option>
                        <option value="Lelaki">Lelaki</option>
                        <option value="Perempuan">Perempuan</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Kategori *</label>
                    <select required value={student.category} onChange={(e) => handleStudentChange(index, 'category', e.target.value)} disabled={!student.gender} className="w-full px-3 border-2 border-white rounded-xl text-xs font-bold outline-none bg-white disabled:bg-gray-100 min-h-[45px]">
                        <option value="">Pilih</option>
                        {getCategoryOptions(student.gender).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Pemain</label>
                    <div className="px-3 bg-gray-100 rounded-xl text-[10px] font-mono flex items-center text-gray-400 border-2 border-white uppercase overflow-hidden min-h-[45px]">
                        {student.playerId || 'AUTO-ID'}
                    </div>
                 </div>
               </div>
            </div>
          ))}
          <button type="button" onClick={addStudent} className="w-full py-4 bg-blue-50 text-blue-600 text-xs font-black rounded-2xl border-2 border-dashed border-blue-100 hover:bg-blue-100 transition-all uppercase">+ Tambah Pelajar</button>
        </div>
      </section>

      <div className="flex flex-col md:flex-row gap-4 justify-end pt-8">
        <button type="button" onClick={resetForm} disabled={isSubmitting} className="px-10 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50">Reset Borang</button>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-16 py-5 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-orange-400"
        >
          {isSubmitting ? (
            <><RefreshCw size={20} className="animate-spin" /> Menghantar...</>
          ) : (
            <><Save size={20} /> Hantar Pendaftaran</>
          )}
        </button>
      </div>
    </form>
  );
};

export default RegistrationForm;
