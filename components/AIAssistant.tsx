import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, MessageSquare, Sparkles, Zap } from "lucide-react";
import { Button } from "./Button";
import { getProceduralGuidance } from "../services/geminiService";

interface AIAssistantProps {
  activeTab: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ activeTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
      { role: 'ai', text: `Hola, estoy aquí para ayudarte con el módulo de ${activeTab === 'data' ? 'Metrados' : activeTab}. ¿En qué puedo asistirte hoy?` }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Update welcome message on tab change
  useEffect(() => {
      if (messages.length === 1) {
        setMessages([{ role: 'ai', text: `Hola, estoy detectando que estás en el módulo "${activeTab}". ¿Necesitas ayuda con los procedimientos de esta sección?` }]);
      }
  }, [activeTab]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery("");
    setIsTyping(true);

    try {
        const response = await getProceduralGuidance(activeTab, userMsg);
        setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
        setMessages(prev => [...prev, { role: 'ai', text: "Lo siento, hubo un error de conexión." }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
      }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 w-80 md:w-96 h-[450px] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-10 fade-in duration-200">
            {/* Header */}
            <div className="bg-[#003366] p-3 flex justify-between items-center">
                <div className="flex items-center gap-2 text-white">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span className="font-bold text-sm">Asistente Inteligente</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-tl-none shadow-sm'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-xl rounded-tl-none border border-gray-200 dark:border-gray-700 shadow-sm flex gap-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <input
                    className="flex-1 bg-gray-100 dark:bg-gray-900 border-0 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Pregunta sobre procedimientos..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyPress}
                />
                <button 
                    onClick={handleSend}
                    disabled={!query.trim() || isTyping}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${isOpen ? 'bg-gray-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} hover:shadow-lg hover:scale-105 transition-all duration-300 text-white p-3.5 rounded-full shadow-md flex items-center gap-2 group`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        {!isOpen && <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap text-sm font-bold pr-1">Asistente AI</span>}
      </button>
    </div>
  );
};