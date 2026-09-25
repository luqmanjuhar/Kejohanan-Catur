const fs = require('fs');
let content = fs.readFileSync('components/SetupModal.tsx', 'utf8');

// The lines were deleted because they contained ''
// Let's replace the whole section of toggles.

const badSection = `                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest">Buka Pendaftaran Baru</h4>
                                    <p className="text-xs text-gray-500 font-medium mt-1">Membenarkan sekolah untuk menghantar pendaftaran baru.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={config.isRegistrationOpen !== false} 
                                        onChange={(e) => setConfig({...config, isRegistrationOpen: e.target.checked})} 
                                    />
                                </label>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest">Buka Semakan & Kemaskini</h4>
                                    <p className="text-xs text-gray-500 font-medium mt-1">Membenarkan sekolah untuk menyemak dan mengemaskini pendaftaran.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={config.isUpdateOpen !== false} 
                                        onChange={(e) => setConfig({...config, isUpdateOpen: e.target.checked})} 
                                    />
                                </label>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest">Buka Cetakan Slip</h4>
                                    <p className="text-xs text-gray-500 font-medium mt-1">Membenarkan sekolah untuk memuat turun dan mencetak slip pendaftaran.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={config.isPrintOpen !== false} 
                                        onChange={(e) => setConfig({...config, isPrintOpen: e.target.checked})} 
                                    />
                                </label>
                            </div>`;

const goodSection = `                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest">Buka Pendaftaran Baru</h4>
                                    <p className="text-xs text-gray-500 font-medium mt-1">Membenarkan sekolah untuk menghantar pendaftaran baru.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={config.isRegistrationOpen !== false} 
                                        onChange={(e) => setConfig({...config, isRegistrationOpen: e.target.checked})} 
                                    />
                                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest">Buka Semakan & Kemaskini</h4>
                                    <p className="text-xs text-gray-500 font-medium mt-1">Membenarkan sekolah untuk menyemak dan mengemaskini pendaftaran.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={config.isUpdateOpen !== false} 
                                        onChange={(e) => setConfig({...config, isUpdateOpen: e.target.checked})} 
                                    />
                                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest">Buka Cetakan Slip</h4>
                                    <p className="text-xs text-gray-500 font-medium mt-1">Membenarkan sekolah untuk memuat turun dan mencetak slip pendaftaran.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={config.isPrintOpen !== false} 
                                        onChange={(e) => setConfig({...config, isPrintOpen: e.target.checked})} 
                                    />
                                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>
                            
                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest">Buka Muat Turun E-Cert</h4>
                                    <p className="text-xs text-gray-500 font-medium mt-1">Membenarkan sekolah memuat turun E-Cert (sekiranya ada).</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={config.isEcertOpen !== false} 
                                        onChange={(e) => setConfig({...config, isEcertOpen: e.target.checked})} 
                                    />
                                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>`;

content = content.replace(badSection, goodSection);
fs.writeFileSync('components/SetupModal.tsx', content);
