
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Loader2 } from 'lucide-react';

export default function AIChatArbiter() {
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text: string}[]>([
    { role: 'ai', text: 'Assalamualaikum! Saya AI Arbiter. Ada soalan tentang peraturan catur FIDE atau MSSM?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: "Anda adalah Arbiter Catur bertauliah untuk MSSD Pasir Gudang. Jawab soalan tentang peraturan catur FIDE/MSSM dalam Bahasa Melayu yang sopan, ringkas dan mudah difahami."
        }
      });
      
      setMessages(prev => [...prev, { role: 'ai', text: response.text || "Maaf, saya tidak dapat menjawab sekarang." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Ralat sambungan AI. Pastikan API_KEY telah disetkan di Vercel." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border-2 border-orange-100 overflow-hidden flex flex-col h-[500px] mb-20 animate-fadeIn">
      <div className="bg-orange-600 p-4 text-white flex items-center gap-3">
        <Bot size={24}/>
        <div>
            <h3 className="font-bold text-sm leading-none uppercase tracking-tighter">AI Arbiter Assistant</h3>
            <span className="text-[10px] opacity-70">Sedia menjawab peraturan catur</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-orange-50/20">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${
              m.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-orange-100'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
            <div className="flex items-center gap-2 text-orange-600 font-bold text-[10px] animate-pulse">
                <Loader2 size={12} className="animate-spin" /> AI sedang berfikir...
            </div>
        )}
      </div>

      <div className="p-4 bg-white border-t-2 border-orange-50 flex gap-2">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="Tanya soalan peraturan..."
          className="flex-1 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-xl px-4 py-3 outline-none transition-all text-sm font-medium"
        />
        <button onClick={handleSend} className="bg-orange-600 text-white p-4 rounded-xl shadow-lg active:scale-90 transition-all">
          <Send size={18}/>
        </button>
      </div>
    </div>
  );
}
