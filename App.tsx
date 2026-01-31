
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PetState, CorgiMessage, Activity } from './types';
import { INITIAL_STATE, ACTIVITIES, MAX_STAT, XP_PER_LEVEL, BREEDS, COLORS } from './constants';
import StatusBar from './components/StatusBar';
import { generateCorgiResponse, generateCorgiImage } from './services/geminiService';

type OnboardingMode = 'none' | 'adopt' | 'upload';

interface VisualEffect {
  id: number;
  type: 'heart' | 'sparkle' | 'xp' | 'squeak';
  x: number;
  y: number;
}

const App: React.FC = () => {
  const [pet, setPet] = useState<PetState>(() => {
    const saved = localStorage.getItem('corgi-breeder-v1');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('none');
  const [messages, setMessages] = useState<CorgiMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [petImage, setPetImage] = useState<string>('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [isSqueaking, setIsSqueaking] = useState(false);
  
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
    localStorage.setItem('corgi-breeder-v1', JSON.stringify(pet));
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
            isSleeping: newEnergy >= MAX_STAT ? false : true
          };
        }
        return {
          ...prev,
          hunger: Math.max(0, prev.hunger - 0.25),
          happiness: Math.max(0, prev.happiness - 0.15),
          energy: Math.max(0, prev.energy - 0.2),
        };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [pet.isAdopted, pet.isSleeping]);

  const addVisualEffect = (type: 'heart' | 'sparkle' | 'xp' | 'squeak') => {
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
    const firstImg = await generateCorgiImage(pet, 'happily posing for its first day home');
    if (firstImg) setPetImage(firstImg);
    setPet(prev => ({ ...prev, isAdopted: true, adoptedAt: Date.now() }));
    setIsGeneratingImage(false);
  };

  const handleAction = async (activity: Activity) => {
    if (isGeneratingImage || isTyping) return;

    // Unique animation for the Squeaky Chicken
    if (activity.id === 'toy') {
      setIsSqueaking(true);
      addVisualEffect('squeak');
      setTimeout(() => setIsSqueaking(false), 1000);
    }

    // Trigger visual effects
    if (activity.happinessEffect > 0) addVisualEffect('heart');
    if (activity.xpGain > 0) addVisualEffect('xp');
    addVisualEffect('sparkle');

    const updatedPet = {
      ...pet,
      hunger: Math.min(MAX_STAT, pet.hunger + activity.hungerEffect),
      happiness: Math.min(MAX_STAT, pet.happiness + activity.happinessEffect),
      energy: Math.max(0, pet.energy + activity.energyEffect),
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
    
    // Customize prompt for the squeaky toy
    const promptPrefix = activity.id === 'toy' 
      ? `I just played with my FAVORITE squeaky chicken toy with you! I am super excited and going crazy!`
      : `I just ${activity.name.toLowerCase()} with you!`;

    const aiResp = await generateCorgiResponse(promptPrefix, updatedPet, []);
    setIsTyping(false);

    setMessages(prev => [...prev, {
      role: 'corgi',
      text: aiResp.barks,
      translation: aiResp.translation,
      mood: aiResp.mood
    }]);

    if (Math.random() > 0.6 || activity.id === 'toy') {
      triggerNewImage(activity.id === 'toy' ? 'playing wildly with a squeaky yellow rubber chicken' : activity.name.toLowerCase());
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

  if (!pet.isAdopted) {
    return (
      <div className="min-h-screen bg-[#fdf6e3] flex flex-col items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/paws.png')]">
        <div className="max-w-3xl w-full bg-white rounded-[3.5rem] shadow-2xl p-10 md:p-14 border-[12px] border-orange-100 animate-in fade-in slide-in-from-top-4 duration-700 relative overflow-hidden">
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
                  <h2 className="font-brand text-xl text-stone-700 mb-2 leading-tight">Let's have a real corgi in Electronic world?</h2>
                  <p className="text-stone-400 text-xs font-bold px-4">Begin your journey with a new digital companion!</p>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-100 group-hover:bg-orange-400 transition-colors"></div>
                </button>

                <button 
                  onClick={() => setOnboardingMode('upload')}
                  className="group relative bg-white border-4 border-stone-100 p-8 rounded-[3rem] shadow-xl hover:border-orange-400 hover:-translate-y-2 transition-all flex flex-col items-center text-center overflow-hidden"
                >
                  <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center text-5xl mb-6 group-hover:scale-110 transition-transform">📸</div>
                  <h2 className="font-brand text-xl text-stone-700 mb-2 leading-tight">Bring your real friend home</h2>
                  <p className="text-stone-400 text-xs font-bold px-4">Upload a photo to see them in the electronic world.</p>
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
                <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">Electronic Name</label>
                <input 
                  type="text" 
                  placeholder="What shall we call them?" 
                  value={pet.name} 
                  onChange={(e) => setPet(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-5 rounded-3xl bg-stone-50 border-2 border-stone-100 focus:border-orange-400 focus:outline-none transition-all font-brand text-2xl text-stone-800 text-center shadow-inner"
                />
              </div>

              <button 
                onClick={handleAdopt}
                disabled={!pet.name.trim() || (onboardingMode === 'upload' && !pet.customPhoto) || isGeneratingImage}
                className="w-full py-6 bg-orange-500 hover:bg-orange-600 text-white rounded-[2rem] font-brand text-2xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transform hover:-translate-y-1"
              >
                {isGeneratingImage ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    Bringing {pet.name} to life...
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
    <div className="min-h-screen flex flex-col items-center bg-[#fdf6e3] p-4 md:p-10 relative overflow-x-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paws.png')]"></div>

      <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6 mb-12 relative z-10">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-brand text-orange-600 drop-shadow-sm flex items-center gap-3 justify-center md:justify-start">
            <span className="animate-pulse">🐾</span> {pet.name}'s World
          </h1>
          <p className="text-lg text-stone-500 font-bold mt-1">
            {pet.ageMonths} Month Old {pet.breed} • <span className="text-orange-400">{pet.color}</span>
            {pet.customPhoto && <span className="ml-3 text-[9px] bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase font-black border border-orange-200 shadow-sm">Real Companion Ref</span>}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-4 rounded-[2rem] shadow-xl border-4 border-orange-100 flex items-center gap-5 transform hover:scale-105 transition-transform">
            <div className="text-4xl">🏅</div>
            <div>
              <div className="text-xs uppercase font-black text-stone-400 tracking-tighter">Progression</div>
              <div className="text-3xl font-brand text-orange-500 leading-none">LVL {pet.level}</div>
            </div>
            <div className="h-12 w-1 bg-stone-100 rounded-full mx-1"></div>
            <div className="flex-1 min-w-[120px]">
              <div className="flex justify-between items-end mb-2 text-xs font-black text-stone-400">
                XP {pet.xp}/{XP_PER_LEVEL}
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-orange-400 transition-all duration-1000 ease-out rounded-full shadow-[0_0_8px_rgba(251,146,60,0.5)]" 
                  style={{ width: `${(pet.xp / XP_PER_LEVEL) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-start relative z-10">
        <div className="space-y-10">
          <div className={`relative group overflow-hidden rounded-[4rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-[16px] border-white aspect-square flex items-center justify-center transition-all duration-300 ${isSqueaking ? 'scale-105' : ''}`}>
             {/* Visual Effects Container */}
             <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                {effects.map(effect => (
                  <div 
                    key={effect.id}
                    className={`absolute transition-all duration-1000 ease-out animate-in fade-in slide-in-from-bottom-8 ${effect.type === 'squeak' ? 'text-4xl font-brand text-yellow-500 drop-shadow-lg' : ''}`}
                    style={{ 
                      left: `${effect.x}%`, 
                      top: `${effect.y}%`, 
                      fontSize: effect.type === 'xp' ? '2.5rem' : effect.type === 'squeak' ? '1.8rem' : '2rem',
                      opacity: 0,
                      transform: 'translateY(-120px) rotate(15deg)'
                    }}
                  >
                    {effect.type === 'heart' ? '❤️' : effect.type === 'xp' ? '✨' : effect.type === 'squeak' ? 'SQUEAK!' : '⭐'}
                  </div>
                ))}
             </div>

             {isGeneratingImage && (
               <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center">
                 <div className="animate-spin text-7xl mb-6">📷</div>
                 <div className="text-orange-600 font-brand text-2xl animate-pulse text-center px-6">
                    {pet.customPhoto ? `Personalizing ${pet.name}...` : `Updating ${pet.name}...`}
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

          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl space-y-8 border-4 border-orange-50">
            <h3 className="font-brand text-3xl text-stone-700 flex items-center gap-4">🩺 Electronic Vitals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <StatusBar label="Hunger" value={pet.hunger} color="bg-amber-400" icon="🥣" />
              <StatusBar label="Mood" value={pet.happiness} color="bg-pink-400" icon="💖" />
              <StatusBar label="Energy" value={pet.energy} color="bg-cyan-400" icon="⚡" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {ACTIVITIES.map(act => (
              <button 
                key={act.id} 
                onClick={() => handleAction(act)}
                disabled={pet.isSleeping || isGeneratingImage}
                className={`flex flex-col items-center justify-center p-6 rounded-[2rem] bg-white shadow-xl border-b-8 border-stone-100 transition-all group ${
                  pet.isSleeping || isGeneratingImage
                  ? 'opacity-30 grayscale cursor-not-allowed' 
                  : `hover:-translate-y-2 hover:bg-orange-50 active:translate-y-1 active:border-b-2 ${act.id === 'toy' ? 'ring-2 ring-yellow-400/50' : ''}`
                }`}
              >
                <span className="text-4xl mb-2 group-hover:scale-125 transition-transform">{act.icon}</span>
                <span className="text-[10px] font-black text-stone-600 uppercase tracking-tighter text-center leading-tight">{act.name}</span>
              </button>
            ))}
            <button 
              onClick={toggleSleep}
              disabled={isGeneratingImage}
              className={`col-span-2 md:col-span-5 flex items-center justify-center gap-5 p-6 rounded-[2.5rem] shadow-xl border-b-8 transition-all ${
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

        <div className="bg-white rounded-[4rem] shadow-2xl flex flex-col h-[700px] lg:h-[950px] border-8 border-orange-50 overflow-hidden relative">
          <div className="p-8 border-b-4 border-orange-50 bg-orange-50/20 flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-orange-300 flex items-center justify-center text-5xl shadow-lg border-2 border-white">🐕</div>
            <div>
              <h3 className="font-brand text-stone-700 text-3xl mb-1">{pet.name}'s World Log</h3>
              <p className="text-xs text-orange-600 font-black uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span> Electronic Bark Signal
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-8 scroll-smooth scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] rounded-[2.5rem] p-7 shadow-lg relative ${
                  msg.role === 'user' 
                  ? 'bg-orange-500 text-white rounded-tr-none' 
                  : 'bg-stone-50 text-stone-800 rounded-tl-none border-2 border-stone-100'
                }`}>
                  <p className="font-bold text-xl leading-relaxed">{msg.text}</p>
                  {msg.translation && (
                    <div className="mt-6 pt-6 border-t-2 border-black/5 text-base italic font-semibold opacity-80 text-stone-600">
                      <span className="text-[11px] block font-black uppercase tracking-[0.2em] text-orange-400 mb-2">Electronic Translation</span>
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

          <form onSubmit={handleSendMessage} className="p-8 bg-white border-t-4 border-orange-50">
            <div className="flex gap-4 items-center bg-stone-50 p-3 rounded-[2.5rem] border-4 border-stone-100 focus-within:border-orange-400 shadow-inner transition-colors">
              <input 
                type="text" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Speak to ${pet.name}...`}
                className="flex-1 p-4 bg-transparent border-none focus:outline-none font-bold text-xl text-stone-700"
              />
              <button 
                type="submit"
                disabled={isTyping || isGeneratingImage}
                className="bg-orange-500 text-white w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-bold shadow-2xl hover:scale-105 active:scale-90 transition-all disabled:opacity-50"
              >
                🐾
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="mt-20 w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-6 pb-20 relative z-10">
         <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2.5rem] text-center shadow-xl border-2 border-white hover:border-orange-200 transition-colors">
            <span className="block text-4xl mb-2">🎂</span>
            <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Electronic Age</span>
            <p className="font-brand text-2xl text-stone-700">{pet.ageMonths} Mos</p>
         </div>
         <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2.5rem] text-center shadow-xl border-2 border-white hover:border-orange-200 transition-colors">
            <span className="block text-4xl mb-2">🧬</span>
            <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Genetic Spec</span>
            <p className="font-brand text-2xl text-stone-700">{pet.breed.split(' ')[0]}</p>
         </div>
         <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2.5rem] text-center shadow-xl border-2 border-white hover:border-orange-200 transition-colors">
            <span className="block text-4xl mb-2">🏡</span>
            <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Bond Duration</span>
            <p className="font-brand text-2xl text-stone-700">{bondedTime}</p>
         </div>
         <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2.5rem] text-center shadow-xl border-2 border-white hover:border-orange-200 transition-colors">
            <span className="block text-4xl mb-2">✨</span>
            <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Link Status</span>
            <p className="font-brand text-2xl text-green-500">OPTIMAL</p>
         </div>
      </footer>
    </div>
  );
};

export default App;
