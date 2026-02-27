import { FileText, User, Sparkles, ArrowRight, FileDown, Upload, Loader2, Image as ImageIcon, Link as LinkIcon, X, Globe, Search } from 'lucide-react';
import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { extractItineraryFromUrl, extractPackagesFromWebsite, TravelPackage } from '../services/geminiService';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker path for PDF.js using Vite's ?url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface AgentSetupProps {
  itinerary: string;
  setItinerary: (val: string) => void;
  clientName: string;
  setClientName: (val: string) => void;
  companyLogo: string | null;
  setCompanyLogo: (val: string | null) => void;
  agentPicture: string | null;
  setAgentPicture: (val: string | null) => void;
  onPreview: () => void;
}

const SAMPLE_ITINERARY = `**Day 1: Arrival in Paris**
- 2:00 PM: Arrive at Charles de Gaulle Airport (CDG). Private transfer to hotel.
- 3:30 PM: Check-in at The Peninsula Paris.
- 7:30 PM: Welcome dinner at Le Jules Verne (Eiffel Tower).

**Day 2: Art & History**
- 9:00 AM: Breakfast at the hotel.
- 10:00 AM: Private guided tour of the Louvre Museum (skip-the-line tickets included).
- 1:00 PM: Lunch at Café Marly overlooking the Louvre Pyramid.
- 3:00 PM: Walking tour of Le Marais district.
- 8:00 PM: Dinner cruise on the Seine River with Bateaux Parisiens.

**Day 3: Departure**
- 8:00 AM: Breakfast and check-out.
- 10:00 AM: Private transfer to CDG Airport for your flight home.`;

