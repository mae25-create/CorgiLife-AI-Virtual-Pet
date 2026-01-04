
import { PetState, Activity } from './types';

// Default state for a new pet
export const INITIAL_STATE: PetState = {
  name: '',
  breed: 'Pembroke Welsh Corgi',
  color: 'Red & White',
  ageMonths: 3,
  hunger: 80,
  happiness: 80,
  energy: 100,
  level: 1,
  xp: 0,
  lastFed: Date.now(),
  isSleeping: false,
  adoptedAt: Date.now(),
  isAdopted: false,
};

// Configuration constants for the pet simulation
export const BREEDS = ['Pembroke Welsh Corgi', 'Cardigan Welsh Corgi', 'Fluffy Corgi (Long-haired)'];
export const COLORS = ['Red & White', 'Tri-color', 'Sable', 'Brindle', 'Blue Merle', 'Black & Tan'];
export const MAX_STAT = 100;
export const XP_PER_LEVEL = 100;
export const EAT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/554/554-preview.mp3';

// Available activities and their effects on pet stats
export const ACTIVITIES: Activity[] = [
  { id: 'feed', name: 'Give Treat', icon: '🥣', hungerEffect: 20, happinessEffect: 5, energyEffect: 0, xpGain: 15, description: 'A tasty treat!' },
  { id: 'play', name: 'Fetch Ball', icon: '🎾', hungerEffect: -15, happinessEffect: 25, energyEffect: -20, xpGain: 25, description: 'Play time!' },
  { id: 'walk', name: 'Go for Walk', icon: '🌳', hungerEffect: -10, happinessEffect: 15, energyEffect: -30, xpGain: 35, description: 'Exploring!' },
  { id: 'belly-rub', name: 'Belly Rub', icon: '🖐️', hungerEffect: 0, happinessEffect: 10, energyEffect: 0, xpGain: 10, description: 'Pure bliss.' }
];
