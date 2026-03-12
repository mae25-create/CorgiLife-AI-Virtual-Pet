
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PetState, CorgiMessage, Activity, Letter } from './types';
import { INITIAL_STATE, ACTIVITIES, MAX_STAT, XP_PER_LEVEL, BREEDS, COLORS } from './constants';
import StatusBar from './components/StatusBar';
import { generateCorgiResponse, generateCorgiImage, generateCorgiLetter } from './services/geminiService';

type OnboardingMode = 'none' | 'adopt' | 'upload';

interface VisualEffect {
  id: number;
  type: 'heart' | 'sparkle' | 'xp' | 'squeak' | 'bubble';
  x: number;
  y: number;
}

const App: React.FC = () => {
  const [pet, setPet] = useState<PetState>(() => {
    try {
      const saved = localStorage.getItem('corgi-breeder-v1');
      if (!saved) return INITIAL_STATE;
      const parsed = JSON.parse(saved);
      // Merge with INITIAL_STATE to ensure compatibility with new properties (like hygiene)
      return { ...INITIAL_STATE, ...parsed };
    } catch (e) {
      console.error("Failed to load pet state:", e);
      return INITIAL_STATE;
    }
  });

  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('none');
  const [mobileTab, setMobileTab] = useState<'pet' | 'chat' | 'world'>('pet');
  const [messages, setMessages] = useState<CorgiMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [petImage, setPetImage] = useState<string>('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [isSqueaking, setIsSqueaking] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bonding clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Adoption trigger
  useEffect(() => {
    if (pet.isAdopted && messages.length === 0) {
      setMessages([{ 
        role: 'corgi', 
        text: `Bork bork! (Hello! My name is ${pet.name}. Let's be friends!)`, 
        mood: 'happy' 
      }]);
      triggerNewImage('excitedly greeting its new owner');
    }
  }, [pet.isAdopted, pet.name, messages.length]);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem('corgi-breeder-v1', JSON.stringify(pet));
    } catch (e) {
      console.error("Failed to save pet state:", e);
    }
  }, [pet]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Stat Decay Loop
  useEffect(() => {
    if (!pet.isAdopted) return;
    const interval = setInterval(() => {
      setPet(prev => {
        if (prev.isSleeping) {
          const newEnergy = Math.min(MAX_STAT, prev.energy + 8);
          return {
            ...prev,
            energy: newEnergy,
            hunger: Math.max(0, prev.hunger - 0.4),
            hygiene: Math.max(0, (prev.hygiene || 100) - 0.1),
            isSleeping: newEnergy >= MAX_STAT ? false : true
          };
        }
        return {
          ...prev,
          hunger: Math.max(0, prev.hunger - 0.25),
          happiness: Math.max(0, prev.happiness - 0.15),
          energy: Math.max(0, prev.energy - 0.2),
          hygiene: Math.max(0, (prev.hygiene || 100) - 0.3),
        };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [pet.isAdopted, pet.isSleeping]);

  // Letter generation loop
  useEffect(() => {
    if (!pet.isExploring) return;
    
    // Generate a letter every 1 minute (60000ms)
    const interval = setInterval(async () => {
      const newLetterData = await generateCorgiLetter(pet);
      const newLetter: Letter = {
        id: Date.now().toString(),
        date: Date.now(),
        title: newLetterData.title,
        content: newLetterData.content,
        isRead: false
      };
      setPet(prev => ({
        ...prev,
        letters: [newLetter, ...(prev.letters || [])]
      }));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [pet.isExploring, pet.name, pet.breed]);

  const addVisualEffect = (type: 'heart' | 'sparkle' | 'xp' | 'squeak' | 'bubble') => {
    const count = type === 'xp' ? 1 : type === 'squeak' ? 3 : 5;
    for (let i = 0; i < count; i++) {
      const id = Date.now() + Math.random();
      const newEffect: VisualEffect = {
        id,
        type,
        x: 30 + Math.random() * 40,
        y: 20 + Math.random() * 40 
      };
      setEffects(prev => [...prev, newEffect]);
      setTimeout(() => {
        setEffects(prev => prev.filter(e => e.id !== id));
      }, 1500);
    }
  };

  const handleAdopt = async () => {
    if (!pet.name.trim()) return;
    setIsGeneratingImage(true);
    
    // We update the state to "adopted" immediately to ensure the user isn't stuck 
    // waiting for a slow AI image generation if the network/API is slow.
    try {
      const firstImgPromise = generateCorgiImage(pet, 'happily posing for its first day home');
      // Set a timeout or just proceed after setting adopted state
      firstImgPromise.then(img => {
        if (img) setPetImage(img);
        setIsGeneratingImage(false);
      }).catch(e => {
        console.error("Initial image generation failed:", e);
        setIsGeneratingImage(false);
      });

      setPet(prev => ({ ...prev, isAdopted: true, adoptedAt: Date.now() }));
    } catch (e) {
      console.error("Adoption process failed:", e);
      setPet(prev => ({ ...prev, isAdopted: true, adoptedAt: Date.now() }));
      setIsGeneratingImage(false);
    }
  };

  const handleAction = async (activity: Activity) => {
    if (isGeneratingImage || isTyping) return;

    if (activity.id === 'toy') {
      setIsSqueaking(true);
      addVisualEffect('squeak');
      setTimeout(() => setIsSqueaking(false), 1000);
    }

    if (activity.id === 'clean') {
      addVisualEffect('bubble');
    }

    if (activity.happinessEffect > 0) addVisualEffect('heart');
    if (activity.xpGain > 0) addVisualEffect('xp');
    addVisualEffect('sparkle');

    const updatedPet = {
      ...pet,
      hunger: Math.min(MAX_STAT, pet.hunger + activity.hungerEffect),
      happiness: Math.min(MAX_STAT, pet.happiness + activity.happinessEffect),
      energy: Math.max(0, pet.energy + activity.energyEffect),
      hygiene: Math.min(MAX_STAT, (pet.hygiene || 0) + (activity.hygieneEffect || 0)),
      xp: pet.xp + activity.xpGain
    };

    if (updatedPet.xp >= XP_PER_LEVEL) {
      updatedPet.level += 1;
      updatedPet.ageMonths += 1;
      updatedPet.xp = updatedPet.xp - XP_PER_LEVEL;
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 4000);
      triggerNewImage('growing up and looking proud');
    }

    setPet(updatedPet);
    setIsTyping(true);
    
    let promptPrefix = `I just ${activity.name.toLowerCase()} with you!`;
    if (activity.id === 'toy') {
      promptPrefix = `I just played with my FAVORITE squeaky chicken toy with you! I am super excited and going crazy!`;
    } else if (activity.id === 'clean') {
      promptPrefix = `I'm having a wonderful bubble bath! Splish splash, I feel so fresh and clean!`;
    }

    const aiResp = await generateCorgiResponse(promptPrefix, updatedPet, []);
    setIsTyping(false);

    setMessages(prev => [...prev, {
      role: 'corgi',
      text: aiResp.barks,
      translation: aiResp.translation,
      mood: aiResp.mood
    }]);

    if (Math.random() > 0.6 || activity.id === 'toy' || activity.id === 'clean') {
      let scenario = activity.name.toLowerCase();
      if (activity.id === 'toy') scenario = 'playing wildly with a squeaky yellow rubber chicken';
      if (activity.id === 'clean') scenario = 'sitting in a bathtub full of bubbles with a rubber ducky';
      triggerNewImage(scenario);
    }
  };

  const triggerNewImage = async (context: string) => {
    setIsGeneratingImage(true);
    const newImg = await generateCorgiImage(pet, context);
    if (newImg) setPetImage(newImg);
    setIsGeneratingImage(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMsg = inputValue;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');

    setIsTyping(true);
    const aiResp = await generateCorgiResponse(userMsg, pet, []);
    setIsTyping(false);

    setMessages(prev => [...prev, {
      role: 'corgi',
      text: aiResp.barks,
      translation: aiResp.translation,
      mood: aiResp.mood
    }]);

    setPet(prev => ({ ...prev, happiness: Math.min(MAX_STAT, prev.happiness + 2) }));
  };

  const toggleSleep = () => {
    const nextSleeping = !pet.isSleeping;
    setPet(prev => ({ ...prev, isSleeping: nextSleeping }));
    if (nextSleeping) {
      triggerNewImage('sleeping peacefully in a cozy bed');
    } else {
      triggerNewImage('waking up and stretching');
      addVisualEffect('sparkle');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPet(prev => ({ ...prev, customPhoto: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startExploring = () => {
    setPet(prev => ({ ...prev, isExploring: true, exploreStartTime: Date.now() }));
    triggerNewImage('exploring a vibrant, bustling modern animal metropolis like Zootopia, walking on the sidewalk with other anthropomorphic animals wearing clothes');
  };

  const stopExploring = () => {
    setPet(prev => ({ ...prev, isExploring: false, exploreStartTime: null }));
    triggerNewImage('taking the train back home happily');
  };

  const readLetter = (id: string) => {
    setPet(prev => ({
      ...prev,
      letters: prev.letters?.map(l => l.id === id ? { ...l, isRead: true } : l)
    }));
    const letter = pet.letters?.find(l => l.id === id);
    if (letter) setSelectedLetter(letter);
  };

  const unreadCount = pet.letters?.filter(l => !l.isRead).length || 0;

  const bondedTime = useMemo(() => {
    const diff = currentTime - pet.adoptedAt;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const pluralize = (val: number, unit: string) => `${val} ${unit}${val === 1 ? '' : 's'}`;
    if (days >= 1) return pluralize(days, 'Day');
    if (hours >= 1) return pluralize(hours, 'Hour');
    if (minutes >= 1) return pluralize(minutes, 'Minute');
    return "Just Now";
  }, [currentTime, pet.adoptedAt]);

  const resetGame = () => {
    if (confirm("Reset everything and start over?")) {
      try {
        localStorage.removeItem('corgi-breeder-v1');
      } catch (e) {}
      window.location.reload();
    }
  };

  if (!pet.isAdopted) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex flex-col items-center justify-center p-4 md:p-6 bg-[url('https://www.transparenttextures.com/patterns/paws.png')]">
        <div className="max-w-3xl w-full bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl p-6 md:p-14 border-[8px] md:border-[12px] border-orange-100 animate-in fade-in slide-in-from-top-4 duration-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-orange-400"></div>
          
          {onboardingMode === 'none' ? (
            <div className="text-center space-y-12 py-6 animate-in fade-in zoom-in duration-500">
              <div className="mb-8">
                <span className="text-8xl block mb-6 animate-bounce">🦴</span>
                <h1 className="text-5xl font-brand text-orange-600 mb-3 tracking-tight">Corgi World</h1>
                <p className="text-stone-500 font-semibold text-lg italic">Choose your entry into the electronic world</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button 
                  onClick={() => setOnboardingMode('adopt')}
                  className="group relative bg-white border-4 border-stone-100 p-8 rounded-[3rem] shadow-xl hover:border-orange-400 hover:-translate-y-2 transition-all flex flex-col items-center text-center overflow-hidden"
                >
                  <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-5xl mb-6 group-hover:scale-110 transition-transform">🐕</div>
                  <h2 className="font-brand text-xl text-stone-700 mb-2 leading-tight">Adopt a new friend</h2>
                  <p className="text-stone-400 text-xs font-bold px-4">Begin your journey with a new digital companion!</p>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-100 group-hover:bg-orange-400 transition-colors"></div>
                </button>

                <button 
                  onClick={() => setOnboardingMode('upload')}
                  className="group relative bg-white border-4 border-stone-100 p-8 rounded-[3rem] shadow-xl hover:border-orange-400 hover:-translate-y-2 transition-all flex flex-col items-center text-center overflow-hidden"
                >
                  <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center text-5xl mb-6 group-hover:scale-110 transition-transform">📸</div>
                  <h2 className="font-brand text-xl text-stone-700 mb-2 leading-tight">Reconnect with a friend</h2>
                  <p className="text-stone-400 text-xs font-bold px-4">Upload a photo of your real corgi for consistency.</p>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-pink-100 group-hover:bg-pink-400 transition-colors"></div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <button 
                onClick={() => { setOnboardingMode('none'); setPet(prev => ({ ...prev, customPhoto: undefined })); }}
                className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2 hover:text-orange-500 transition-colors"
              >
                ← Back to choice
              </button>

              <div className="text-center mb-6">
                <h2 className="text-4xl font-brand text-orange-600">
                  {onboardingMode === 'adopt' ? 'New Companion' : 'Connect Your Friend'}
                </h2>
                <p className="text-stone-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">
                  {onboardingMode === 'adopt' ? 'Specify the traits of your friend' : 'Match their appearance to the electronic world'}
                </p>
              </div>

              {onboardingMode === 'upload' && (
                <div className="space-y-4">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">1. Connect Photo</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full h-48 rounded-[2.5rem] border-4 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
                      pet.customPhoto ? 'border-orange-400 bg-orange-50 shadow-inner' : 'border-stone-200 bg-stone-50 hover:border-orange-300'
                    }`}
                  >
                    {pet.customPhoto ? (
                      <div className="relative w-full h-full flex items-center justify-center group">
                        <img src={pet.customPhoto} alt="Reference" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white font-bold uppercase text-xs tracking-widest">Change Photo</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-5xl mb-3">📸</span>
                        <p className="text-xs font-bold text-stone-400">Tap to upload reference</p>
                        <p className="text-[10px] text-stone-300 mt-1 uppercase tracking-tighter">Markings will be copied perfectly</p>
                      </>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">Breed Type</label>
                  <select 
                    value={pet.breed} 
                    onChange={(e) => setPet(prev => ({ ...prev, breed: e.target.value }))}
                    className="w-full p-4 rounded-2xl bg-orange-50/30 border-2 border-stone-100 font-bold text-stone-700 shadow-sm focus:outline-none focus:border-orange-300"
                  >
                    {BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">Current Age (Months)</label>
                  <input 
                    type="number" 
                    min="2" 
                    max="36" 
                    value={pet.ageMonths} 
                    onChange={(e) => setPet(prev => ({ ...prev, ageMonths: parseInt(e.target.value) || 2 }))}
                    className="w-full p-4 rounded-2xl bg-orange-50/30 border-2 border-stone-100 font-bold text-stone-700 shadow-sm focus:outline-none focus:border-orange-300"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">Coat Appearance</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setPet(prev => ({ ...prev, color: c }))}
                      className={`p-3 text-[9px] font-black rounded-xl border-2 transition-all ${
                        pet.color === c ? 'border-orange-400 bg-orange-500 text-white shadow-md' : 'border-stone-100 bg-white text-stone-500 hover:border-orange-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">Name in Electronic World</label>
                <input 
                  type="text" 
                  placeholder="Enter name to proceed..." 
                  value={pet.name} 
                  onChange={(e) => setPet(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-5 rounded-3xl bg-stone-50 border-2 border-stone-100 focus:border-orange-400 focus:outline-none transition-all font-brand text-2xl text-stone-800 text-center shadow-inner"
                />
              </div>

              <button 
                onClick={handleAdopt}
                disabled={!pet.name.trim() || (onboardingMode === 'upload' && !pet.customPhoto)}
                className="w-full py-6 bg-orange-500 hover:bg-orange-600 text-white rounded-[2rem] font-brand text-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transform hover:-translate-y-1"
              >
                {isGeneratingImage ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    Connecting...
                  </>
                ) : (
                  <>Enter Electronic World ✨</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#fdf6e3] p-4 md:p-10 pb-28 md:pb-10 relative overflow-x-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paws.png')]"></div>

      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 mb-6 md:mb-12 relative z-10">
        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-brand text-orange-600 drop-shadow-sm flex items-center gap-2 md:gap-3 justify-center md:justify-start">
            <span className="animate-pulse">🐾</span> {pet.name}'s World
          </h1>
          <p className="text-base md:text-lg text-stone-500 font-bold mt-1">
            {pet.ageMonths} Month Old {pet.breed} • <span className="text-orange-400">{pet.color}</span>
            {pet.customPhoto && <span className="ml-2 md:ml-3 text-[9px] bg-orange-100 text-orange-600 px-2 md:px-3 py-1 rounded-full uppercase font-black border border-orange-200 shadow-sm">Real Companion Ref</span>}
          </p>
        </div>

        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-between md:justify-end">
          <button 
            onClick={() => setMobileTab(mobileTab === 'world' ? 'pet' : 'world')}
            className={`hidden md:flex items-center gap-2 px-6 py-3 rounded-full font-brand text-lg shadow-lg border-2 transition-all active:scale-90 ${mobileTab === 'world' ? 'bg-green-500 text-white border-green-600' : 'bg-white text-green-600 border-green-100 hover:border-green-300'}`}
          >
            {mobileTab === 'world' ? '🏠 Back Home' : '🌳 Animal World'}
            {unreadCount > 0 && mobileTab !== 'world' && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">{unreadCount}</span>
            )}
          </button>
          <button 
            onClick={resetGame}
            className="p-3 md:p-4 bg-white rounded-full shadow-lg border-2 border-stone-100 hover:border-red-200 hover:text-red-500 transition-all active:scale-90"
            title="Reset Game"
          >
            🔄
          </button>
          <div className="bg-white px-4 md:px-6 py-3 md:py-4 rounded-[1.5rem] md:rounded-[2rem] shadow-xl border-4 border-orange-100 flex items-center gap-3 md:gap-5 transform hover:scale-105 transition-transform flex-1 md:flex-none justify-center">
            <div className="text-3xl md:text-4xl">🏅</div>
            <div>
              <div className="text-[10px] md:text-xs uppercase font-black text-stone-400 tracking-tighter">Progression</div>
              <div className="text-2xl md:text-3xl font-brand text-orange-500 leading-none">LVL {pet.level}</div>
            </div>
            <div className="h-10 md:h-12 w-1 bg-stone-100 rounded-full mx-1"></div>
            <div className="flex-1 min-w-[100px] md:min-w-[120px]">
              <div className="flex justify-between items-end mb-1 md:mb-2 text-[10px] md:text-xs font-black text-stone-400">
                XP {pet.xp}/{XP_PER_LEVEL}
              </div>
              <div className="w-full h-2 md:h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-orange-400 transition-all duration-1000 ease-out rounded-full shadow-[0_0_8px_rgba(251,146,60,0.5)]" 
                  style={{ width: `${(pet.xp / XP_PER_LEVEL) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-12 items-start relative z-10">
        {mobileTab === 'world' && (
          <div className="w-full bg-gradient-to-b from-sky-400 via-indigo-400 to-purple-500 rounded-[2.5rem] md:rounded-[4rem] shadow-[0_30px_60px_rgba(79,70,229,0.3)] p-6 md:p-10 border-4 md:border-8 border-indigo-200 relative overflow-hidden col-span-1 lg:col-span-2 min-h-[600px]">
            {/* Cityscape Background Elements */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay"></div>
            <div className="absolute bottom-0 left-0 w-full flex justify-around items-end text-6xl md:text-8xl opacity-40 pointer-events-none translate-y-4">
              <span className="animate-pulse duration-1000">🏢</span>
              <span className="animate-pulse duration-700 delay-100">🌴</span>
              <span className="animate-pulse duration-1000 delay-300">🏬</span>
              <span className="animate-bounce duration-1000">🚝</span>
              <span className="animate-pulse duration-700 delay-200">🦒</span>
              <span className="animate-pulse duration-1000 delay-500">🏢</span>
            </div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white/20 backdrop-blur-xl p-4 md:p-6 rounded-3xl border border-white/40 shadow-lg gap-4">
                <h2 className="text-3xl md:text-5xl font-brand text-white drop-shadow-md flex items-center gap-3">
                  🏙️ Animalia Metropolis
                </h2>
                <div className="text-indigo-900 font-black text-sm md:text-base bg-white/80 px-6 py-3 rounded-full shadow-inner flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-ping"></span>
                  POP: 8,492,103
                </div>
              </div>
              
              {!pet.isExploring ? (
                <div className="flex-1 flex items-center justify-center py-10">
                  <div className="bg-white/90 backdrop-blur-2xl p-8 md:p-12 rounded-[3rem] border-4 border-white shadow-2xl max-w-2xl w-full text-center transform transition-all hover:scale-[1.02]">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-5xl md:text-6xl mx-auto mb-6 shadow-inner border-4 border-white">
                      🎫
                    </div>
                    <h3 className="text-3xl md:text-4xl font-brand text-indigo-900 mb-4">City Express Pass</h3>
                    <p className="text-indigo-700 font-bold text-xl md:text-2xl mb-3">Send {pet.name} to the big city!</p>
                    <p className="text-stone-500 font-medium mb-8 text-sm md:text-base px-4">They'll mingle with business foxes, barista sloths, and send you updates via CityMail.</p>
                    <button 
                      onClick={startExploring}
                      className="px-8 py-5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-full font-brand text-xl md:text-2xl shadow-[0_10px_20px_rgba(99,102,241,0.4)] transition-all hover:-translate-y-1 active:scale-95 w-full md:w-auto border-2 border-indigo-300"
                    >
                      Board the Monorail 🚝
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-8">
                  {/* Active City View */}
                  <div className="bg-white/30 backdrop-blur-xl rounded-[3rem] p-6 md:p-8 border border-white/50 shadow-2xl flex flex-col md:flex-row items-center gap-6 md:gap-10">
                    <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full border-8 border-white shadow-[0_0_30px_rgba(255,255,255,0.5)] overflow-hidden shrink-0 animate-in zoom-in duration-700">
                      <img src={petImage || `https://picsum.photos/seed/${pet.name}/800/800`} className="w-full h-full object-cover" alt="City Adventure" />
                      <div className="absolute inset-0 shadow-inner rounded-full pointer-events-none"></div>
                    </div>
                    <div className="text-center md:text-left flex-1">
                      <div className="inline-flex items-center gap-2 bg-green-400 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 shadow-md">
                        <span className="w-2 h-2 bg-white rounded-full animate-ping"></span> Live Location
                      </div>
                      <h3 className="text-3xl md:text-4xl font-brand text-white drop-shadow-md mb-2">Downtown District</h3>
                      <p className="text-indigo-100 font-bold text-lg md:text-xl mb-6">{pet.name} is mingling with the locals...</p>
                      <button 
                        onClick={stopExploring}
                        className="px-8 py-4 bg-white text-indigo-600 hover:bg-indigo-50 rounded-full font-brand text-lg shadow-xl transition-all hover:-translate-y-1 active:scale-95 border-2 border-indigo-100"
                      >
                        Call {pet.name} Home 🏡
                      </button>
                    </div>
                  </div>
                  
                  {/* CityMail Terminal */}
                  <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] p-6 md:p-10 border-4 border-white shadow-2xl flex-1">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b-2 border-indigo-100 pb-6 gap-4">
                      <h3 className="text-2xl md:text-3xl font-brand text-indigo-900 flex items-center gap-3">
                        <span className="text-3xl md:text-4xl">📱</span> CityMail Terminal
                      </h3>
                      {unreadCount > 0 && (
                        <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold px-5 py-2 rounded-full shadow-md animate-pulse text-sm md:text-base">
                          {unreadCount} New Messages
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {pet.letters?.map(letter => (
                        <div 
                          key={letter.id} 
                          className={`p-6 md:p-8 rounded-3xl border-2 transition-all cursor-pointer hover:-translate-y-2 hover:shadow-xl ${
                            letter.isRead 
                            ? 'bg-stone-50 border-stone-200 shadow-sm' 
                            : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 shadow-md relative overflow-hidden'
                          }`} 
                          onClick={() => readLetter(letter.id)}
                        >
                          {!letter.isRead && <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>}
                          <div className="flex justify-between items-start mb-3">
                            <h4 className={`font-bold text-lg md:text-xl pr-4 ${letter.isRead ? 'text-stone-700' : 'text-indigo-900'}`}>{letter.title}</h4>
                            <span className="text-[10px] text-stone-500 font-black uppercase shrink-0 bg-white px-2 py-1 rounded-lg shadow-sm border border-stone-100">
                              {new Date(letter.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          <p className={`line-clamp-2 font-medium text-sm md:text-base ${letter.isRead ? 'text-stone-500' : 'text-indigo-700'}`}>{letter.content}</p>
                        </div>
                      ))}
                      {(!pet.letters || pet.letters.length === 0) && (
                        <div className="col-span-1 md:col-span-2 text-center p-12 border-4 border-dashed border-indigo-100 rounded-3xl text-indigo-300 font-bold text-lg bg-indigo-50/30">
                          <span className="text-5xl block mb-4 opacity-50">📭</span>
                          Inbox empty. {pet.name} is probably waiting in line at a sloth-run coffee shop!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`w-full space-y-6 md:space-y-10 ${mobileTab === 'pet' ? 'block' : 'hidden lg:block'} ${mobileTab === 'world' ? 'lg:hidden' : ''}`}>
          <div className={`relative group overflow-hidden rounded-[2.5rem] md:rounded-[4rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-[8px] md:border-[16px] border-white aspect-square flex items-center justify-center transition-all duration-300 ${isSqueaking ? 'scale-105' : ''}`}>
             <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                {effects.map(effect => (
                  <div 
                    key={effect.id}
                    className={`absolute transition-all duration-1000 ease-out animate-in fade-in slide-in-from-bottom-8 ${effect.type === 'squeak' ? 'text-4xl font-brand text-yellow-500 drop-shadow-lg' : ''}`}
                    style={{ 
                      left: `${effect.x}%`, 
                      top: `${effect.y}%`, 
                      fontSize: effect.type === 'xp' ? '2.5rem' : effect.type === 'squeak' ? '1.8rem' : effect.type === 'bubble' ? '3rem' : '2rem',
                      opacity: 0,
                      transform: 'translateY(-120px) rotate(15deg)'
                    }}
                  >
                    {effect.type === 'heart' ? '❤️' : effect.type === 'xp' ? '✨' : effect.type === 'squeak' ? 'SQUEAK!' : effect.type === 'bubble' ? '🫧' : '⭐'}
                  </div>
                ))}
             </div>

             {isGeneratingImage && (
               <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center">
                 <div className="animate-spin text-7xl mb-6">📷</div>
                 <div className="text-orange-600 font-brand text-2xl animate-pulse text-center px-6">
                    Updating Electronic Presence...
                 </div>
               </div>
             )}

             {showLevelUp && (
               <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-orange-500/20 backdrop-blur-md animate-in zoom-in duration-500 pointer-events-none">
                 <div className="text-9xl mb-4 animate-bounce">🎈</div>
                 <h2 className="text-6xl font-brand text-white drop-shadow-2xl text-center">GROWTH<br/>DETECTED!</h2>
                 <p className="text-white text-2xl font-black mt-4 uppercase tracking-[0.4em] shadow-lg">1 Month Older ✨</p>
               </div>
             )}

             <img 
               src={petImage || `https://picsum.photos/seed/${pet.name}/800/800`} 
               alt={pet.name} 
               className={`w-full h-full object-cover transition-all duration-700 ${pet.isSleeping ? 'brightness-50 grayscale' : 'group-hover:scale-105'} ${isSqueaking ? 'animate-squeak' : ''}`}
             />

             {pet.isSleeping && (
               <div className="absolute top-16 right-16 text-8xl animate-bounce z-20">💤</div>
             )}
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl space-y-6 md:space-y-8 border-4 border-orange-50">
            <h3 className="font-brand text-2xl md:text-3xl text-stone-700 flex items-center gap-3 md:gap-4">🩺 Electronic Vitals</h3>
            <div className="grid grid-cols-2 gap-4 md:gap-10">
              <StatusBar label="Hunger" value={pet.hunger} color="bg-amber-400" icon="🥣" />
              <StatusBar label="Mood" value={pet.happiness} color="bg-pink-400" icon="💖" />
              <StatusBar label="Energy" value={pet.energy} color="bg-cyan-400" icon="⚡" />
              <StatusBar label="Hygiene" value={pet.hygiene || 0} color="bg-blue-400" icon="🧼" />
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {ACTIVITIES.map(act => (
              <button 
                key={act.id} 
                onClick={() => handleAction(act)}
                disabled={pet.isSleeping || isGeneratingImage}
                className={`flex flex-col items-center justify-center p-5 rounded-[2rem] bg-white shadow-xl border-b-8 border-stone-100 transition-all group ${
                  pet.isSleeping || isGeneratingImage
                  ? 'opacity-30 grayscale cursor-not-allowed' 
                  : `hover:-translate-y-2 hover:bg-orange-50 active:translate-y-1 active:border-b-2 ${act.id === 'toy' ? 'ring-2 ring-yellow-400/50' : ''}`
                }`}
              >
                <span className="text-3xl mb-1 group-hover:scale-125 transition-transform">{act.icon}</span>
                <span className="text-[9px] font-black text-stone-600 uppercase tracking-tighter text-center leading-tight">{act.name}</span>
              </button>
            ))}
            <button 
              onClick={toggleSleep}
              disabled={isGeneratingImage}
              className={`col-span-3 md:col-span-5 flex items-center justify-center gap-5 p-5 rounded-[2.5rem] shadow-xl border-b-8 transition-all ${
                pet.isSleeping 
                ? 'bg-indigo-700 text-white border-indigo-900 active:translate-y-1 active:border-b-2' 
                : 'bg-white text-stone-700 border-stone-100 hover:bg-indigo-50 active:translate-y-1 active:border-b-2'
              } ${isGeneratingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-3xl">{pet.isSleeping ? '☀️' : '🌙'}</span>
              <span className="font-brand text-xl">{pet.isSleeping ? 'Wake Up!' : 'Resting Mode'}</span>
            </button>
          </div>
        </div>

        <div className={`w-full bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl flex-col h-[calc(100vh-240px)] md:h-[700px] lg:h-[950px] border-4 md:border-8 border-orange-50 overflow-hidden relative ${mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'} ${mobileTab === 'world' ? 'lg:hidden' : ''}`}>
          <div className="p-4 md:p-8 border-b-4 border-orange-50 bg-orange-50/20 flex items-center gap-4 md:gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-orange-300 flex items-center justify-center text-4xl md:text-5xl shadow-lg border-2 border-white">🐕</div>
            <div>
              <h3 className="font-brand text-stone-700 text-xl md:text-3xl mb-1">{pet.name}'s World Log</h3>
              <p className="text-[10px] md:text-xs text-orange-600 font-black uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span> Electronic Bark Signal
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 scroll-smooth scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[90%] md:max-w-[85%] rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-7 shadow-lg relative ${
                  msg.role === 'user' 
                  ? 'bg-orange-500 text-white rounded-tr-none' 
                  : 'bg-stone-50 text-stone-800 rounded-tl-none border-2 border-stone-100'
                }`}>
                  <p className="font-bold text-lg md:text-xl leading-relaxed">{msg.text}</p>
                  {msg.translation && (
                    <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t-2 border-black/5 text-sm md:text-base italic font-semibold opacity-80 text-stone-600">
                      <span className="text-[10px] md:text-[11px] block font-black uppercase tracking-[0.2em] text-orange-400 mb-1 md:mb-2">Electronic Translation</span>
                      "{msg.translation}"
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-stone-50 border-2 border-stone-100 rounded-full px-10 py-5 flex gap-3 items-center">
                  <div className="w-3 h-3 bg-stone-300 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-stone-300 rounded-full animate-bounce delay-75"></div>
                  <div className="w-3 h-3 bg-stone-300 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 md:p-8 bg-white border-t-4 border-orange-50">
            <div className="flex gap-2 md:gap-4 items-center bg-stone-50 p-2 md:p-3 rounded-[2rem] md:rounded-[2.5rem] border-4 border-stone-100 focus-within:border-orange-400 shadow-inner transition-colors">
              <input 
                type="text" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Speak to ${pet.name}...`}
                className="flex-1 p-3 md:p-4 bg-transparent border-none focus:outline-none font-bold text-lg md:text-xl text-stone-700 min-w-0"
              />
              <button 
                type="submit"
                disabled={isTyping || isGeneratingImage}
                className="bg-orange-500 text-white w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center font-bold shadow-2xl hover:scale-105 active:scale-90 transition-all disabled:opacity-50 shrink-0"
              >
                🐾
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className={`mt-10 md:mt-20 w-full max-w-6xl grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pb-8 md:pb-20 relative z-10 ${mobileTab === 'pet' ? 'grid' : 'hidden lg:grid'}`}>
         <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] text-center shadow-xl border-2 border-white hover:border-orange-200 transition-colors">
            <span className="block text-3xl md:text-4xl mb-1 md:mb-2">🎂</span>
            <span className="text-[10px] md:text-xs font-black text-stone-400 uppercase tracking-widest">Electronic Age</span>
            <p className="font-brand text-xl md:text-2xl text-stone-700">{pet.ageMonths} Mos</p>
         </div>
         <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] text-center shadow-xl border-2 border-white hover:border-orange-200 transition-colors">
            <span className="block text-3xl md:text-4xl mb-1 md:mb-2">🧬</span>
            <span className="text-[10px] md:text-xs font-black text-stone-400 uppercase tracking-widest">Genetic Spec</span>
            <p className="font-brand text-xl md:text-2xl text-stone-700">{pet.breed.split(' ')[0]}</p>
         </div>
         <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] text-center shadow-xl border-2 border-white hover:border-orange-200 transition-colors">
            <span className="block text-3xl md:text-4xl mb-1 md:mb-2">🏡</span>
            <span className="text-[10px] md:text-xs font-black text-stone-400 uppercase tracking-widest">Bond Duration</span>
            <p className="font-brand text-xl md:text-2xl text-stone-700">{bondedTime}</p>
         </div>
         <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] text-center shadow-xl border-2 border-white hover:border-orange-200 transition-colors">
            <span className="block text-3xl md:text-4xl mb-1 md:mb-2">✨</span>
            <span className="text-[10px] md:text-xs font-black text-stone-400 uppercase tracking-widest">Link Status</span>
            <p className="font-brand text-xl md:text-2xl text-green-500">OPTIMAL</p>
         </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t-2 border-stone-100 p-3 flex justify-around z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe">
        <button 
          onClick={() => setMobileTab('pet')}
          className={`flex flex-col items-center gap-1 p-2 px-6 rounded-2xl transition-all ${mobileTab === 'pet' ? 'bg-orange-100 text-orange-600 scale-105' : 'text-stone-400 hover:bg-stone-50'}`}
        >
          <span className="text-2xl">🐕</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Pet</span>
        </button>
        <button 
          onClick={() => setMobileTab('world')}
          className={`flex flex-col items-center gap-1 p-2 px-6 rounded-2xl transition-all ${mobileTab === 'world' ? 'bg-green-100 text-green-600 scale-105 relative' : 'text-stone-400 hover:bg-stone-50 relative'}`}
        >
          <span className="text-2xl">🌳</span>
          <span className="text-[10px] font-black uppercase tracking-widest">World</span>
          {unreadCount > 0 && <span className="absolute top-1 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
        </button>
        <button 
          onClick={() => setMobileTab('chat')}
          className={`flex flex-col items-center gap-1 p-2 px-6 rounded-2xl transition-all ${mobileTab === 'chat' ? 'bg-orange-100 text-orange-600 scale-105' : 'text-stone-400 hover:bg-stone-50'}`}
        >
          <span className="text-2xl">💬</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Chat</span>
        </button>
      </div>

      {/* Letter Modal */}
      {selectedLetter && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedLetter(null)}>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-[3rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl border-8 border-white relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedLetter(null)} className="absolute top-6 right-6 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-xl hover:bg-stone-100 transition-colors">✕</button>
            <div className="text-center mb-8">
              <span className="text-6xl block mb-4 animate-bounce">📱</span>
              <h2 className="text-3xl font-brand text-indigo-900">{selectedLetter.title}</h2>
              <p className="text-indigo-500 font-bold mt-2 uppercase tracking-widest text-xs">{new Date(selectedLetter.date).toLocaleString()}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-inner border-2 border-indigo-100 relative">
              <div className="absolute -top-3 -left-3 text-4xl opacity-20">❝</div>
              <p className="text-xl text-stone-700 leading-relaxed font-medium whitespace-pre-wrap relative z-10">{selectedLetter.content}</p>
              <div className="absolute -bottom-6 -right-3 text-4xl opacity-20">❞</div>
            </div>
            <div className="mt-8 text-center">
              <p className="font-brand text-2xl text-indigo-600">Sent from CityMail 🐾</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
