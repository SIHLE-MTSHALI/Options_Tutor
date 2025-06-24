import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Fade,
  Slide,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  School as LearnIcon,
  TrendingUp as TradingIcon,
  Analytics as AnalysisIcon,
  AccountBalance as PortfolioIcon,
  CheckCircle as CompleteIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Close as CloseIcon,
  Lightbulb as TipIcon,
  Star as StarIcon,
  EmojiEvents as AchievementIcon
} from '@mui/icons-material';
import GuidedTour from './GuidedTour';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import './UserOnboarding.scss';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  optional?: boolean;
  estimatedTime?: number; // minutes
}

interface UserProfile {
  experience: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  goals: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  timeCommitment: 'casual' | 'regular' | 'intensive';
}

interface OnboardingProgress {
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  userProfile: UserProfile | null;
  startTime: number;
  lastActiveTime: number;
}

interface UserOnboardingProps {
  open: boolean;
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
  onClose: () => void;
}

const UserOnboarding: React.FC<UserOnboardingProps> = ({
  open,
  onComplete,
  onSkip,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    experience: 'beginner',
    interests: [],
    goals: [],
    riskTolerance: 'moderate',
    timeCommitment: 'regular'
  });
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showTour, setShowTour] = useState(false);
  const [progress, setProgress] = useState(0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useAppDispatch();
  const learning = useAppSelector(state => state.learning);

  // Calculate progress
  useEffect(() => {
    const totalSteps = onboardingSteps.length;
    const completed = completedSteps.length;
    setProgress((completed / totalSteps) * 100);
  }, [completedSteps]);

  // Experience level options
  const experienceOptions = [
    {
      value: 'beginner',
      label: 'Beginner',
      description: 'New to options trading',
      icon: <StarIcon />,
      color: 'success'
    },
    {
      value: 'intermediate',
      label: 'Intermediate',
      description: 'Some options experience',
      icon: <TradingIcon />,
      color: 'warning'
    },
    {
      value: 'advanced',
      label: 'Advanced',
      description: 'Experienced trader',
      icon: <AchievementIcon />,
      color: 'error'
    }
  ];

  // Interest options
  const interestOptions = [
    'Income Generation',
    'Speculation',
    'Hedging',
    'Volatility Trading',
    'Covered Calls',
    'Cash-Secured Puts',
    'Spreads',
    'Iron Condors',
    'Straddles',
    'Risk Management'
  ];

  // Goal options
  const goalOptions = [
    'Learn Options Basics',
    'Generate Income',
    'Protect Portfolio',
    'Speculate on Direction',
    'Trade Volatility',
    'Master Advanced Strategies',
    'Understand Greeks',
    'Risk Management',
    'Paper Trading Practice',
    'Real Trading Preparation'
  ];

  // Risk tolerance options
  const riskOptions = [
    {
      value: 'conservative',
      label: 'Conservative',
      description: 'Prefer lower risk, stable returns'
    },
    {
      value: 'moderate',
      label: 'Moderate',
      description: 'Balanced risk and return'
    },
    {
      value: 'aggressive',
      label: 'Aggressive',
      description: 'Higher risk for higher returns'
    }
  ];

  // Time commitment options
  const timeOptions = [
    {
      value: 'casual',
      label: 'Casual',
      description: '1-2 hours per week'
    },
    {
      value: 'regular',
      label: 'Regular',
      description: '3-5 hours per week'
    },
    {
      value: 'intensive',
      label: 'Intensive',
      description: '5+ hours per week'
    }
  ];

  // Handle profile update
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle interest toggle
  const toggleInterest = useCallback((interest: string) => {
    setUserProfile(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  }, []);

  // Handle goal toggle
  const toggleGoal = useCallback((goal: string) => {
    setUserProfile(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  }, []);

  // Complete step
  const completeStep = useCallback((stepId: string) => {
    setCompletedSteps(prev => [...prev, stepId]);
  }, []);

  // Next step
  const nextStep = useCallback(() => {
    if (currentStep < onboardingSteps.length - 1) {
      const step = onboardingSteps[currentStep];
      completeStep(step.id);
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, completeStep]);

  // Previous step
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Handle complete
  const handleComplete = useCallback(() => {
    onComplete(userProfile);
    
    // Save onboarding completion
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    
    // Start guided tour if beginner
    if (userProfile.experience === 'beginner') {
      setShowTour(true);
    }
  }, [userProfile, onComplete]);

  // Handle skip
  const handleSkip = useCallback(() => {
    onSkip();
    localStorage.setItem('onboardingSkipped', 'true');
  }, [onSkip]);

  // Onboarding steps
  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Options Tutor!',
      description: 'Your journey to mastering options trading starts here',
      content: (
        <Box textAlign="center" py={3}>
          <Typography variant="h4" gutterBottom color="primary">
            🎓 Welcome to Options Tutor!
          </Typography>
          <Typography variant="body1" paragraph>
            Options Tutor is your comprehensive platform for learning and practicing options trading. 
            We'll guide you through everything from the basics to advanced strategies.
          </Typography>
          <Box mt={3}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={6} md={3}>
                <Card className="feature-card">
                  <CardContent>
                    <LearnIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">Learn</Typography>
                    <Typography variant="body2">
                      Interactive tutorials and courses
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card className="feature-card">
                  <CardContent>
                    <TradingIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">Practice</Typography>
                    <Typography variant="body2">
                      Risk-free trading simulation
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card className="feature-card">
                  <CardContent>
                    <AnalysisIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">Analyze</Typography>
                    <Typography variant="body2">
                      Advanced risk analysis tools
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card className="feature-card">
                  <CardContent>
                    <PortfolioIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">Manage</Typography>
                    <Typography variant="body2">
                      Portfolio tracking and optimization
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Box>
      ),
      estimatedTime: 2
    },
    {
      id: 'experience',
      title: 'What\'s your experience level?',
      description: 'Help us customize your learning experience',
      content: (
        <Box py={2}>
          <Typography variant="body1" paragraph>
            Select your current experience level with options trading:
          </Typography>
          <Grid container spacing={2}>
            {experienceOptions.map((option) => (
              <Grid item xs={12} md={4} key={option.value}>
                <Card
                  className={`experience-card ${userProfile.experience === option.value ? 'selected' : ''}`}
                  onClick={() => updateProfile({ experience: option.value as any })}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      {option.icon}
                      <Typography variant="h6" ml={1}>
                        {option.label}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {option.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ),
      estimatedTime: 1
    },
    {
      id: 'interests',
      title: 'What interests you most?',
      description: 'Select your areas of interest (choose multiple)',
      content: (
        <Box py={2}>
          <Typography variant="body1" paragraph>
            Select the topics you're most interested in learning about:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {interestOptions.map((interest) => (
              <Chip
                key={interest}
                label={interest}
                clickable
                color={userProfile.interests.includes(interest) ? 'primary' : 'default'}
                variant={userProfile.interests.includes(interest) ? 'filled' : 'outlined'}
                onClick={() => toggleInterest(interest)}
                className="interest-chip"
              />
            ))}
          </Box>
        </Box>
      ),
      estimatedTime: 2
    },
    {
      id: 'goals',
      title: 'What are your goals?',
      description: 'Help us recommend the right learning path',
      content: (
        <Box py={2}>
          <Typography variant="body1" paragraph>
            What do you hope to achieve with options trading?
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {goalOptions.map((goal) => (
              <Chip
                key={goal}
                label={goal}
                clickable
                color={userProfile.goals.includes(goal) ? 'primary' : 'default'}
                variant={userProfile.goals.includes(goal) ? 'filled' : 'outlined'}
                onClick={() => toggleGoal(goal)}
                className="goal-chip"
              />
            ))}
          </Box>
        </Box>
      ),
      estimatedTime: 2
    },
    {
      id: 'risk',
      title: 'Risk Tolerance',
      description: 'How comfortable are you with risk?',
      content: (
        <Box py={2}>
          <Typography variant="body1" paragraph>
            Select your risk tolerance level:
          </Typography>
          <Grid container spacing={2}>
            {riskOptions.map((option) => (
              <Grid item xs={12} md={4} key={option.value}>
                <Card
                  className={`risk-card ${userProfile.riskTolerance === option.value ? 'selected' : ''}`}
                  onClick={() => updateProfile({ riskTolerance: option.value as any })}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {option.label}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {option.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ),
      estimatedTime: 1
    },
    {
      id: 'time',
      title: 'Time Commitment',
      description: 'How much time can you dedicate to learning?',
      content: (
        <Box py={2}>
          <Typography variant="body1" paragraph>
            How much time can you dedicate to learning options trading?
          </Typography>
          <Grid container spacing={2}>
            {timeOptions.map((option) => (
              <Grid item xs={12} md={4} key={option.value}>
                <Card
                  className={`time-card ${userProfile.timeCommitment === option.value ? 'selected' : ''}`}
                  onClick={() => updateProfile({ timeCommitment: option.value as any })}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {option.label}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {option.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ),
      estimatedTime: 1
    },
    {
      id: 'summary',
      title: 'Ready to Start!',
      description: 'Your personalized learning path is ready',
      content: (
        <Box py={2}>
          <Typography variant="h6" gutterBottom>
            Your Profile Summary:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card className="summary-card">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Experience Level
                  </Typography>
                  <Typography variant="body1">
                    {experienceOptions.find(e => e.value === userProfile.experience)?.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card className="summary-card">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Risk Tolerance
                  </Typography>
                  <Typography variant="body1">
                    {riskOptions.find(r => r.value === userProfile.riskTolerance)?.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card className="summary-card">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Interests ({userProfile.interests.length})
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {userProfile.interests.map((interest) => (
                      <Chip key={interest} label={interest} size="small" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card className="summary-card">
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Goals ({userProfile.goals.length})
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {userProfile.goals.map((goal) => (
                      <Chip key={goal} label={goal} size="small" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Box mt={3} p={2} bgcolor="primary.main" borderRadius={2} color="white">
            <Typography variant="h6" gutterBottom>
              🎯 Recommended Starting Point:
            </Typography>
            <Typography variant="body1">
              {userProfile.experience === 'beginner' 
                ? "Start with 'Options Fundamentals' course and practice with basic strategies."
                : userProfile.experience === 'intermediate'
                ? "Jump into 'Advanced Strategies' and explore volatility trading."
                : "Explore 'Professional Trading' techniques and complex multi-leg strategies."
              }
            </Typography>
          </Box>
        </Box>
      ),
      estimatedTime: 2
    }
  ];

  const currentStepData = onboardingSteps[currentStep];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        className="onboarding-dialog"
        disableEscapeKeyDown
      >
        {/* Header */}
        <Box className="onboarding-header">
          <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
            <Typography variant="h6" className="onboarding-title">
              Getting Started
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="caption">
                Step {currentStep + 1} of {onboardingSteps.length}
              </Typography>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          
          {/* Progress bar */}
          <LinearProgress 
            variant="determinate" 
            value={(currentStep / (onboardingSteps.length - 1)) * 100}
            className="onboarding-progress"
          />
        </Box>

        {/* Content */}
        <DialogContent className="onboarding-content">
          <Fade in key={currentStep}>
            <Box>
              <Box textAlign="center" mb={3}>
                <Typography variant="h5" gutterBottom>
                  {currentStepData.title}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  {currentStepData.description}
                </Typography>
                {currentStepData.estimatedTime && (
                  <Chip 
                    label={`${currentStepData.estimatedTime} min`}
                    size="small"
                    variant="outlined"
                    className="time-chip"
                  />
                )}
              </Box>
              
              {currentStepData.content}
            </Box>
          </Fade>
        </DialogContent>

        {/* Actions */}
        <DialogActions className="onboarding-actions">
          <Button
            onClick={handleSkip}
            className="skip-button"
          >
            Skip Setup
          </Button>
          
          <Box display="flex" gap={1}>
            <Button
              onClick={previousStep}
              disabled={currentStep === 0}
              startIcon={<BackIcon />}
              variant="outlined"
            >
              Previous
            </Button>
            
            <Button
              onClick={nextStep}
              variant="contained"
              endIcon={currentStep === onboardingSteps.length - 1 ? <CompleteIcon /> : <NextIcon />}
              className="next-button"
            >
              {currentStep === onboardingSteps.length - 1 ? 'Complete Setup' : 'Next'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Guided Tour */}
      {showTour && (
        <GuidedTour
          tours={[]} // Will be populated with actual tours
          activeTour="getting-started"
          onTourComplete={() => setShowTour(false)}
          onTourSkip={() => setShowTour(false)}
          onClose={() => setShowTour(false)}
          autoStart
        />
      )}
    </>
  );
};

export default UserOnboarding;