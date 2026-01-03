
import { PetState, Activity } from './types';

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

export const BREEDS = [
  'Pembroke Welsh Corgi',
  'Cardigan Welsh Corgi',
  'Fluffy Corgi (Long-haired)'
];

export const COLORS = [
  'Red & White',
  'Tri-color',
  'Sable',
  'Brindle',
  'Blue Merle',
  'Black & Tan'
];

export const ACTIVITIES: Activity[] = [
  {
    id: 'feed',
    name: 'Give Treat',
    icon: '🦴',
    hungerEffect: 20,
    happinessEffect: 5,
    energyEffect: 0,
    xpGain: 10,
    description: 'A tasty bone for a good boy!'
  },
  {
    id: 'play',
    name: 'Fetch Ball',
    icon: '🎾',
    hungerEffect: -15,
    happinessEffect: 25,
    energyEffect: -20,
    xpGain: 25,
    description: 'Throw the ball and watch him run!'
  },
  {
    id: 'walk',
    name: 'Go for Walk',
    icon: '🌳',
    hungerEffect: -10,
    happinessEffect: 15,
    energyEffect: -30,
    xpGain: 35,
    description: 'Explore the neighborhood.'
  },
  {
    id: 'belly-rub',
    name: 'Belly Rub',
    icon: '🖐️',
    hungerEffect: 0,
    happinessEffect: 10,
    energyEffect: 0,
    xpGain: 5,
    description: 'The ultimate corgi weakness.'
  }
];

export const MAX_STAT = 100;
export const XP_PER_LEVEL = 100;
