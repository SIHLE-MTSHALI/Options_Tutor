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
  // Enhanced tutorial system state
  completedTutorials: string[];
  completedSteps: string[];
  currentTutorial?: string;
  currentStep?: string;
  tutorialProgress: Record<string, number>; // tutorialId -> progress percentage
  achievements: Achievement[];
  learningStreak: number;
  lastLearningDate?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'tutorial' | 'trading' | 'strategy' | 'risk' | 'milestone';
  xpReward: number;
  unlockedAt: string;
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
  // Enhanced tutorial system initial state
  completedTutorials: [],
  completedSteps: [],
  currentTutorial: undefined,
  currentStep: undefined,
  tutorialProgress: {},
  achievements: [],
  learningStreak: 0,
  lastLearningDate: undefined,
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
      // Update level based on XP (every 500 XP = 1 level)
      state.level = Math.floor(state.xp / 500) + 1;
    },
    // Enhanced tutorial system actions
    startTutorial: (state, action: PayloadAction<string>) => {
      state.currentTutorial = action.payload;
      state.currentStep = undefined;
    },
    completeTutorial: (state, action: PayloadAction<string>) => {
      const tutorialId = action.payload;
      if (!state.completedTutorials.includes(tutorialId)) {
        state.completedTutorials.push(tutorialId);
        state.tutorialProgress[tutorialId] = 100;
        
        // Update learning streak
        const today = new Date().toDateString();
        if (state.lastLearningDate !== today) {
          if (state.lastLearningDate) {
            const lastDate = new Date(state.lastLearningDate);
            const todayDate = new Date(today);
            const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              state.learningStreak += 1;
            } else if (diffDays > 1) {
              state.learningStreak = 1;
            }
          } else {
            state.learningStreak = 1;
          }
          state.lastLearningDate = today;
        }
      }
      state.currentTutorial = undefined;
      state.currentStep = undefined;
    },
    completeStep: (state, action: PayloadAction<{ tutorialId: string; stepId: string }>) => {
      const { tutorialId, stepId } = action.payload;
      const stepKey = `${tutorialId}-${stepId}`;
      if (!state.completedSteps.includes(stepKey)) {
        state.completedSteps.push(stepKey);
      }
      state.currentStep = stepId;
    },
    updateTutorialProgress: (state, action: PayloadAction<{ tutorialId: string; progress: number }>) => {
      const { tutorialId, progress } = action.payload;
      state.tutorialProgress[tutorialId] = progress;
    },
    unlockAchievement: (state, action: PayloadAction<Achievement>) => {
      const achievement = action.payload;
      if (!state.achievements.find(a => a.id === achievement.id)) {
        state.achievements.push(achievement);
        state.xp += achievement.xpReward;
        state.level = Math.floor(state.xp / 500) + 1;
      }
    },
    setCurrentStep: (state, action: PayloadAction<string>) => {
      state.currentStep = action.payload;
    }
  },
});

export const { 
  completeMission, 
  addJournalEntry, 
  setRiskProfile, 
  addXP,
  startTutorial,
  completeTutorial,
  completeStep,
  updateTutorialProgress,
  unlockAchievement,
  setCurrentStep
} = learningSlice.actions;
export default learningSlice.reducer;
