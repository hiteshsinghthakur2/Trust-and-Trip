/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Plane, User, Settings, MessageSquare, ChevronRight, Sparkles } from 'lucide-react';
import { AgentSetup } from './components/AgentSetup';
import { ClientChat } from './components/ClientChat';

export default function App() {
  const [view, setView] = useState<'admin' | 'client'>('admin');
  const [itinerary, setItinerary] = useState('');
  const [clientName, setClientName] = useState('');

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-stone-200 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-stone-200 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Plane size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-stone-900 leading-tight">WanderAI</h1>
            <p className="text-xs text-stone-500 font-medium">Travel Concierge</p>
          </div>
        </div>
        
        <nav className="p-4 flex-1 space-y-1">
          <button
            onClick={() => setView('admin')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              view === 'admin' 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Settings size={18} />
            Agent Setup
          </button>
          <button
            onClick={() => setView('client')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              view === 'client' 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <MessageSquare size={18} />
            Client Preview
          </button>
        </nav>
        
        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500">
              <User size={16} />
            </div>
            <div className="text-sm">
              <p className="font-medium text-stone-900">Travel Agent</p>
              <p className="text-xs text-stone-500">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {view === 'admin' ? (
          <AgentSetup 
            itinerary={itinerary} 
            setItinerary={setItinerary} 
            clientName={clientName} 
            setClientName={setClientName}
            onPreview={() => setView('client')}
          />
        ) : (
          <ClientChat 
            itinerary={itinerary} 
            clientName={clientName} 
            onBack={() => setView('admin')}
          />
        )}
      </main>
    </div>
  );
}

