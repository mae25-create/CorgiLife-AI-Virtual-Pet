
export interface PetState {
  name: string;
  breed: string;
  color: string;
  ageMonths: number;
  hunger: number;
  happiness: number;
  energy: number;
  level: number;
  xp: number;
  lastFed: number;
  isSleeping: boolean;
  adoptedAt: number;
  isAdopted: boolean;
}

export interface CorgiMessage {
  role: 'user' | 'corgi';
  text: string;
  translation?: string;
  mood?: 'happy' | 'sad' | 'sleepy' | 'hungry' | 'playful';
}

export interface Activity {
  id: string;
  name: string;
  icon: string;
  hungerEffect: number;
  happinessEffect: number;
  energyEffect: number;
  xpGain: number;
  description: string;
}
