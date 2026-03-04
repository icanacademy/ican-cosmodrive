
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Minimize2 } from 'lucide-react';
import { Message } from '../types';

export const AssistantPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Greetings, Commander. I am your Cosmo Assistant. How can I help you navigate the station archives today?' }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    // Simple local response since Gemini API key may not be configured
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'AI assistant is currently in standby mode. Use the sidebar to navigate NAS shares and the search bar to find files.'
      }]);
      setLoading(false);
    }, 500);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:scale-110 active:scale-95 transition-all group z-50"
      >
        <Sparkles className="text-white group-hover:rotate-12 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] glass-card rounded-3xl flex flex-col shadow-2xl border border-blue-500/30 z-50 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="text-blue-400" size={20} />
          <span className="font-orbitron font-bold text-sm text-white">Cosmo AI</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
          <Minimize2 size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-slate-800/80 text-slate-200 border border-white/5 rounded-tl-none'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-white/5 flex gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-slate-900/30">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask the Cosmo AI..."
            className="w-full bg-slate-800 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="absolute right-2 top-1.5 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
