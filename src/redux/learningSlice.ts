import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Mission {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  xpReward: number;
}

interface World {
  id: number;
  name: string;
  unlocked: boolean;
  missions: Mission[];
}

export interface LearningState {
  currentWorld: number;
  worlds: World[];
  xp: number;
  level: number;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  journalEntries: string[];
  availableMissions: Mission[];
}

const initialWorlds: World[] = [
  {
    id: 1,
    name: 'Foundations',
    unlocked: true,
    missions: [
      {
        id: 'm1-1',
        title: 'Terminology Drills',
        description: 'Complete all option terminology flashcards',
        completed: false,
        xpReward: 100
      },
      {
        id: 'm1-2',
        title: 'Payoff Puzzles',
        description: 'Solve 10 payoff diagram puzzles',
        completed: false,
        xpReward: 150
      }
    ]
  },
  {
    id: 2,
    name: 'Greeks Deep Dive',
    unlocked: false,
    missions: [
      {
        id: 'm2-1',
        title: 'Delta Slider',
        description: 'Observe how delta changes with price movement',
        completed: false,
        xpReward: 120
      }
    ]
  },
  // Add other worlds similarly
];

const initialState: LearningState = {
  currentWorld: 1,
  worlds: initialWorlds,
  xp: 0,
  level: 1,
  riskProfile: 'balanced',
  journalEntries: [],
  availableMissions: initialWorlds.flatMap(world => world.missions.filter(mission => !mission.completed)),
};

export const learningSlice = createSlice({
  name: 'learning',
  initialState,
  reducers: {
    completeMission: (state, action: PayloadAction<string>) => {
      const missionId = action.payload;
      for (const world of state.worlds) {
        const mission = world.missions.find(m => m.id === missionId);
        if (mission && !mission.completed) {
          mission.completed = true;
          state.xp += mission.xpReward;
          break;
        }
      }
      
      // Update level based on XP (every 500 XP = 1 level)
      state.level = Math.floor(state.xp / 500) + 1;
      
      // Update available missions
      state.availableMissions = state.worlds.flatMap(world => 
        world.missions.filter(mission => !mission.completed && world.unlocked)
      );
      
      // Check if we should unlock the next world
      const currentWorld = state.worlds.find(w => w.id === state.currentWorld);
      if (currentWorld && currentWorld.missions.every(m => m.completed)) {
        const nextWorld = state.worlds.find(w => w.id === state.currentWorld + 1);
        if (nextWorld) {
          nextWorld.unlocked = true;
          state.currentWorld = nextWorld.id;
          // Update available missions again after unlocking
          state.availableMissions = state.worlds.flatMap(world => 
            world.missions.filter(mission => !mission.completed && world.unlocked)
          );
        }
      }
    },
    addJournalEntry: (state, action: PayloadAction<string>) => {
      state.journalEntries.push(action.payload);
    },
    setRiskProfile: (state, action: PayloadAction<'conservative' | 'balanced' | 'aggressive'>) => {
      state.riskProfile = action.payload;
    },
    addXP: (state, action: PayloadAction<number>) => {
      state.xp += action.payload;
    }
  },
});

export const { completeMission, addJournalEntry, setRiskProfile, addXP } = learningSlice.actions;
export default learningSlice.reducer;
