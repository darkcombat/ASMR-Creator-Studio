import React, { useState, useRef, useEffect } from 'react';
import { generateASMRPlan, continueChat, generateASMRVideo } from './services/geminiService';
import { Message, ASMRCategory, VideoPlanRequest } from './types';
import { Icon } from './components/Icon';
import { PlanDisplay } from './components/PlanDisplay';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string>(''); // 'plan' or 'video'
  
  // Form State
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<string>(ASMRCategory.ROLEPLAY);
  const [duration, setDuration] = useState('');
  const [preferences, setPreferences] = useState('');
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = process.env.API_KEY;
    if (key) {
        setApiKey(key);
        setHasKey(true);
    } else {
        console.warn("API Key not found in process.env.");
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const ensureApiKey = async (): Promise<string | null> => {
      // Check for Veo/Paid key selection if available
      // Cast to any to avoid TypeScript conflict with global declaration of aistudio
      const win = window as any;
      if (win.aistudio) {
          const hasSelected = await win.aistudio.hasSelectedApiKey();
          if (!hasSelected) {
              try {
                  await win.aistudio.openSelectKey();
                  // Race condition mitigation: assume success, but re-read env
              } catch (e) {
                  console.error("Key selection failed", e);
                  return null;
              }
          }
      }
      // Re-read key from env which might have been updated by selection
      return process.env.API_KEY || apiKey;
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentKey = await ensureApiKey();
    if (!currentKey) return;
    setApiKey(currentKey);

    setIsLoading(true);
    setLoadingAction('plan');
    const request: VideoPlanRequest = { topic, category, duration, preferences };

    // Add user request to UI
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Genera un piano per un video ASMR: ${category} - ${topic}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsChatMode(true);

    try {
      const result = await generateASMRPlan(currentKey, request);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: result,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "Si è verificato un errore durante la generazione del piano. Per favore riprova.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  };

  const handleGenerateVideo = async (e: React.MouseEvent) => {
    e.preventDefault();
    const currentKey = await ensureApiKey();
    if (!currentKey) return;
    setApiKey(currentKey);

    setIsLoading(true);
    setLoadingAction('video');

    const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Genera un'anteprima video per: ${category} - ${topic}`,
        timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsChatMode(true);

    try {
        const videoUrl = await generateASMRVideo(currentKey, topic, category);
        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: `Ecco un'anteprima visiva generata con Veo per il tuo concept "${topic}".`,
            videoUrl: videoUrl,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
        console.error(error);
        const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: "Si è verificato un errore durante la generazione del video. Assicurati di aver selezionato un progetto con fatturazione abilitata.",
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
        setLoadingAction('');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      const currentKey = await ensureApiKey();
      if(!chatInput.trim() || !currentKey) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: chatInput,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
      setChatInput('');
      setIsLoading(true);

      try {
          // Filter out messages with videoUrl to avoid confusing the text model history if needed, 
          // or just send text content. The service handles text parts.
          const history = messages.map(m => ({role: m.role, content: m.content}));
          const result = await continueChat(currentKey, history, userMsg.content);
          
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: result,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMsg]);
      } catch (error) {
          console.error(error);
      } finally {
          setIsLoading(false);
      }
  };

  const resetForm = () => {
      setMessages([]);
      setIsChatMode(false);
      setTopic('');
  };

  if (!hasKey) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-lavender-200">
                  <Icon.Headphones className="w-16 h-16 text-lavender-500 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-slate-800 mb-2">ASMR Creator Studio</h1>
                  <p className="text-slate-600 mb-6">
                      L'applicazione richiede una chiave API configurata nell'ambiente per funzionare.
                  </p>
                  <p className="text-sm text-slate-400 bg-slate-100 p-2 rounded">
                      process.env.API_KEY mancante
                  </p>
              </div>
          </div>
      )
  }

  return (
    <div className="flex flex-col h-screen bg-lavender-50 font-sans text-slate-800 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-lavender-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={resetForm}>
          <div className="bg-lavender-100 p-2 rounded-xl">
             <Icon.Sparkles className="w-6 h-6 text-lavender-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ASMR Creator Studio</h1>
            <p className="text-xs text-slate-500 font-medium">Powered by Gemini & Veo</p>
          </div>
        </div>
        <div className="text-sm font-medium text-lavender-600 bg-lavender-50 px-3 py-1 rounded-full border border-lavender-100">
             Assistente Creativo
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Form (Hidden on mobile if chat active) */}
        <div className={`w-full md:w-1/3 lg:w-1/4 bg-white border-r border-lavender-200 p-6 flex-col gap-6 overflow-y-auto ${isChatMode ? 'hidden md:flex' : 'flex'}`}>
          <div>
            <h2 className="text-lg font-bold mb-1">Nuovo Progetto</h2>
            <p className="text-sm text-slate-500">Definisci i parametri del tuo video.</p>
          </div>

          <form onSubmit={handleGeneratePlan} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Categoria</label>
              <div className="relative">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lavender-400 focus:outline-none appearance-none cursor-pointer"
                >
                  {Object.values(ASMRCategory).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Icon.Video className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Idea o Trigger Specifici</label>
              <textarea 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Es. Visita medica oculistica, scratching su legno..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lavender-400 focus:outline-none min-h-[100px] resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Durata</label>
                    <input 
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="Es. 20 min"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lavender-400 focus:outline-none"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Stile</label>
                    <input 
                        type="text"
                        placeholder="Soft spoken"
                        value={preferences}
                        onChange={(e) => setPreferences(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lavender-400 focus:outline-none"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
                <button 
                type="submit" 
                disabled={isLoading || !topic}
                className="bg-lavender-600 hover:bg-lavender-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-lavender-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {isLoading && loadingAction === 'plan' ? (
                    <>
                        <Icon.Loader2 className="w-5 h-5 animate-spin" />
                        Pianificazione...
                    </>
                ) : (
                    <>
                        <Icon.Sparkles className="w-5 h-5" />
                        Genera Piano
                    </>
                )}
                </button>

                <button 
                type="button" 
                onClick={handleGenerateVideo}
                disabled={isLoading || !topic}
                className="bg-white border-2 border-lavender-600 text-lavender-700 hover:bg-lavender-50 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {isLoading && loadingAction === 'video' ? (
                    <>
                        <Icon.Loader2 className="w-5 h-5 animate-spin" />
                        Creazione Video...
                    </>
                ) : (
                    <>
                        <Icon.MonitorPlay className="w-5 h-5" />
                        Genera Anteprima Video
                    </>
                )}
                </button>
            </div>
          </form>

          <div className="mt-auto bg-lavender-50 p-4 rounded-xl border border-lavender-100">
            <h3 className="text-sm font-bold text-lavender-800 mb-2 flex items-center gap-2">
                <Icon.Info className="w-4 h-4"/>
                Tip del Giorno
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
                Usa la generazione video per visualizzare l'atmosfera e l'illuminazione prima di girare. I video generati sono ideali come reference visiva.
            </p>
          </div>
        </div>

        {/* Right Side: Output / Chat */}
        <div className={`flex-1 flex flex-col bg-white/50 relative ${!isChatMode ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Empty State */}
            {messages.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-60 pointer-events-none">
                    <div className="bg-white p-6 rounded-full shadow-sm mb-6">
                        <Icon.Feather className="w-12 h-12 text-lavender-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-400 mb-2">Inizia a creare</h2>
                    <p className="text-slate-400 max-w-sm">
                        Compila il modulo a sinistra per generare un piano completo o un'anteprima video per il tuo canale ASMR.
                    </p>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl p-5 shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-br-none' 
                                : 'bg-white border border-lavender-100 rounded-bl-none'
                        }`}>
                            {/* Video Player */}
                            {msg.videoUrl && (
                                <div className="mb-4 rounded-xl overflow-hidden shadow-md bg-black">
                                    <video 
                                        controls 
                                        autoPlay 
                                        loop
                                        className="w-full h-auto aspect-video"
                                        src={msg.videoUrl}
                                    >
                                        Il tuo browser non supporta il tag video.
                                    </video>
                                    <div className="bg-slate-900 text-white text-xs p-2 flex items-center justify-between">
                                        <span>Generato con Veo</span>
                                        <span className="opacity-70">1080p Preview</span>
                                    </div>
                                </div>
                            )}

                            {msg.role === 'model' ? (
                                <PlanDisplay content={msg.content} />
                            ) : (
                                <p className="text-sm md:text-base">{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start w-full">
                        <div className="bg-white border border-lavender-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-3">
                            <Icon.Loader2 className="w-5 h-5 text-lavender-500 animate-spin" />
                            <span className="text-sm text-slate-500">
                                {loadingAction === 'video' ? "Generazione video in corso (può richiedere un minuto)..." : "L'AI sta scrivendo..."}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Input (Only visible if chat mode is active) */}
            {isChatMode && (
                 <div className="p-4 bg-white border-t border-lavender-100 shrink-0">
                    <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex gap-3">
                         <button 
                            type="button"
                            onClick={() => {
                                setIsChatMode(false);
                                setMessages([]); 
                                setTopic('');
                            }}
                            className="md:hidden p-3 rounded-xl bg-slate-100 text-slate-600"
                        >
                            ←
                        </button>
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Chiedi modifiche o dettagli..."
                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-lavender-400 focus:outline-none"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !chatInput.trim()}
                            className="p-3 bg-lavender-600 hover:bg-lavender-700 text-white rounded-xl transition-colors disabled:opacity-50"
                        >
                            <Icon.Send className="w-5 h-5" />
                        </button>
                    </form>
                 </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;