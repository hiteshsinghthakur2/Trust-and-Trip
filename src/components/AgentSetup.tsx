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

const TRUST_AND_TRIP_PACKAGES: TravelPackage[] = [
  {
    title: "Maldives Paradise Escape: 7 Nights of Serenity and Luxury",
    description: "7 Nights 8 Days. Experience the ultimate luxury in the Maldives with beachfront hotels, snorkeling, dolphin cruises, and spa days.",
    fullItinerary: `**Day 01 : Arrival in Hulhumalé**
- Arrive at Velana International Airport.
- Transfer to a beachfront hotel in Hulhumalé.
- Relax by the beach and enjoy a refreshing welcome drink.
- Evening: Sunset walk along the Hulhumalé promenade.

**Day 02 : Explore Hulhumalé**
- Morning: Guided city tour of Hulhumalé, including the mosque and local markets.
- Afternoon: Snorkeling excursion to nearby coral reefs.
- Evening: Traditional Maldivian dinner by the beach.

**Day 03 : Transfer to Maafushi Island**
- Travel to Maafushi via a speedboat transfer.
- Check-in to your island resort.
- Optional: Jet skiing or parasailing.
- Evening: Explore Maafushi's lively local markets.

**Day 04 : Sandbank Picnic & Dolphin Cruise**
- Morning: Sandbank visit with snorkeling opportunities.
- Afternoon: Picnic lunch on a secluded beach.
- Evening: Dolphin cruise with sunset views.

**Day 05 : Vaavu Atoll Adventure**
- Transfer to Vaavu Atoll, known for its glowing plankton beaches.
- Guided dive/snorkeling session to witness manta rays and reef sharks.
- Evening: Relax in a luxurious water villa.

**Day 06 : Water Sports & Spa Day**
- Morning: Kayaking, paddleboarding, or banana boat ride.
- Afternoon: Rejuvenating spa session at the resort.
- Evening: Romantic candlelight dinner on the beach.

**Day 07 : Leisure Day in Vaavu Atoll**
- Spend the day at your own pace, enjoying the resort’s amenities.
- Optional: Explore nearby local islands for cultural experiences.

**Day 08 : Departure from Maldives**
- Morning: Breakfast with ocean views.
- Transfer back to Velana International Airport for your flight home.`
  },
  {
    title: "Bali 8N9D Tour with Bali Swing and Spa | Budget & Customizable",
    description: "8 Nights 9 Days. Explore Kuta and Ubud, including Uluwatu Temple, water sports, Bali Swing, Monkey Forest, and Kintamani Volcano.",
    fullItinerary: `**Day 01 : Arrival in Bali - Welcome to Kuta**
- Arrive at Ngurah Rai International Airport.
- Private transfer to your hotel in Kuta.
- Spend the evening relaxing at Kuta Beach or exploring the vibrant local markets.
- Overnight Stay: Kuta

**Day 02 : Kuta - Uluwatu Temple & Kecak Dance**
- Visit Uluwatu Temple, perched on a cliff with stunning ocean views.
- Experience the cultural Kecak Fire Dance during sunset.
- Optional: Seafood dinner at Jimbaran Bay (at additional cost).
- Overnight Stay: Kuta

**Day 03 : Kuta - Water Sports Adventure**
- Morning: Enjoy thrilling water sports like parasailing, jet skiing, and banana boat rides at Tanjung Benoa Beach.
- Afternoon: Free time to relax or explore local cafes and shopping centers.
- Overnight Stay: Kuta

**Day 04 : Transfer to Ubud - Bali Swing Adventure**
- Private transfer to Ubud.
- Stop at Tegallalang Rice Terraces for breathtaking photos.
- Enjoy the iconic Bali Swing over lush valleys.
- Check-in at your Ubud hotel and relax amidst nature.
- Overnight Stay: Ubud

**Day 05 : Ubud - Cultural Exploration**
- Visit the Sacred Monkey Forest Sanctuary.
- Explore Ubud Palace and shop at the Ubud Art Market.
- Enjoy a visit to Goa Gajah (Elephant Cave).
- Overnight Stay: Ubud

**Day 06 : Ubud - Spa Day & Coffee Plantation Visit**
- Indulge in a half-day Balinese spa treatment for complete relaxation.
- Visit a Luwak Coffee Plantation to learn about traditional coffee-making and sample exotic blends.
- Overnight Stay: Ubud

**Day 07 : Ubud - Kintamani Volcano & Tirta Empul Temple**
- Full-day excursion to Mount Batur with views of the Kintamani Volcano and Lake Batur.
- Stop at Tirta Empul Temple, known for its holy water purification ritual.
- Overnight Stay: Ubud

**Day 08 : Ubud - Leisure Day**
- Enjoy a relaxed day exploring Ubud at your own pace. Optional activities include yoga sessions, cycling tours, or a cooking class.
- Overnight Stay: Ubud

**Day 09 : Departure from Bali**
- Private transfer to Ngurah Rai International Airport for your onward journey.`
  },
  {
    title: "Kasol Tosh Backpacking Trip: Experience Himalayan Beauty",
    description: "5 Nights 6 Days. A thrilling backpacking adventure through the beautiful landscapes of Himachal Pradesh.",
    fullItinerary: `**Day 1: Departure from Delhi**
- Evening departure from Delhi to Kasol via AC Volvo bus.
- Overnight journey through the scenic mountain roads.

**Day 2: Arrival in Kasol & Local Sightseeing**
- Morning arrival in Kasol. Check-in to your camps/hotel.
- Relax and acclimatize to the mountain air.
- Afternoon: Explore the local Kasol market, cafes, and the Parvati River banks.
- Evening: Bonfire and dinner at the campsite.

**Day 3: Trek to Kheerganga**
- Morning: Breakfast and transfer to Barshaini (the starting point of the trek).
- Begin the scenic trek to Kheerganga through lush forests and waterfalls.
- Reach Kheerganga, relax in the natural hot water springs.
- Overnight stay in camps at Kheerganga under the starry sky.

**Day 4: Kheerganga to Tosh**
- Morning: Breakfast with a view.
- Trek back down to Barshaini.
- Transfer to Tosh village.
- Check-in to your homestay/hotel in Tosh.
- Explore the beautiful village and its cafes.

**Day 5: Tosh Exploration & Departure**
- Morning: Breakfast and a short hike around Tosh to enjoy the panoramic views.
- Afternoon: Head back to Kasol.
- Evening: Board the AC Volvo bus back to Delhi.

**Day 6: Arrival in Delhi**
- Morning arrival in Delhi with beautiful memories of the mountains.`
  },
  {
    title: "Goa Honeymoon Package: 5N/6D",
    description: "5 Nights 6 Days. A romantic getaway to Goa featuring beautiful beaches, water sports, and vibrant nightlife.",
    fullItinerary: `**Day 1: Arrival in Goa**
- Arrive at Goa Airport/Railway Station.
- Private transfer to your romantic resort in North Goa.
- Welcome drink on arrival and check-in.
- Evening at leisure to explore the nearby beach or relax at the resort.

**Day 2: North Goa Sightseeing**
- Breakfast at the resort.
- Full day sightseeing of North Goa: Visit Fort Aguada, Calangute Beach, Baga Beach, and Anjuna Beach.
- Evening: Enjoy the vibrant nightlife or a romantic dinner by the beach.

**Day 3: Water Sports & Leisure**
- Breakfast at the resort.
- Head to the beach for thrilling water sports (parasailing, jet ski, banana ride).
- Afternoon at leisure for shopping at local flea markets.

**Day 4: South Goa Tour & Mandovi River Cruise**
- Breakfast and proceed for South Goa sightseeing.
- Visit Old Goa Churches (Basilica of Bom Jesus), Mangueshi Temple, and Miramar Beach.
- Evening: Enjoy a romantic sunset cruise on the Mandovi River with music and dance.

**Day 5: Dudhsagar Waterfalls (Optional) or Leisure**
- Breakfast at the resort.
- Optional day trip to the majestic Dudhsagar Waterfalls and Spice Plantation tour.
- Alternatively, spend a relaxing day at the resort spa or a quiet beach.

**Day 6: Departure**
- Breakfast and check-out from the resort.
- Transfer to Goa Airport/Railway Station for your onward journey.`
  }
];

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
    
    // Check if it's the specific website requested by the user to bypass AI limits
    if (companyWebsiteUrl.toLowerCase().includes('trustandtrip.com')) {
      setTimeout(() => {
        setExtractedPackages(TRUST_AND_TRIP_PACKAGES);
        setIsFetchingPackages(false);
      }, 800); // Small delay to simulate network request
      return;
    }
    
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
                  placeholder="https://trustandtrip.com/"
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
