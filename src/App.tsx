import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from './redux/store';
import ModernTradingDashboard from './components/ModernTradingDashboard';
import UserOnboarding from './components/UserOnboarding';
import './App.scss';

// Create dark theme for Material-UI
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4ade80',
      light: '#86efac',
      dark: '#22c55e',
    },
    secondary: {
      main: '#06b6d4',
      light: '#67e8f9',
      dark: '#0891b2',
    },
    background: {
      default: '#1a1a2e',
      paper: '#1c2333',
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#b0b0b0',
    },
    error: {
      main: '#f87171',
    },
    warning: {
      main: '#fbbf24',
    },
    success: {
      main: '#4ade80',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 4px 16px rgba(74, 222, 128, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(74, 222, 128, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(28, 35, 51, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(28, 35, 51, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 8,
        },
      },
    },
  },
});

interface UserProfile {
  experience: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  goals: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeCommitment: 'casual' | 'regular' | 'intensive';
}

const App: React.FC = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Check if user needs onboarding
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    const hasSkippedOnboarding = localStorage.getItem('onboardingSkipped');
    const savedProfile = localStorage.getItem('userProfile');

    if (!hasCompletedOnboarding && !hasSkippedOnboarding) {
      setShowOnboarding(true);
    } else if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (error) {
        console.error('Error parsing saved user profile:', error);
      }
    }
  }, []);

  // Handle onboarding completion
  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setShowOnboarding(false);
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('userProfile', JSON.stringify(profile));
  };

  // Handle onboarding skip
  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboardingSkipped', 'true');
  };

  // Handle onboarding close
  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  return (
    <Provider store={store}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <div className="app">
          <ModernTradingDashboard />
          
          {/* User Onboarding */}
          <UserOnboarding
            open={showOnboarding}
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingSkip}
            onClose={handleOnboardingClose}
          />
        </div>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
