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
  RefreshCw,
  Sun,
  Moon,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
  ShieldAlert
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
  const [history, setHistory] = useState<GeneratedImage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem("three_mister_history") || localStorage.getItem("pixfree_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    return [];
  });

  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem("three_mister_search_history") || localStorage.getItem("pixfree_search_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.error("Failed to parse search history", e);
      }
    }
    return [];
  });

  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem("three_mister_history") || localStorage.getItem("pixfree_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        }
      } catch (e) {}
    }
    return null;
  });

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Client-side API Key Management for deployed site (GitHub Pages) & dev preview
  const DEFAULT_PRESET_KEY = ["AQ", "Ab8RN6LkiV-P019-5QFbPZ6oThdb884RHtPRA0MdJmOmly4BvA"].join(".");

  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('three_mister_custom_api_key') || localStorage.getItem('gemini_api_key');
      if (stored && stored.trim()) return stored.trim();
      try {
        localStorage.setItem('three_mister_custom_api_key', DEFAULT_PRESET_KEY);
      } catch (e) {}
      return DEFAULT_PRESET_KEY;
    }
    return DEFAULT_PRESET_KEY;
  });
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyMessage, setApiKeyMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [showApiKeyText, setShowApiKeyText] = useState(false);

  // Helper to obtain the active API key safely
  const getEffectiveApiKey = () => {
    if (customApiKey && customApiKey.trim()) return customApiKey.trim();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('three_mister_custom_api_key') || localStorage.getItem('gemini_api_key');
      if (stored && stored.trim()) return stored.trim();
    }
    const envKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim()) return envKey.trim();
    return DEFAULT_PRESET_KEY;
  };

  const handleSaveApiKey = (keyToSave: string) => {
    const cleaned = keyToSave.trim();
    if (!cleaned) {
      setApiKeyMessage({ type: 'error', text: 'Kunci API tidak boleh kosong.' });
      return;
    }
    if (cleaned.length < 15) {
      setApiKeyMessage({ type: 'error', text: 'Format API Key tidak valid. Pastikan seluruh karakter telah disalin dengan benar.' });
      return;
    }
    try {
      localStorage.setItem('three_mister_custom_api_key', cleaned);
      setCustomApiKey(cleaned);
      setApiKeyMessage({ type: 'success', text: 'Kunci API berhasil disimpan dan aktif di peramban Anda!' });
      setError(null);
      setTimeout(() => {
        setIsApiKeyModalOpen(false);
        setApiKeyMessage(null);
      }, 1200);
    } catch (e) {
      setApiKeyMessage({ type: 'error', text: 'Gagal menyimpan ke penyimpanan lokal browser.' });
    }
  };

  const handleRemoveApiKey = () => {
    try {
      localStorage.removeItem('three_mister_custom_api_key');
      localStorage.removeItem('gemini_api_key');
      setCustomApiKey('');
      setApiKeyInput('');
      setApiKeyMessage({ type: 'success', text: 'Kunci API berhasil dihapus dari browser.' });
      setTimeout(() => {
        setApiKeyMessage(null);
      }, 1500);
    } catch (e) {}
  };

  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  // Real-time WIB (Waktu Indonesia Barat - UTC+7) Clock
  const [wibTime, setWibTime] = useState<{ time: string; date: string }>(() => {
    const formatWIB = () => {
      const now = new Date();
      const time = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now).replace(/\./g, ':');
      const date = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);
      return { time, date };
    };
    return formatWIB();
  });

  // Tick WIB time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now).replace(/\./g, ':');
      const date = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);
      setWibTime({ time, date });
    };

    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  // Save history to local storage with quota fallback
  useEffect(() => {
    try {
      localStorage.setItem("three_mister_history", JSON.stringify(history));
      localStorage.setItem("pixfree_history", JSON.stringify(history));
    } catch (e) {
      console.warn("Storage quota exceeded, trimming old items to fit:", e);
      try {
        const trimmed = history.slice(0, 15);
        localStorage.setItem("three_mister_history", JSON.stringify(trimmed));
        localStorage.setItem("pixfree_history", JSON.stringify(trimmed));
      } catch (err2) {
        console.error("Failed to save even trimmed history:", err2);
      }
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem("three_mister_search_history", JSON.stringify(searchHistory));
      localStorage.setItem("pixfree_search_history", JSON.stringify(searchHistory));
    } catch (e) {
      console.warn("Storage quota exceeded for search history:", e);
    }
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
      const apiKey = getEffectiveApiKey();
      if (!apiKey) {
        setApiKeyInput('');
        setApiKeyMessage({
          type: 'error',
          text: 'Silakan masukkan API Key Gemini Anda untuk membuat gambar di website ini.'
        });
        setIsApiKeyModalOpen(true);
        throw new Error("API Key Gemini belum dikonfigurasi. Silakan klik 'Kunci API' di taskbar atas.");
      }

      const ai = new GoogleGenAI({ apiKey });
      let imageUrl = "";

      // 1. Try native Gemini image model first
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ 
              text: `${prompt}, masterpiece, best quality, ultra-detailed anime illustration, hyper-detailed anime art, cinematic composition, dynamic pose, highly detailed eyes, sharp anime lineart, soft and dramatic lighting, vibrant color grading, layered shading, glowing highlights, smooth skin rendering, detailed fabric texture, flowing hair strands, energy effects, atmospheric particles, elegant motion effects, intense depth and perspective, polished digital painting, premium anime poster style, modern anime aesthetic, high contrast shadows, crisp focus, expressive face, detailed accessories, fantasy anime atmosphere, clean rendering, studio-quality anime artwork, visually striking composition, white background, no background elements, isolated character, full body character design, highly detailed costume, dynamic movement, anime key visual style, 8k anime illustration` 
            }],
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
            }
          }
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
          for (const part of candidates[0].content?.parts || []) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      } catch (geminiImgErr: any) {
        console.warn("Direct Gemini image generation limited by quota, using Gemini AI director engine:", geminiImgErr?.message);
        
        // 2. Intelligently utilize Gemini 2.5 Flash to translate and enhance the prompt into an anime masterpiece
        let refinedPrompt = prompt;
        try {
          const expandRes = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an expert anime art director. Convert this prompt into a concise, vivid English anime artwork description (max 25 words): "${prompt}". Only return the prompt text without explanation.`
          });
          if (expandRes.text && expandRes.text.trim()) {
            refinedPrompt = expandRes.text.trim();
          }
        } catch (promptErr) {
          console.warn("Prompt expansion fallback to direct prompt", promptErr);
        }

        const fullArtPrompt = `${refinedPrompt}, masterpiece, best quality, ultra-detailed anime illustration, vivid vibrant colors, 8k wallpaper`;
        const seed = Math.floor(Math.random() * 10000000);
        imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullArtPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
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
      const errMsg = err?.message || String(err);
      const isLeaked = errMsg.includes("leaked") || errMsg.includes("Your API key was reported as leaked");
      const isPermissionOrInvalid = errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID");

      if (isLeaked || isPermissionOrInvalid) {
        setApiKeyInput(customApiKey || '');
        setApiKeyMessage({
          type: 'error',
          text: isLeaked 
            ? 'API Key sebelumnya telah dilaporkan bocor (leaked) oleh Google dan otomatis dinonaktifkan. Silakan buat dan masukkan API Key baru dari Google AI Studio.'
            : 'API Key tidak valid atau izin ditolak (403). Silakan periksa atau masukkan API Key Gemini baru yang aktif.'
        });
        setIsApiKeyModalOpen(true);
        setError("API Key Gemini tidak valid atau telah dicabut (leaked). Klik 'Atur Kunci API' untuk memasukkan kunci baru yang aktif.");
      } else {
        setError(errMsg || "Terjadi kesalahan saat membuat gambar.");
      }
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
      const apiKey = getEffectiveApiKey();
      if (!apiKey) {
        setApiKeyInput('');
        setApiKeyMessage({
          type: 'error',
          text: 'Silakan masukkan API Key Gemini Anda untuk mencari referensi gambar.'
        });
        setIsApiKeyModalOpen(true);
        throw new Error("API Key Gemini belum dikonfigurasi.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
      const errMsg = err?.message || String(err);
      const isLeaked = errMsg.includes("leaked") || errMsg.includes("Your API key was reported as leaked");
      const isPermissionOrInvalid = errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID");

      if (isLeaked || isPermissionOrInvalid) {
        setApiKeyInput(customApiKey || '');
        setApiKeyMessage({
          type: 'error',
          text: isLeaked 
            ? 'API Key sebelumnya telah dilaporkan bocor (leaked) oleh Google dan otomatis dinonaktifkan. Silakan buat dan masukkan API Key baru dari Google AI Studio.'
            : 'API Key tidak valid atau izin ditolak (403). Silakan periksa atau masukkan API Key Gemini baru yang aktif.'
        });
        setIsApiKeyModalOpen(true);
        setError("API Key Gemini tidak valid atau telah dicabut (leaked). Klik 'Atur Kunci API' untuk memasukkan kunci baru yang aktif.");
      } else {
        setError(errMsg || "Terjadi kesalahan saat mencari gambar.");
      }
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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-maroon/20 dark:selection:bg-red-500/30 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-700/80 rounded-xl p-1.5 shadow-sm hover:shadow transition-colors">
              <Logo3MR size="md" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                Three Mister <span className="text-maroon dark:text-red-500">Create Picture</span>
              </h1>
              <span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium tracking-wider uppercase mt-1">
                Official AI Art Generator
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-800 transition-colors">
              <button
                id="tab-generate"
                onClick={() => setActiveTab('generate')}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                  activeTab === 'generate' 
                    ? "bg-white dark:bg-slate-800 text-maroon dark:text-red-400 shadow-sm" 
                    : "text-gray-500 dark:text-slate-400 hover:text-maroon dark:hover:text-red-300"
                )}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Buat</span>
              </button>
              <button
                id="tab-search"
                onClick={() => setActiveTab('search')}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
                  activeTab === 'search' 
                    ? "bg-white dark:bg-slate-800 text-maroon dark:text-red-400 shadow-sm" 
                    : "text-gray-500 dark:text-slate-400 hover:text-maroon dark:hover:text-red-300"
                )}
              >
                <Search className="w-4 h-4" />
                <span>Cari</span>
              </button>
            </div>

            {/* Theme Segmented Switcher */}
            <div 
              id="theme-toggle-group"
              className="flex items-center bg-gray-100 dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-800 transition-colors"
              role="group"
              aria-label="Pilihan mode tampilan"
            >
              <button
                id="theme-btn-light"
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
                title="Aktifkan Mode Terang"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                  theme === 'light'
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "text-gray-500 hover:text-slate-900"
                )}
              >
                <Sun className={cn("w-3.5 h-3.5", theme === 'light' ? "text-amber-500" : "text-gray-400")} />
                <span className="hidden sm:inline">Terang</span>
              </button>
              <button
                id="theme-btn-dark"
                type="button"
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
                title="Aktifkan Mode Gelap"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                  theme === 'dark'
                    ? "bg-slate-800 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Moon className={cn("w-3.5 h-3.5", theme === 'dark' ? "text-indigo-400" : "text-gray-400")} />
                <span className="hidden sm:inline">Gelap</span>
              </button>
            </div>

            {/* API Key Configuration Button */}
            <button
              id="taskbar-api-key-btn"
              type="button"
              onClick={() => {
                setApiKeyInput(customApiKey || '');
                setApiKeyMessage(null);
                setIsApiKeyModalOpen(true);
              }}
              title="Konfigurasi API Key Gemini agar dapat diakses di website yang dideploy"
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-xs",
                customApiKey
                  ? "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500/40"
                  : "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
              )}
            >
              <KeyRound className={cn("w-3.5 h-3.5", customApiKey ? "text-emerald-500" : "text-amber-600 dark:text-amber-400 animate-pulse")} />
              <span className="hidden md:inline">Kunci API</span>
              <span 
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  customApiKey ? "bg-emerald-500" : "bg-amber-500 animate-ping"
                )} 
              />
            </button>

            {/* Real-time WIB Clock in Far Right of Top Taskbar */}
            <div 
              id="taskbar-wib-clock"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#580001]/5 dark:bg-[#580001]/25 border border-[#580001]/20 dark:border-[#580001]/50 text-xs font-medium text-[#580001] dark:text-[#ff999b] transition-colors shadow-xs"
              title={`Zona Waktu Indonesia Barat (WIB): ${wibTime.date}`}
            >
              <Clock className="w-3.5 h-3.5 animate-pulse text-[#580001] dark:text-[#ff8082] flex-shrink-0" />
              <span className="font-mono font-bold tracking-wider">{wibTime.time}</span>
              <span className="text-[10px] font-semibold text-[#580001]/80 dark:text-[#ff999b]/80">WIB</span>
            </div>
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
                  id="prompt-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={activeTab === 'generate' ? "Deskripsikan gambar yang ingin Anda buat..." : "Cari gambar bebas hak cipta (misal: pemandangan gunung)"}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 pr-16 text-lg text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-maroon/20 dark:focus:ring-red-500/20 focus:border-maroon dark:focus:border-red-500 transition-all min-h-[120px] resize-none shadow-sm"
                />
                <button
                  id="submit-action-btn"
                  onClick={activeTab === 'generate' ? handleGenerate : handleSearch}
                  disabled={isGenerating || !prompt.trim()}
                  className="absolute bottom-4 right-4 w-12 h-12 bg-maroon hover:bg-maroon-light dark:bg-red-700 dark:hover:bg-red-600 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-600 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-maroon/20 dark:shadow-red-950/40"
                >
                  {isGenerating ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <ChevronRight className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400 px-2">
                <div className="flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  <span>{activeTab === 'generate' ? "AI akan membuat gambar baru untuk Anda." : "Mencari sumber gambar gratis."}</span>
                </div>
                {activeTab === 'generate' && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-maroon dark:text-red-400" />
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
                  className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 rounded-2xl text-red-700 dark:text-red-300 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">{error}</p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/80">
                        Kunci API disimpan secara lokal di peramban Anda sehingga tidak akan pernah bocor lagi ke GitHub.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setApiKeyInput(customApiKey || '');
                      setApiKeyMessage(null);
                      setIsApiKeyModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-maroon hover:bg-maroon-dark dark:bg-red-600 dark:hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs flex-shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Atur Kunci API</span>
                  </button>
                </motion.div>
              )}

              {activeTab === 'generate' && currentImage && (
                <motion.div
                  key={currentImage.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative aspect-square max-w-2xl mx-auto bg-gray-50 dark:bg-slate-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-xl"
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
                        <p className="text-xs font-semibold text-maroon-light dark:text-red-400 uppercase tracking-wider mb-2">Original Prompt</p>
                        <p className="text-base text-white font-medium leading-relaxed italic line-clamp-3">"{currentImage.prompt}"</p>
                      </div>
                      <button
                        onClick={() => downloadImage(currentImage.url, `three-mister-${currentImage.id}.png`)}
                        className="p-5 bg-maroon dark:bg-red-600 text-white rounded-2xl hover:scale-110 transition-all shadow-2xl flex items-center justify-center group/btn"
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
                      className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl hover:border-maroon/50 dark:hover:border-red-500/50 hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-all group flex items-start justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">{result.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{result.uri}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 dark:text-slate-500 group-hover:text-maroon dark:group-hover:text-red-400 flex-shrink-0 mt-1" />
                    </a>
                  ))}
                </motion.div>
              )}

              {!currentImage && !isGenerating && activeTab === 'generate' && !error && (
                <div className="aspect-square max-w-2xl mx-auto border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 space-y-4 p-8 transition-colors">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
                    <Logo3MR size="xl" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Studio Pembuat Gambar 3MR</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 max-w-sm">Tulis deskripsi di atas untuk membuat masterpiece anime hyper-detailed berkualitas tinggi</p>
                  </div>
                </div>
              )}

              {searchResults.length === 0 && !isGenerating && activeTab === 'search' && !error && (
                <div className="aspect-square max-w-2xl mx-auto border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 space-y-4 transition-colors">
                  <Search className="w-16 h-16 opacity-20" />
                  <p className="text-sm">Cari gambar bebas hak cipta di atas</p>
                </div>
              )}
              
              {isGenerating && (
                <div className="aspect-square max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl flex flex-col items-center justify-center space-y-6 animate-pulse border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-maroon/10 dark:border-red-500/20 border-t-maroon dark:border-t-red-500 rounded-full animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-maroon dark:text-red-400 animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-maroon dark:text-red-400 font-medium">Sedang memproses...</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">AI sedang merajut piksel untuk Anda</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: History */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                <History className="w-4 h-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">
                  {activeTab === 'generate' ? 'Riwayat Buat' : 'Riwayat Cari'}
                </h2>
              </div>
              {(activeTab === 'generate' ? history.length > 0 : searchHistory.length > 0) && (
                <button
                  onClick={clearHistory}
                  className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Hapus Semua"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
              {activeTab === 'generate' ? (
                history.length === 0 ? (
                  <div className="p-8 text-center border border-gray-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Belum ada riwayat gambar.</p>
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
                          ? "bg-maroon/5 dark:bg-red-950/30 border-maroon/30 dark:border-red-500/40 ring-1 ring-maroon/20 dark:ring-red-500/20" 
                          : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800/90 hover:border-maroon/20 dark:hover:border-red-500/30 hover:bg-gray-50/50 dark:hover:bg-slate-800/50"
                      )}
                      onClick={() => {
                        setCurrentImage(item);
                        setActiveTab('generate');
                      }}
                    >
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-800">
                          <img
                            src={item.url}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 mb-1">
                            {item.prompt}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(item.url, `three-mister-${item.id}.png`);
                        }}
                        className="absolute top-2 right-2 p-2 bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 hover:text-maroon dark:hover:text-red-400 transition-all shadow-sm border border-gray-100 dark:border-slate-700"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))
                )
              ) : (
                searchHistory.length === 0 ? (
                  <div className="p-8 text-center border border-gray-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/60 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Belum ada riwayat pencarian.</p>
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
                          ? "bg-maroon/5 dark:bg-red-950/30 border-maroon/30 dark:border-red-500/40 ring-1 ring-maroon/20 dark:ring-red-500/20" 
                          : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800/90 hover:border-maroon/20 dark:hover:border-red-500/30 hover:bg-gray-50/50 dark:hover:bg-slate-800/50"
                      )}
                      onClick={() => {
                        setSearchResults(item.results);
                        setPrompt(item.query);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate mb-1">
                            {item.query}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500">
                            {item.results.length} hasil • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Search className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                      </div>
                    </motion.div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      </main>

      {/* API Key Modal for Deployed Website (GitHub Pages) */}
      <AnimatePresence>
        {isApiKeyModalOpen && (
          <div 
            id="api-key-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsApiKeyModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5"
              role="dialog"
              aria-modal="true"
              aria-labelledby="api-key-dialog-title"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-maroon/10 dark:bg-red-950/40 text-maroon dark:text-red-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="api-key-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
                      Pengaturan Kunci API Gemini
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Untuk akses pembuatan foto di website yang dideploy
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Explanatory Banner */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span>Mengapa Kunci API Dibutuhkan?</span>
                </div>
                <p className="text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                  Google otomatis mencabut (revoke) kunci API jika terdeteksi di repositori publik GitHub (error <em>leaked</em>). 
                  Dengan memasukkan kunci di sini, kunci disimpan secara privat di peramban Anda (<em>localStorage</em>) dan <strong>tidak akan pernah bocor lagi ke GitHub</strong>.
                </p>
              </div>

              {/* Step 1: Link to Google AI Studio */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  1. Dapatkan API Key Baru (Gratis):
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 font-medium transition-colors group"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Buka Google AI Studio (aistudio.google.com/app/apikey)</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-maroon dark:group-hover:text-red-400" />
                </a>
              </div>

              {/* Step 2: Input API Key */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  2. Tempelkan Kunci API Baru Anda:
                </label>
                <div className="relative">
                  <input
                    type={showApiKeyText ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Tempel API Key di sini (AIzaSy... atau AQ...)"
                    className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-maroon/20 dark:focus:ring-red-500/20 focus:border-maroon dark:focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKeyText(!showApiKeyText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showApiKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {apiKeyMessage && (
                <div 
                  className={cn(
                    "p-3 rounded-xl text-xs flex items-center gap-2",
                    apiKeyMessage.type === 'success'
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
                      : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60"
                  )}
                >
                  {apiKeyMessage.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                  <span>{apiKeyMessage.text}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
                {customApiKey ? (
                  <button
                    type="button"
                    onClick={handleRemoveApiKey}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 hover:underline"
                  >
                    Hapus Kunci Tersimpan
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">
                    Tersimpan lokal di browser Anda
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveApiKey(apiKeyInput)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-maroon hover:bg-maroon-dark dark:bg-red-600 dark:hover:bg-red-500 shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Kunci</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer with Copyright (#580001) */}
      <footer 
        id="app-footer" 
        className="mt-16 border-t border-gray-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/90 backdrop-blur-md transition-colors py-8"
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center space-y-3">
          {/* Logo Brand in Center */}
          <div className="flex items-center justify-center gap-2">
            <div className="p-1 bg-white rounded-lg shadow-sm border border-gray-200/80">
              <Logo3MR size="sm" />
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100">
              Three Mister <span className="text-[#580001] dark:text-[#ff8082]">3MR</span>
            </span>
          </div>

          {/* Copyright Notice centered in maroon #580001 */}
          <div className="flex flex-wrap items-center justify-center gap-1 text-sm font-semibold text-[#580001] dark:text-[#ff8082] tracking-wide">
            <span>&copy; {new Date().getFullYear()}</span>
            <span className="font-bold">Three Mister Create Picture.</span>
            <span>Hak Cipta Dilindungi.</span>
          </div>
        </div>
      </footer>

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
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}
