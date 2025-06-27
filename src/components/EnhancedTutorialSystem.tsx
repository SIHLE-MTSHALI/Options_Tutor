import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Lock as LockIcon,
  School as SchoolIcon,
  Timer as TimerIcon,
  Star as StarIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Lightbulb as HintIcon,
  Quiz as QuizIcon,
  Psychology as BrainIcon,
  TrendingUp as ProgressIcon
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { completeMission, addXP, addJournalEntry } from '../redux/learningSlice';
import { tutorialDatabase, learningPaths, Tutorial, TutorialStep, LearningPath } from '../data/tutorialContent';
import './EnhancedTutorialSystem.scss';

interface EnhancedTutorialSystemProps {
  selectedTutorial?: string;
  selectedPath?: string;
  onTutorialComplete?: (tutorialId: string) => void;
  onPathComplete?: (pathId: string) => void;
  compactMode?: boolean;
}

interface UserProgress {
  completedTutorials: string[];
  completedSteps: string[];
  currentStep?: string;
  totalXP: number;
  currentLevel: number;
}

const EnhancedTutorialSystem: React.FC<EnhancedTutorialSystemProps> = ({
  selectedTutorial,
  selectedPath,
  onTutorialComplete,
  onPathComplete,
  compactMode = false
}) => {
  const dispatch = useAppDispatch();
  const learningState = useAppSelector(state => state.learning);
  
  // Component state
  const [currentView, setCurrentView] = useState<'paths' | 'tutorials' | 'tutorial-detail' | 'step-detail'>('paths');
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [activeStep, setActiveStep] = useState<TutorialStep | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);

  // Calculate user progress
  const userProgress: UserProgress = {
    completedTutorials: [], // This would come from localStorage or backend
    completedSteps: [], // This would come from localStorage or backend
    totalXP: learningState.xp,
    currentLevel: learningState.level
  };

  // Initialize tutorial if provided
  useEffect(() => {
    if (selectedTutorial) {
      const tutorial = tutorialDatabase.find(t => t.id === selectedTutorial);
      if (tutorial) {
        setActiveTutorial(tutorial);
        setCurrentView('tutorial-detail');
      }
    }
  }, [selectedTutorial]);

  // Check if tutorial is unlocked
  const isTutorialUnlocked = useCallback((tutorial: Tutorial): boolean => {
    if (tutorial.prerequisites.length === 0) return true;
    return tutorial.prerequisites.every(prereq => 
      userProgress.completedTutorials.includes(prereq)
    );
  }, [userProgress.completedTutorials]);

  // Check if learning path is unlocked
  const isPathUnlocked = useCallback((path: LearningPath): boolean => {
    if (path.prerequisites.length === 0) return true;
    return path.prerequisites.every(prereq => 
      userProgress.completedTutorials.includes(prereq)
    );
  }, [userProgress.completedTutorials]);

  // Start tutorial
  const startTutorial = useCallback((tutorial: Tutorial) => {
    if (!isTutorialUnlocked(tutorial)) return;
    
    setActiveTutorial(tutorial);
    setCurrentStepIndex(0);
    setActiveStep(tutorial.steps[0]);
    setCurrentView('step-detail');
    setUserAnswers({});
    setShowHints({});
  }, [isTutorialUnlocked]);

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (!activeTutorial) return;
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < activeTutorial.steps.length) {
      setCurrentStepIndex(nextIndex);
      setActiveStep(activeTutorial.steps[nextIndex]);
    } else {
      // Tutorial completed
      completeTutorial();
    }
  }, [activeTutorial, currentStepIndex]);

  // Navigate to previous step
  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      setActiveStep(activeTutorial?.steps[prevIndex] || null);
    }
  }, [currentStepIndex, activeTutorial]);

  // Complete tutorial
  const completeTutorial = useCallback(() => {
    if (!activeTutorial) return;
    
    // Award XP
    dispatch(addXP(activeTutorial.completionReward));
    
    // Add journal entry
    dispatch(addJournalEntry(`Completed tutorial: ${activeTutorial.title}`));
    
    // Show celebration
    setShowCelebration(true);
    
    // Callback
    onTutorialComplete?.(activeTutorial.id);
    
    // Reset state
    setTimeout(() => {
      setActiveTutorial(null);
      setActiveStep(null);
      setCurrentView('tutorials');
      setShowCelebration(false);
    }, 3000);
  }, [activeTutorial, dispatch, onTutorialComplete]);

  // Handle quiz answer
  const handleQuizAnswer = useCallback((stepId: string, answer: any) => {
    setUserAnswers(prev => ({ ...prev, [stepId]: answer }));
    
    const step = activeStep;
    if (step?.validation) {
      const isCorrect = answer === step.validation.correctAnswer;
      if (isCorrect && step.xpReward) {
        dispatch(addXP(step.xpReward));
        setCompletedSteps(prev => new Set([...prev, stepId]));
      }
    }
  }, [activeStep, dispatch]);

  // Toggle hints
  const toggleHints = useCallback((stepId: string) => {
    setShowHints(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  }, []);

  // Render learning paths view
  const renderLearningPaths = () => (
    <Box className="learning-paths-view">
      <Box className="view-header">
        <Typography variant="h4" gutterBottom>
          <SchoolIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Learning Paths
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Structured learning journeys to master options trading step by step.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {learningPaths.map((path) => {
          const isUnlocked = isPathUnlocked(path);
          const completedTutorials = path.tutorials.filter(tutId => 
            userProgress.completedTutorials.includes(tutId)
          ).length;
          const progress = (completedTutorials / path.tutorials.length) * 100;

          return (
            <Grid item xs={12} md={6} lg={4} key={path.id}>
              <Card 
                className={`learning-path-card ${!isUnlocked ? 'locked' : ''}`}
                onClick={() => isUnlocked && setCurrentView('tutorials')}
              >
                <CardContent>
                  {!isUnlocked && (
                    <Box className="locked-overlay">
                      <LockIcon />
                      <Typography variant="caption">
                        Complete prerequisites to unlock
                      </Typography>
                    </Box>
                  )}
                  
                  <Box className="path-header">
                    <Typography variant="h6" gutterBottom>
                      {path.name}
                    </Typography>
                    <Chip 
                      label={path.difficulty} 
                      size="small"
                      color={
                        path.difficulty === 'Beginner' ? 'success' :
                        path.difficulty === 'Intermediate' ? 'warning' : 'error'
                      }
                    />
                  </Box>

                  <Typography variant="body2" color="textSecondary" paragraph>
                    {path.description}
                  </Typography>

                  <Box className="path-stats">
                    <Box className="stat">
                      <TimerIcon fontSize="small" />
                      <Typography variant="caption">
                        {path.estimatedTime} min
                      </Typography>
                    </Box>
                    <Box className="stat">
                      <SchoolIcon fontSize="small" />
                      <Typography variant="caption">
                        {path.tutorials.length} tutorials
                      </Typography>
                    </Box>
                    <Box className="stat">
                      <StarIcon fontSize="small" />
                      <Typography variant="caption">
                        {path.completionReward} XP
                      </Typography>
                    </Box>
                  </Box>

                  {isUnlocked && (
                    <>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        sx={{ mt: 2, mb: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {completedTutorials}/{path.tutorials.length} tutorials completed
                      </Typography>
                    </>
                  )}

                  {path.badge && progress === 100 && (
                    <Box className="badge-earned">
                      <Typography variant="caption">
                        {path.badge.icon} {path.badge.name}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  // Render tutorials list view
  const renderTutorialsList = () => (
    <Box className="tutorials-list-view">
      <Box className="view-header">
        <Button 
          startIcon={<ProgressIcon />}
          onClick={() => setCurrentView('paths')}
          sx={{ mb: 2 }}
        >
          Back to Learning Paths
        </Button>
        
        <Typography variant="h4" gutterBottom>
          Available Tutorials
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {tutorialDatabase.map((tutorial) => {
          const isUnlocked = isTutorialUnlocked(tutorial);
          const isCompleted = userProgress.completedTutorials.includes(tutorial.id);

          return (
            <Grid item xs={12} md={6} lg={4} key={tutorial.id}>
              <Card 
                className={`tutorial-card ${!isUnlocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => isUnlocked && startTutorial(tutorial)}
              >
                <CardContent>
                  {!isUnlocked && (
                    <Box className="locked-overlay">
                      <LockIcon />
                      <Typography variant="caption">
                        Complete prerequisites
                      </Typography>
                    </Box>
                  )}

                  {isCompleted && (
                    <Box className="completed-badge">
                      <CheckIcon color="success" />
                    </Box>
                  )}

                  <Box className="tutorial-header">
                    <Typography variant="h6" gutterBottom>
                      {tutorial.title}
                    </Typography>
                    <Chip 
                      label={tutorial.difficulty} 
                      size="small"
                      color={
                        tutorial.difficulty === 'Beginner' ? 'success' :
                        tutorial.difficulty === 'Intermediate' ? 'warning' : 'error'
                      }
                    />
                  </Box>

                  <Typography variant="body2" color="textSecondary" paragraph>
                    {tutorial.description}
                  </Typography>

                  <Box className="tutorial-stats">
                    <Box className="stat">
                      <TimerIcon fontSize="small" />
                      <Typography variant="caption">
                        {tutorial.estimatedTime} min
                      </Typography>
                    </Box>
                    <Box className="stat">
                      <QuizIcon fontSize="small" />
                      <Typography variant="caption">
                        {tutorial.steps.length} steps
                      </Typography>
                    </Box>
                    <Box className="stat">
                      <StarIcon fontSize="small" />
                      <Typography variant="caption">
                        {tutorial.completionReward} XP
                      </Typography>
                    </Box>
                  </Box>

                  <Box className="tutorial-tags">
                    {tutorial.tags.slice(0, 3).map(tag => (
                      <Chip 
                        key={tag} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>

                  {isUnlocked && !isCompleted && (
                    <Button
                      variant="contained"
                      startIcon={<PlayIcon />}
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        startTutorial(tutorial);
                      }}
                    >
                      Start Tutorial
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  // Render tutorial detail view
  const renderTutorialDetail = () => {
    if (!activeTutorial) return null;

    return (
      <Box className="tutorial-detail-view">
        <Box className="tutorial-header">
          <Button 
            onClick={() => setCurrentView('tutorials')}
            sx={{ mb: 2 }}
          >
            ← Back to Tutorials
          </Button>
          
          <Typography variant="h4" gutterBottom>
            {activeTutorial.title}
          </Typography>
          
          <Typography variant="body1" color="textSecondary" paragraph>
            {activeTutorial.description}
          </Typography>

          <Box className="tutorial-meta">
            <Chip label={activeTutorial.difficulty} />
            <Chip label={`${activeTutorial.estimatedTime} min`} icon={<TimerIcon />} />
            <Chip label={`${activeTutorial.completionReward} XP`} icon={<StarIcon />} />
          </Box>
        </Box>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Learning Objectives</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {activeTutorial.learningObjectives.map((objective, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <BrainIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={objective} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        <Box className="tutorial-steps">
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Tutorial Steps
          </Typography>
          
          <Stepper orientation="vertical">
            {activeTutorial.steps.map((step, index) => (
              <Step key={step.id} active={index === currentStepIndex}>
                <StepLabel>
                  <Box className="step-header">
                    <Typography variant="subtitle1">
                      {step.title}
                    </Typography>
                    <Box className="step-meta">
                      <Chip 
                        label={step.type} 
                        size="small" 
                        variant="outlined"
                      />
                      {step.xpReward && (
                        <Chip 
                          label={`${step.xpReward} XP`} 
                          size="small" 
                          color="primary"
                        />
                      )}
                    </Box>
                  </Box>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" paragraph>
                    {step.content.substring(0, 150)}...
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setCurrentStepIndex(index);
                      setActiveStep(step);
                      setCurrentView('step-detail');
                    }}
                  >
                    Start Step
                  </Button>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Box>
    );
  };

  // Render step detail view
  const renderStepDetail = () => {
    if (!activeStep || !activeTutorial) return null;

    const isQuiz = activeStep.type === 'quiz';
    const userAnswer = userAnswers[activeStep.id];
    const showHint = showHints[activeStep.id];
    const isCompleted = completedSteps.has(activeStep.id);

    return (
      <Box className="step-detail-view">
        <Box className="step-header">
          <Button 
            onClick={() => setCurrentView('tutorial-detail')}
            sx={{ mb: 2 }}
          >
            ← Back to Tutorial
          </Button>
          
          <Box className="step-progress">
            <Typography variant="h5" gutterBottom>
              {activeStep.title}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={((currentStepIndex + 1) / activeTutorial.steps.length) * 100}
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="textSecondary">
              Step {currentStepIndex + 1} of {activeTutorial.steps.length}
            </Typography>
          </Box>
        </Box>

        <Paper className="step-content" elevation={2}>
          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
            {activeStep.content}
          </Typography>

          {isQuiz && activeStep.validation && (
            <Box className="quiz-section">
              <Typography variant="h6" gutterBottom>
                Quick Check
              </Typography>
              
              {/* This would be expanded based on validation type */}
              <Box className="quiz-options">
                {/* Example for multiple choice */}
                <Button
                  variant={userAnswer === 'call' ? 'contained' : 'outlined'}
                  onClick={() => handleQuizAnswer(activeStep.id, 'call')}
                  sx={{ mr: 1, mb: 1 }}
                >
                  Call Option
                </Button>
                <Button
                  variant={userAnswer === 'put' ? 'contained' : 'outlined'}
                  onClick={() => handleQuizAnswer(activeStep.id, 'put')}
                  sx={{ mr: 1, mb: 1 }}
                >
                  Put Option
                </Button>
              </Box>

              {userAnswer && (
                <Alert 
                  severity={userAnswer === activeStep.validation.correctAnswer ? 'success' : 'error'}
                  sx={{ mt: 2 }}
                >
                  {userAnswer === activeStep.validation.correctAnswer 
                    ? activeStep.validation.feedback.correct
                    : activeStep.validation.feedback.incorrect
                  }
                </Alert>
              )}
            </Box>
          )}

          {activeStep.hints && (
            <Box className="hints-section">
              <Button
                startIcon={<HintIcon />}
                onClick={() => toggleHints(activeStep.id)}
                sx={{ mt: 2 }}
              >
                {showHint ? 'Hide Hints' : 'Show Hints'}
              </Button>
              
              {showHint && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {activeStep.hints.join(' ')}
                </Alert>
              )}
            </Box>
          )}
        </Paper>

        <Box className="step-navigation">
          <Button
            onClick={previousStep}
            disabled={currentStepIndex === 0}
            sx={{ mr: 2 }}
          >
            Previous
          </Button>
          
          <Button
            variant="contained"
            onClick={nextStep}
            disabled={isQuiz && !userAnswer}
          >
            {currentStepIndex === activeTutorial.steps.length - 1 ? 'Complete Tutorial' : 'Next Step'}
          </Button>
        </Box>
      </Box>
    );
  };

  // Render celebration dialog
  const renderCelebration = () => (
    <Dialog open={showCelebration} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box textAlign="center">
          <CheckIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4">Congratulations!</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box textAlign="center">
          <Typography variant="h6" gutterBottom>
            You completed: {activeTutorial?.title}
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            You earned {activeTutorial?.completionReward} XP!
          </Typography>
          <Chip 
            label={`Level ${learningState.level}`} 
            color="primary" 
            size="large"
          />
        </Box>
      </DialogContent>
    </Dialog>
  );

  return (
    <Box className={`enhanced-tutorial-system ${compactMode ? 'compact' : ''}`}>
      {currentView === 'paths' && renderLearningPaths()}
      {currentView === 'tutorials' && renderTutorialsList()}
      {currentView === 'tutorial-detail' && renderTutorialDetail()}
      {currentView === 'step-detail' && renderStepDetail()}
      {renderCelebration()}
    </Box>
  );
};

export default EnhancedTutorialSystem;