export function AgentSetup({ 
  itinerary, 
  setItinerary, 
  clientName, 
  setClientName, 
  companyLogo,
  setCompanyLogo,
  agentPicture,
  setAgentPicture,
  onPreview 
}: AgentSetupProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  
  const [companyWebsiteUrl, setCompanyWebsiteUrl] = useState('');
  const [extractedPackages, setExtractedPackages] = useState<TravelPackage[]>([]);
  const [isFetchingPackages, setIsFetchingPackages] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const agentInputRef = useRef<HTMLInputElement>(null);
  
  const isReady = itinerary.trim().length > 10 && clientName.trim().length > 0;

  const loadSample = () => {
    setClientName("Sarah Jenkins");
    setItinerary(SAMPLE_ITINERARY);
  };

  const extractTextFromPDF = async (file: File) => {
    setIsExtracting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }

      setItinerary(fullText.trim());
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      alert("Failed to extract text from the PDF. Please try again or paste the text manually.");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      extractTextFromPDF(file);
    } else if (file) {
      alert("Please upload a valid PDF file.");
    }
  };

  const handleUrlImport = async () => {
    if (!urlInputValue.trim()) return;
    
    setIsExtracting(true);
    try {
      const extractedText = await extractItineraryFromUrl(urlInputValue.trim());
      setItinerary(extractedText);
      setShowUrlInput(false);
      setUrlInputValue('');
    } catch (error: any) {
      console.error("Error extracting from URL:", error);
      alert(`Failed to extract itinerary: ${error.message || "Unknown error"}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFetchPackages = async () => {
    if (!companyWebsiteUrl.trim()) return;
    
    setIsFetchingPackages(true);
    setExtractedPackages([]);
    try {
      const packages = await extractPackagesFromWebsite(companyWebsiteUrl.trim());
      if (packages.length === 0) {
        alert("No packages or itineraries found on this website.");
      } else {
        setExtractedPackages(packages);
      }
    } catch (error: any) {
      console.error("Error fetching packages:", error);
      alert(`Failed to fetch packages: ${error.message || "Unknown error"}. Please try again.`);
    } finally {
      setIsFetchingPackages(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setter(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-stone-50">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-stone-900 tracking-tight">Trip Configuration</h2>
            <p className="text-stone-500 mt-2">Set up the AI concierge for your client's upcoming journey.</p>
          </div>
          <button 
            onClick={loadSample}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <FileDown size={16} />
            Load Sample
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Logo Upload */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-2">
                  <ImageIcon size={16} className="text-stone-400" />
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  {companyLogo && (
                    <img src={companyLogo} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-stone-200" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={logoInputRef}
                    onChange={(e) => handleImageUpload(e, setCompanyLogo)}
                  />
                  <button 
                    onClick={() => logoInputRef.current?.click()}
                    className="text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 px-4 py-2 rounded-xl transition-colors"
                  >
                    {companyLogo ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  {companyLogo && (
                    <button 
                      onClick={() => setCompanyLogo(null)}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Agent Picture Upload */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-2">
                  <User size={16} className="text-stone-400" />
                  Agent Picture
                </label>
                <div className="flex items-center gap-4">
                  {agentPicture && (
                    <img src={agentPicture} alt="Agent" className="w-12 h-12 rounded-full object-cover border border-stone-200" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={agentInputRef}
                    onChange={(e) => handleImageUpload(e, setAgentPicture)}
                  />
                  <button 
                    onClick={() => agentInputRef.current?.click()}
                    className="text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 px-4 py-2 rounded-xl transition-colors"
                  >
                    {agentPicture ? 'Change Picture' : 'Upload Picture'}
                  </button>
                  {agentPicture && (
                    <button 
                      onClick={() => setAgentPicture(null)}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-stone-100" />

            {/* Import Packages Section */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-2">
                <Globe size={16} className="text-stone-400" />
                Import Packages from Website
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={companyWebsiteUrl}
                  onChange={(e) => setCompanyWebsiteUrl(e.target.value)}
                  placeholder="https://example-travel-company.com/tours"
                  className="flex-1 px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchPackages()}
                />
                <button
                  onClick={handleFetchPackages}
                  disabled={isFetchingPackages || !companyWebsiteUrl.trim()}
                  className="px-6 py-3 bg-stone-900 text-white font-medium rounded-xl hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {isFetchingPackages ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  Find Packages
                </button>
              </div>

              {extractedPackages.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-medium text-stone-700">Select a Package:</h3>
                  <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2">
                    {extractedPackages.map((pkg, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 rounded-xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer group" 
                        onClick={() => {
                          setItinerary(pkg.fullItinerary);
                          // Scroll down to the itinerary textarea
                          document.getElementById('itinerary')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="font-semibold text-stone-900 group-hover:text-emerald-700">{pkg.title}</h4>
                            <p className="text-sm text-stone-500 mt-1 line-clamp-2">{pkg.description}</p>
                          </div>
                          <button className="shrink-0 px-3 py-1.5 bg-white border border-stone-200 text-stone-600 text-xs font-medium rounded-lg group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors">
                            Select
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-stone-100" />

            {/* Client Name */}
            <div>
              <label htmlFor="clientName" className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-2">
                <User size={16} className="text-stone-400" />
                Client Name
              </label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              />
            </div>

            {/* Itinerary */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="itinerary" className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <FileText size={16} className="text-stone-400" />
                  Itinerary Details
                </label>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button 
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    disabled={isExtracting}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <LinkIcon size={14} />
                    Import URL
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                    className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {isExtracting && !showUrlInput ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Upload PDF
                  </button>
                </div>
              </div>
              
              {showUrlInput && (
                <div className="mb-3 flex items-center gap-2 bg-blue-50 p-2 rounded-xl border border-blue-100">
                  <input
                    type="url"
                    value={urlInputValue}
                    onChange={(e) => setUrlInputValue(e.target.value)}
                    placeholder="https://example.com/itinerary"
                    className="flex-1 px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
                  />
                  <button
                    onClick={handleUrlImport}
                    disabled={isExtracting || !urlInputValue.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {isExtracting ? <Loader2 size={14} className="animate-spin" /> : 'Import'}
                  </button>
                  <button 
                    onClick={() => setShowUrlInput(false)}
                    className="p-2 text-blue-400 hover:text-blue-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              
              <textarea
                id="itinerary"
                value={itinerary}
                onChange={(e) => setItinerary(e.target.value)}
                placeholder="Day 1: Arrival in Paris...&#10;Hotel: The Peninsula Paris&#10;Dinner: 7:30 PM at Le Jules Verne"
                className="w-full h-64 px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none resize-none font-mono text-sm"
              />
            </div>

          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-3 text-sm text-stone-500">
            <Sparkles size={18} className="text-emerald-500" />
            <span>The AI will only answer questions based on this itinerary.</span>
          </div>
          <button
            onClick={onPreview}
            disabled={!isReady}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              isReady 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow' 
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
            }`}
          >
            Preview Client Chat
            <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
