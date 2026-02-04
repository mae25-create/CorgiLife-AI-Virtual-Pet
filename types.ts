
// Types for the pet simulation state and messaging
export interface PetState {
  name: string;
  breed: string;
  color: string;
  ageMonths: number;
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number; // New stat for cleanliness
  level: number;
  xp: number;
  lastFed: number;
  isSleeping: boolean;
  adoptedAt: number;
  isAdopted: boolean;
  customPhoto?: string; // Base64 reference photo
}

export interface CorgiMessage {
  role: 'user' | 'corgi';
  text: string;
  translation?: string;
  mood?: 'happy' | 'sad' | 'sleepy' | 'hungry' | 'playful' | 'dirty';
}

export interface Activity {
  id: string;
  name: string;
  icon: string;
  hungerEffect: number;
  happinessEffect: number;
  energyEffect: number;
  hygieneEffect?: number; // Optional effect on cleanliness
  xpGain: number;
  description: string;
}
