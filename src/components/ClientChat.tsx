import { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Bot, User, Loader2, AlertCircle, Mic, Volume2, Plane, Play, Pause, Square } from 'lucide-react';
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
  audioUrl?: string;
}

const createAudioUrl = (base64Data: string) => {
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const isWav = bytes.length > 4 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70;
  
  let blob: Blob;
  if (isWav) {
    blob = new Blob([bytes], { type: 'audio/wav' });
  } else {
    // Add WAV header for raw PCM (16-bit, 24kHz, mono)
    const sampleRate = 24000;
    const numChannels = 1;
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + bytes.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, bytes.length, true);

    blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
  }
  
  return URL.createObjectURL(blob);
};

export function ClientChat({ itinerary, clientName, companyLogo, agentPicture, onBack }: ClientChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      // Cleanup object URLs
      messages.forEach(msg => {
        if (msg.audioUrl) {
          URL.revokeObjectURL(msg.audioUrl);
        }
      });
    };
  }, [itinerary, clientName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePlayAudio = (id: string, url: string) => {
    if (playingId === id) {
      if (audioRef.current) {
        if (isPaused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      setPlayingId(null);
      setIsPaused(false);
    };
    
    audio.onpause = () => {
      setIsPaused(true);
    };

    audio.onplay = () => {
      setIsPaused(false);
    };

    audio.play().catch(e => console.error("Audio play failed:", e));
    setPlayingId(id);
    setIsPaused(false);
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
    setIsPaused(false);
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
      const newId = (Date.now() + 1).toString();
      
      // Generate speech for the response
      const base64Audio = await generateSpeech(modelText);
      let audioUrl = undefined;
      
      if (base64Audio) {
        audioUrl = createAudioUrl(base64Audio);
        // Auto-play the new audio
        handlePlayAudio(newId, audioUrl);
      }

      setMessages(prev => [...prev, { 
        id: newId, 
        role: 'model', 
        text: modelText,
        audioUrl 
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
                  {msg.audioUrl && (
                    <div className="mt-3 flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg p-1.5 w-fit">
                      <button 
                        onClick={() => handlePlayAudio(msg.id, msg.audioUrl!)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                        title={playingId === msg.id && !isPaused ? "Pause" : "Play"}
                      >
                        {playingId === msg.id && !isPaused ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                      </button>
                      <button 
                        onClick={handleStopAudio}
                        disabled={playingId !== msg.id}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                          playingId !== msg.id 
                            ? 'text-stone-300 cursor-not-allowed' 
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                        title="Stop"
                      >
                        <Square size={14} className="fill-current" />
                      </button>
                      <div className="text-xs font-medium text-stone-500 px-2">
                        {playingId === msg.id && !isPaused ? 'Playing...' : playingId === msg.id && isPaused ? 'Paused' : 'Audio Response'}
                      </div>
                    </div>
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
