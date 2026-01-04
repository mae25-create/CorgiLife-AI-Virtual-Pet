
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PetState, CorgiMessage, Activity } from './types';
import { INITIAL_STATE, ACTIVITIES, MAX_STAT, XP_PER_LEVEL, BREEDS, COLORS } from './constants';
import StatusBar from './components/StatusBar';
import { generateCorgiResponse, generateCorgiImage } from './services/geminiService';

const App: React.FC = () => {
  const [pet, setPet] = useState<PetState>(() => {
    const saved = localStorage.getItem('corgi-breeder-v1');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [messages, setMessages] = useState<CorgiMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [petImage, setPetImage] = useState<string>('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const handleAdopt = () => {
    if (!pet.name.trim()) return;
    setPet(prev => ({ ...prev, isAdopted: true, adoptedAt: Date.now() }));
  };

  const handleAction = async (activity: Activity) => {
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
    const aiResp = await generateCorgiResponse(`I just ${activity.name.toLowerCase()} with you!`, updatedPet, []);
    setIsTyping(false);

    setMessages(prev => [...prev, {
      role: 'corgi',
      text: aiResp.barks,
      translation: aiResp.translation,
      mood: aiResp.mood
    }]);

    if (Math.random() > 0.6) {
      triggerNewImage(activity.name.toLowerCase());
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
    if (!inputValue.trim()) return;

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
        <div className="max-w-2xl w-full bg-white rounded-[3.5rem] shadow-2xl p-10 md:p-14 border-[12px] border-orange-100 animate-in fade-in slide-in-from-top-4 duration-700 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-orange-400"></div>
          <div className="text-center mb-10">
            <span className="text-7xl block mb-6 animate-bounce">🦴</span>
            <h1 className="text-5xl font-brand text-orange-600 mb-3 tracking-tight">Electronic Breeder</h1>
            <p className="text-stone-500 font-semibold text-lg italic">Adopt and raise your unique companion</p>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">1. Select Breed</label>
                <select 
                  value={pet.breed} 
                  onChange={(e) => setPet(prev => ({ ...prev, breed: e.target.value }))}
                  className="w-full p-5 rounded-2xl bg-orange-50/50 border-2 border-orange-100 focus:border-orange-400 focus:outline-none transition-all font-bold text-stone-700 appearance-none shadow-sm cursor-pointer"
                >
                  {BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">2. Starting Month</label>
                <input 
                  type="number" 
                  min="2" 
                  max="36" 
                  value={pet.ageMonths} 
                  onChange={(e) => setPet(prev => ({ ...prev, ageMonths: parseInt(e.target.value) || 2 }))}
                  className="w-full p-5 rounded-2xl bg-orange-50/50 border-2 border-orange-100 focus:border-orange-400 focus:outline-none transition-all font-bold text-stone-700 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">3. Coat Appearance</label>
              <div className="grid grid-cols-3 gap-3">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setPet(prev => ({ ...prev, color: c }))}
                    className={`p-4 text-[10px] font-black rounded-2xl border-2 transition-all shadow-sm ${
                      pet.color === c 
                      ? 'border-orange-400 bg-orange-500 text-white scale-105' 
                      : 'border-orange-100 bg-white text-stone-500 hover:border-orange-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">4. Name Your Corgi</label>
              <input 
                type="text" 
                placeholder="Give your friend a name..." 
                value={pet.name} 
                onChange={(e) => setPet(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-6 rounded-3xl bg-stone-50 border-2 border-stone-200 focus:border-orange-400 focus:outline-none transition-all font-brand text-2xl text-stone-800 placeholder:text-stone-300 text-center"
              />
            </div>

            <button 
              onClick={handleAdopt}
              disabled={!pet.name.trim()}
              className="w-full py-6 bg-orange-500 hover:bg-orange-600 text-white rounded-[2rem] font-brand text-2xl shadow-2xl hover:shadow-orange-300/60 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
            >
              Start Raising {pet.name || 'Your Dog'} ✨
            </button>
          </div>
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
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-4 rounded-[2rem] shadow-xl border-4 border-orange-100 flex items-center gap-5 transform hover:scale-105 transition-transform">
            <div className="text-4xl">🏅</div>
            <div>
              <div className="text-xs uppercase font-black text-stone-400 tracking-tighter">Level</div>
              <div className="text-3xl font-brand text-orange-500 leading-none">{pet.level}</div>
            </div>
            <div className="h-12 w-1 bg-stone-100 rounded-full mx-1"></div>
            <div className="flex-1 min-w-[120px]">
              <div className="flex justify-between items-end mb-2 text-xs font-black text-stone-400">
                XP {pet.xp}/{XP_PER_LEVEL}
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-orange-400 transition-all duration-1000 ease-out rounded-full" 
                  style={{ width: `${(pet.xp / XP_PER_LEVEL) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-start relative z-10">
        <div className="space-y-10">
          <div className="relative group overflow-hidden rounded-[4rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-[16px] border-white aspect-square flex items-center justify-center">
             {isGeneratingImage && (
               <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center">
                 <div className="animate-spin text-7xl mb-6">📷</div>
                 <div className="text-orange-600 font-brand text-2xl animate-pulse">Drawing {pet.name}...</div>
               </div>
             )}

             {showLevelUp && (
               <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-orange-500/20 backdrop-blur-md animate-in zoom-in duration-500 pointer-events-none">
                 <div className="text-9xl mb-4 animate-bounce">🎈</div>
                 <h2 className="text-6xl font-brand text-white drop-shadow-2xl">LEVEL UP!</h2>
                 <p className="text-white text-2xl font-black mt-4 uppercase tracking-[0.4em]">1 Month Older ✨</p>
               </div>
             )}

             <img 
               src={petImage || `https://picsum.photos/seed/${pet.name}/800/800`} 
               alt={pet.name} 
               className={`w-full h-full object-cover transition-all duration-700 ${pet.isSleeping ? 'brightness-50 grayscale' : 'group-hover:scale-110'}`}
             />

             {pet.isSleeping && (
               <div className="absolute top-16 right-16 text-8xl animate-bounce z-20">💤</div>
             )}
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl space-y-8 border-4 border-orange-50">
            <h3 className="font-brand text-3xl text-stone-700 flex items-center gap-4">🩺 Vital Signs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <StatusBar label="Hunger" value={pet.hunger} color="bg-amber-400" icon="🥣" />
              <StatusBar label="Mood" value={pet.happiness} color="bg-pink-400" icon="💖" />
              <StatusBar label="Energy" value={pet.energy} color="bg-cyan-400" icon="⚡" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {ACTIVITIES.map(act => (
              <button 
                key={act.id} 
                onClick={() => handleAction(act)}
                disabled={pet.isSleeping}
                className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] bg-white shadow-xl border-b-[12px] border-stone-100 transition-all group ${
                  pet.isSleeping 
                  ? 'opacity-30 grayscale cursor-not-allowed' 
                  : 'hover:-translate-y-2 hover:bg-orange-50 active:translate-y-1 active:border-b-4'
                }`}
              >
                <span className="text-5xl mb-3 group-hover:scale-125 transition-transform">{act.icon}</span>
                <span className="text-sm font-black text-stone-600 uppercase tracking-tighter text-center">{act.name}</span>
              </button>
            ))}
            <button 
              onClick={toggleSleep}
              className={`col-span-2 md:col-span-4 flex items-center justify-center gap-5 p-8 rounded-[3rem] shadow-2xl border-b-[12px] transition-all ${
                pet.isSleeping 
                ? 'bg-indigo-700 text-white border-indigo-900 active:translate-y-1 active:border-b-4' 
                : 'bg-white text-stone-700 border-stone-100 hover:bg-indigo-50 active:translate-y-1 active:border-b-4'
              }`}
            >
              <span className="text-4xl">{pet.isSleeping ? '☀️' : '🌙'}</span>
              <span className="font-brand text-2xl">{pet.isSleeping ? 'Good Morning!' : 'Time for Nap'}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[4rem] shadow-2xl flex flex-col h-[700px] lg:h-[950px] border-8 border-orange-50 overflow-hidden relative">
          <div className="p-8 border-b-4 border-orange-50 bg-orange-50/20 flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-orange-300 flex items-center justify-center text-5xl">🐕</div>
            <div>
              <h3 className="font-brand text-stone-700 text-3xl mb-2">{pet.name}'s Diary</h3>
              <p className="text-xs text-orange-600 font-black uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span> Live Bark Translator
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
                      <span className="text-[11px] block font-black uppercase tracking-[0.2em] text-orange-400 mb-2">Translation</span>
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
            <div className="flex gap-4 items-center bg-stone-50 p-3 rounded-[2.5rem] border-4 border-stone-100 focus-within:border-orange-400 shadow-inner">
              <input 
                type="text" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Talk to ${pet.name}...`}
                className="flex-1 p-4 bg-transparent border-none focus:outline-none font-bold text-xl text-stone-700"
              />
              <button 
                type="submit"
                className="bg-orange-500 text-white w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-bold shadow-2xl hover:scale-105 active:scale-90 transition-all"
              >
                🐾
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="mt-20 w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-6 pb-20 relative z-10">
         <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2.5rem] text-center shadow-xl border-2 border-white">
            <span className="block text-4xl mb-2">🎂</span>
            <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Growth</span>
            <p className="font-brand text-2xl text-stone-700">{pet.ageMonths} Months</p>
         </div>
         <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2.5rem] text-center shadow-xl border-2 border-white">
            <span className="block text-4xl mb-2">🧬</span>
            <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Breed</span>
            <p className="font-brand text-2xl text-stone-700">{pet.breed.split(' ')[0]}</p>
         </div>
         <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2.5rem] text-center shadow-xl border-2 border-white">
            <span className="block text-4xl mb-2">🏡</span>
            <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Bonded</span>
            <p className="font-brand text-2xl text-stone-700">{bondedTime}</p>
         </div>
         <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2.5rem] text-center shadow-xl border-2 border-white">
            <span className="block text-4xl mb-2">✨</span>
            <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Status</span>
            <p className="font-brand text-2xl text-green-500">THRIVING</p>
         </div>
      </footer>
    </div>
  );
};

export default App;