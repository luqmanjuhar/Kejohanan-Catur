const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

const replacement = `                    />
                    ) : eventConfig.isEcertOpen === false ? (
                      <div className="bg-white p-12 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 text-center animate-fadeIn max-w-2xl mx-auto mt-8">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock size={32} className="text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-2">E-Cert Ditutup</h2>
                        <div className="text-gray-500 font-medium max-w-md mx-auto space-y-4">
                            <p>
                                Sistem muat turun E-Cert untuk kejohanan ini belum dibuka atau telah ditutup.
                            </p>
                        </div>
                      </div>
                    ) : (
                    <PrintECert 
                      localRegistrations={registrations}
                      config={eventConfig}
                    />
                    )
                  }`;

content = content.replace(/                    \/>\n                    \)\n                  }/, replacement + '\n                  }');
fs.writeFileSync('App.tsx', content);
