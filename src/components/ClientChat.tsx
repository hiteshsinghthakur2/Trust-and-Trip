import { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Bot, User, Loader2, AlertCircle, Mic, Volume2, Plane } from 'lucide-react';
import Markdown from 'react-markdown';
import { createTravelAgentChat, generateSpeech } from '../services/geminiService';

interface ClientChatProps {
  itinerary: string;
  clientName: string;
  companyLogo: string | null;
  agentPicture: string | null;
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  audioData?: string;
}

export function ClientChat({ itinerary, clientName, companyLogo, agentPicture, onBack }: ClientChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const session = await createTravelAgentChat(itinerary, clientName);
        setChatSession(session);
        setMessages([
          {
            id: 'welcome',
            role: 'model',
            text: `Hi ${clientName}! I'm Stoner AI (AKASH). I have your itinerary ready. How can I help you with your trip today?`
          }
        ]);
      } catch (err) {
        console.error("Failed to initialize chat:", err);
        setError("Failed to connect to the AI assistant. Please check your API key.");
      }
    };
    initChat();
    
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [itinerary, clientName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const playAudio = async (base64Data: string) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      if (activeAudioSourceRef.current) {
        activeAudioSourceRef.current.stop();
        activeAudioSourceRef.current.disconnect();
      }

      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const isWav = bytes.length > 4 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70;
      
      let audioBuffer: AudioBuffer;
      if (isWav) {
         audioBuffer = await audioCtx.decodeAudioData(bytes.buffer);
      } else {
         const int16Array = new Int16Array(bytes.buffer);
         const float32Array = new Float32Array(int16Array.length);
         for (let i = 0; i < int16Array.length; i++) {
           float32Array[i] = int16Array[i] / 32768.0;
         }
         audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
         audioBuffer.getChannelData(0).set(float32Array);
      }

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
      activeAudioSourceRef.current = source;
      
      source.onended = () => {
        if (activeAudioSourceRef.current === source) {
          activeAudioSourceRef.current = null;
        }
      };
    } catch (err) {
      console.error("Failed to play audio:", err);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const userText = textOverride || input.trim();
    if (!userText || !chatSession || isLoading) return;

    if (!textOverride) setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
    setIsLoading(true);
    setError(null);

    try {
      let response = await chatSession.sendMessage({ message: userText });
      
      // Handle function calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'notifyHotel') {
            const { hotelName, message } = call.args;
            console.log(`[Webhook Simulation] Notifying ${hotelName}: ${message}`);
            response = await chatSession.sendMessage({
              message: [{
                functionResponse: {
                  name: call.name,
                  response: { success: true, details: `Successfully notified ${hotelName}.` }
                }
              }]
            });
          } else if (call.name === 'getBookingLink') {
            const { activityName } = call.args;
            const link = `https://booking.stonerai.com/${activityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            response = await chatSession.sendMessage({
              message: [{
                functionResponse: {
                  name: call.name,
                  response: { link }
                }
              }]
            });
          }
        }
      }

      const modelText = response.text;
      
      // Generate speech for the response
      const base64Audio = await generateSpeech(modelText);
      if (base64Audio) {
        playAudio(base64Audio);
      }

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: modelText,
        audioData: base64Audio 
      }]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message ? `Connection Error: ${err.message}` : "Sorry, I'm having trouble connecting right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Automatically send after speaking
      handleSend(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
            ) : (
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                <Plane size={16} />
              </div>
            )}
            <div>
              <h2 className="font-semibold text-stone-900 leading-tight">Stoner AI (AKASH)</h2>
              <p className="text-xs text-stone-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Online
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm max-w-2xl mx-auto">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'user' ? (
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-stone-900 text-white">
                <User size={16} />
              </div>
            ) : (
              agentPicture ? (
                <img src={agentPicture} alt="Agent" className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-emerald-600 text-white">
                  <Bot size={16} />
                </div>
              )
            )}
            
            <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] shadow-sm ${
              msg.role === 'user' 
                ? 'bg-stone-900 text-white rounded-tr-none' 
                : 'bg-white text-stone-800 border border-stone-100 rounded-tl-none'
            }`}>
              {msg.role === 'model' ? (
                <div className="prose prose-sm prose-stone max-w-none prose-p:leading-relaxed prose-a:text-emerald-600">
                  <Markdown>{msg.text}</Markdown>
                  {msg.audioData && (
                    <button 
                      onClick={() => playAudio(msg.audioData!)}
                      className="mt-2 text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-xs font-medium"
                    >
                      <Volume2 size={14} /> Play Audio
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-4 max-w-3xl mx-auto">
            {agentPicture ? (
              <img src={agentPicture} alt="Agent" className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={16} />
              </div>
            )}
            <div className="px-5 py-4 rounded-2xl bg-white border border-stone-100 rounded-tl-none shadow-sm flex items-center gap-2 text-stone-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm font-medium">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-stone-200 p-4 md:p-6">
        <div className="max-w-3xl mx-auto relative flex items-center gap-2">
          <button
            onClick={startListening}
            disabled={isLoading}
            className={`p-3 rounded-xl transition-all shrink-0 ${
              isListening 
                ? 'bg-red-100 text-red-600 animate-pulse' 
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Mic size={20} />
          </button>
          
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask about your itinerary..."}
              className="w-full pl-4 pr-14 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none resize-none h-14 min-h-[56px] max-h-32 text-[15px]"
              rows={1}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`absolute right-2 top-2 p-2.5 rounded-xl transition-all ${
                input.trim() && !isLoading
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-stone-400 mt-3">
          Stoner AI (AKASH) can make mistakes. Check important details with your agent.
        </p>
      </div>
    </div>
  );
}
