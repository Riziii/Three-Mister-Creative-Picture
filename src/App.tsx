import { useState, useEffect, useRef } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  Search, 
  Image as ImageIcon, 
  Sparkles, 
  Download, 
  History, 
  Trash2, 
  Loader2, 
  ExternalLink,
  Info,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { Logo3MR } from "@/src/components/Logo";

// --- Types ---
interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  type: 'generated' | 'searched';
  sourceUrl?: string;
}

interface SearchResult {
  title: string;
  uri: string;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  results: SearchResult[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'search'>('generate');
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history from local storage
  useEffect(() => {
    const savedHistory = localStorage.getItem("pixfree_history");
    const savedSearchHistory = localStorage.getItem("pixfree_search_history");
    
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    if (savedSearchHistory) {
      try {
        setSearchHistory(JSON.parse(savedSearchHistory));
      } catch (e) {
        console.error("Failed to parse search history", e);
      }
    }
  }, []);

  // Save history to local storage
  useEffect(() => {
    localStorage.setItem("pixfree_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("pixfree_search_history", JSON.stringify(searchHistory));
  }, [searchHistory]);

  const addToHistory = (img: GeneratedImage) => {
    setHistory(prev => [img, ...prev].slice(0, 50));
    setCurrentImage(img);
  };

  const addToSearchHistory = (query: string, results: SearchResult[]) => {
    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      query,
      timestamp: Date.now(),
      results
    };
    setSearchHistory(prev => [newItem, ...prev].slice(0, 50));
    setSearchResults(results);
  };

  const clearHistory = () => {
    if (window.confirm("Hapus semua riwayat?")) {
      if (activeTab === 'generate') {
        setHistory([]);
        setCurrentImage(null);
      } else {
        setSearchHistory([]);
        setSearchResults([]);
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setSearchResults([]);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key Gemini tidak ditemukan. Silakan konfigurasi di panel Secrets.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ 
            text: `${prompt}, masterpiece, best quality, ultra-detailed anime illustration, hyper-detailed anime art, cinematic composition, dynamic pose, highly detailed eyes, sharp anime lineart, soft and dramatic lighting, vibrant color grading, layered shading, glowing highlights, smooth skin rendering, detailed fabric texture (heavy woven fabric, veined skin, oxidized forged metal), flowing hair strands, energy effects, atmospheric particles, elegant motion effects, intense depth and perspective, polished digital painting, premium anime poster style, modern anime aesthetic, high contrast shadows, crisp focus, expressive face, detailed accessories, fantasy anime atmosphere, clean rendering, studio-quality anime artwork, visually striking composition, white background, no background elements, isolated character, full body character design, highly detailed costume, dynamic movement, anime key visual style, 8k anime illustration` 
          }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          }
        }
      });

      let imageUrl = "";
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content?.parts || []) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        addToHistory({
          id: Date.now().toString(),
          url: imageUrl,
          prompt: prompt,
          timestamp: Date.now(),
          type: 'generated'
        });
      } else {
        throw new Error("Gagal menghasilkan gambar. Coba prompt lain.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat membuat gambar.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearch = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setSearchResults([]);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key Gemini tidak ditemukan. Silakan konfigurasi di panel Secrets.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Cari gambar bebas hak cipta (royalty-free) untuk: "${prompt}". Berikan daftar link dari situs seperti Unsplash, Pexels, atau Pixabay.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const results: SearchResult[] = chunks
          .filter(c => c.web)
          .map(c => ({
            title: c.web?.title || "Gambar Terkait",
            uri: c.web?.uri || ""
          }));
        
        if (results.length > 0) {
          addToSearchHistory(prompt, results);
        } else {
          setError("Tidak ditemukan hasil pencarian langsung. Coba kata kunci lain.");
        }
      } else {
        setError("Gagal mencari gambar. Coba lagi nanti.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat mencari gambar.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-maroon/10">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center bg-white border border-gray-200/90 rounded-xl p-1.5 shadow-sm hover:shadow transition-shadow">
              <Logo3MR size="md" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-display font-bold tracking-tight text-slate-900 leading-none">
                Three Mister <span className="text-maroon">Create Picture</span>
              </h1>
              <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mt-1">
                Official AI Art Generator
              </span>
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setActiveTab('generate')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                activeTab === 'generate' ? "bg-white text-maroon shadow-sm" : "text-gray-500 hover:text-maroon"
              )}
            >
              <ImageIcon className="w-4 h-4" />
              Buat
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                activeTab === 'search' ? "bg-white text-maroon shadow-sm" : "text-gray-500 hover:text-maroon"
              )}
            >
              <Search className="w-4 h-4" />
              Cari
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-[1fr_350px] gap-12">
          {/* Left Column: Input & Results */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="relative group">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={activeTab === 'generate' ? "Deskripsikan gambar yang ingin Anda buat..." : "Cari gambar bebas hak cipta (misal: pemandangan gunung)"}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-6 pr-16 text-lg focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all min-h-[120px] resize-none placeholder:text-gray-400"
                />
                <button
                  onClick={activeTab === 'generate' ? handleGenerate : handleSearch}
                  disabled={isGenerating || !prompt.trim()}
                  className="absolute bottom-4 right-4 w-12 h-12 bg-maroon hover:bg-maroon-light disabled:bg-gray-100 disabled:text-gray-400 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-maroon/20"
                >
                  {isGenerating ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <ChevronRight className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 px-2">
                <div className="flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  <span>{activeTab === 'generate' ? "AI akan membuat gambar baru untuk Anda." : "Mencari sumber gambar gratis."}</span>
                </div>
                {activeTab === 'generate' && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-maroon" />
                    <span>Bebas hak cipta</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Result Display */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3"
                >
                  <Info className="w-5 h-5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {activeTab === 'generate' && currentImage && (
                <motion.div
                  key={currentImage.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative aspect-square max-w-2xl mx-auto bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 shadow-xl"
                >
                  <img
                    src={currentImage.url}
                    alt={currentImage.prompt}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-10">
                    <div className="flex items-end justify-between gap-6">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-maroon-light uppercase tracking-wider mb-2">Original Prompt</p>
                        <p className="text-base text-white font-medium leading-relaxed italic line-clamp-3">"{currentImage.prompt}"</p>
                      </div>
                      <button
                        onClick={() => downloadImage(currentImage.url, `three-mister-${currentImage.id}.png`)}
                        className="p-5 bg-maroon text-white rounded-2xl hover:scale-110 transition-all shadow-2xl flex items-center justify-center group/btn"
                        title="Download Masterpiece"
                      >
                        <Download className="w-8 h-8 group-hover/btn:animate-bounce" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'search' && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid sm:grid-cols-2 gap-4"
                >
                  {searchResults.map((result, idx) => (
                    <a
                      key={idx}
                      href={result.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-maroon/50 hover:bg-gray-50 transition-all group flex items-start justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <h3 className="font-medium text-slate-900 truncate">{result.title}</h3>
                        <p className="text-xs text-gray-500 truncate">{result.uri}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-maroon flex-shrink-0 mt-1" />
                    </a>
                  ))}
                </motion.div>
              )}

              {!currentImage && !isGenerating && activeTab === 'generate' && !error && (
                <div className="aspect-square max-w-2xl mx-auto border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 space-y-4 p-8">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <Logo3MR size="xl" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-slate-700">Studio Pembuat Gambar 3MR</p>
                    <p className="text-xs text-gray-400 max-w-sm">Tulis deskripsi di atas untuk membuat masterpiece anime hyper-detailed berkualitas tinggi</p>
                  </div>
                </div>
              )}

              {searchResults.length === 0 && !isGenerating && activeTab === 'search' && !error && (
                <div className="aspect-square max-w-2xl mx-auto border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <Search className="w-16 h-16 opacity-20" />
                  <p className="text-sm">Cari gambar bebas hak cipta di atas</p>
                </div>
              )}
              
              {isGenerating && (
                <div className="aspect-square max-w-2xl mx-auto bg-gray-50 rounded-3xl flex flex-col items-center justify-center space-y-6 animate-pulse border border-gray-100">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-maroon/10 border-t-maroon rounded-full animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-maroon animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-maroon font-medium">Sedang memproses...</p>
                    <p className="text-xs text-gray-500">AI sedang merajut piksel untuk Anda</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: History */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-gray-500">
                <History className="w-4 h-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">
                  {activeTab === 'generate' ? 'Riwayat Buat' : 'Riwayat Cari'}
                </h2>
              </div>
              {(activeTab === 'generate' ? history.length > 0 : searchHistory.length > 0) && (
                <button
                  onClick={clearHistory}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Hapus Semua"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
              {activeTab === 'generate' ? (
                history.length === 0 ? (
                  <div className="p-8 text-center border border-gray-100 rounded-2xl bg-gray-50">
                    <p className="text-xs text-gray-500">Belum ada riwayat gambar.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "group relative p-3 rounded-2xl border transition-all cursor-pointer shadow-sm",
                        currentImage?.id === item.id 
                          ? "bg-maroon/5 border-maroon/20" 
                          : "bg-white border-gray-100 hover:border-maroon/20"
                      )}
                      onClick={() => {
                        setCurrentImage(item);
                        setActiveTab('generate');
                      }}
                    >
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          <img
                            src={item.url}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <p className="text-xs text-slate-800 line-clamp-2 mb-1">
                            {item.prompt}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(item.url, `three-mister-${item.id}.png`);
                        }}
                        className="absolute top-2 right-2 p-2 bg-white text-gray-400 rounded-lg opacity-0 group-hover:opacity-100 hover:text-maroon transition-all shadow-sm border border-gray-100"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))
                )
              ) : (
                searchHistory.length === 0 ? (
                  <div className="p-8 text-center border border-gray-100 rounded-2xl bg-gray-50">
                    <p className="text-xs text-gray-500">Belum ada riwayat pencarian.</p>
                  </div>
                ) : (
                  searchHistory.map((item) => (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "group relative p-4 rounded-2xl border transition-all cursor-pointer shadow-sm",
                        searchResults === item.results
                          ? "bg-maroon/5 border-maroon/20" 
                          : "bg-white border-gray-100 hover:border-maroon/20"
                      )}
                      onClick={() => {
                        setSearchResults(item.results);
                        setPrompt(item.query);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate mb-1">
                            {item.query}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {item.results.length} hasil • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Search className="w-3 h-3 text-gray-400" />
                      </div>
                    </motion.div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
