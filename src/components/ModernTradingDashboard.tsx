import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Badge,
  Tooltip,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Snackbar,
  LinearProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Analytics as AnalyticsIcon,
  AccountBalance as PortfolioIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  PlayArrow as PlayIcon,
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Lightbulb as TipIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

// Import existing components
import PortfolioSummary from './PortfolioSummary';
import RealTimePLMonitor from './RealTimePLMonitor';
import AdvancedMarketChart from './AdvancedMarketChart';
import StrategyBuilder from './StrategyBuilder';
import EnhancedEducationalPanel from './EnhancedEducationalPanel';
import MarketDataPanel from './MarketDataPanel';
import RiskDashboard from './RiskDashboard';
import InteractiveTutorialSystem from './InteractiveTutorialSystem';
import LearningProgressTracker from './LearningProgressTracker';

// Import styles
import './ModernTradingDashboard.scss';

type ViewMode = 'dashboard' | 'trading' | 'learning' | 'analysis' | 'portfolio';

interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  action?: string;
  optional?: boolean;
}

interface UserGuide {
  id: string;
  title: string;
  description: string;
  steps: OnboardingStep[];
  category: 'getting-started' | 'trading' | 'learning' | 'advanced';
}

interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const ModernTradingDashboard: React.FC = () => {
  // State management
  const [activeView, setActiveView] = useState<ViewMode>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [activeGuide, setActiveGuide] = useState<UserGuide | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userProgress, setUserProgress] = useState({
    hasCompletedOnboarding: false,
    hasCreatedFirstTrade: false,
    hasCompletedTutorial: false,
    currentLevel: 1,
    totalXP: 0
  });

  // Redux state
  const portfolio = useAppSelector(state => state.portfolio);
  const marketData = useAppSelector(state => state.marketData);
  const learning = useAppSelector(state => state.learning);
  const dispatch = useAppDispatch();

  // Check if user is new and should see onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding && portfolio.positions.length === 0) {
      setShowOnboarding(true);
    }
  }, [portfolio.positions.length]);

  // Navigation items
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      view: 'dashboard' as ViewMode,
      description: 'Overview of your portfolio and market'
    },
    {
      id: 'trading',
      label: 'Trading',
      icon: <TrendingUpIcon />,
      view: 'trading' as ViewMode,
      description: 'Execute trades and build strategies'
    },
    {
      id: 'learning',
      label: 'Learning',
      icon: <SchoolIcon />,
      view: 'learning' as ViewMode,
      description: 'Interactive tutorials and education',
      badge: learning.availableMissions?.length || 0
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: <AnalyticsIcon />,
      view: 'analysis' as ViewMode,
      description: 'Risk analysis and market insights'
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      icon: <PortfolioIcon />,
      view: 'portfolio' as ViewMode,
      description: 'Detailed portfolio management'
    }
  ];

  // Onboarding steps
  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Options Tutor!',
      content: 'Options Tutor is your comprehensive platform for learning and practicing options trading. Let\'s take a quick tour to get you started.',
      action: 'Get Started'
    },
    {
      id: 'navigation',
      title: 'Navigation',
      content: 'Use the sidebar to navigate between different sections: Dashboard, Trading, Learning, Analysis, and Portfolio.',
      target: '.sidebar',
      action: 'Next'
    },
    {
      id: 'learning',
      title: 'Start Learning',
      content: 'Begin with our interactive tutorials to understand options trading fundamentals. Click on Learning to access courses.',
      target: '[data-tour="learning"]',
      action: 'Take Me There'
    },
    {
      id: 'trading',
      title: 'Practice Trading',
      content: 'Once you\'ve learned the basics, practice with our trading simulator using virtual money.',
      target: '[data-tour="trading"]',
      action: 'Explore Trading'
    },
    {
      id: 'complete',
      title: 'You\'re Ready!',
      content: 'You\'re all set to start your options trading journey. Remember, you can always access help and tutorials anytime.',
      action: 'Start Trading'
    }
  ];

  // User guides
  const userGuides: UserGuide[] = [
    {
      id: 'first-trade',
      title: 'Execute Your First Trade',
      description: 'Learn how to place your first options trade',
      category: 'getting-started',
      steps: [
        {
          id: 'select-symbol',
          title: 'Select a Symbol',
          content: 'Choose a stock symbol to trade options on',
          target: '.symbol-selector'
        },
        {
          id: 'choose-strategy',
          title: 'Choose Strategy',
          content: 'Select an options strategy that fits your market outlook',
          target: '.strategy-builder'
        },
        {
          id: 'review-trade',
          title: 'Review Trade',
          content: 'Review your trade details and risk before executing',
          target: '.trade-review'
        },
        {
          id: 'execute',
          title: 'Execute Trade',
          content: 'Click execute to place your simulated trade',
          target: '.execute-button'
        }
      ]
    },
    {
      id: 'risk-management',
      title: 'Understanding Risk Management',
      description: 'Learn how to manage risk in options trading',
      category: 'trading',
      steps: [
        {
          id: 'risk-metrics',
          title: 'Risk Metrics',
          content: 'Understand key risk metrics like Delta, Gamma, Theta, and Vega',
          target: '.risk-metrics'
        },
        {
          id: 'position-sizing',
          title: 'Position Sizing',
          content: 'Learn how to size your positions appropriately',
          target: '.position-sizing'
        },
        {
          id: 'stop-losses',
          title: 'Stop Losses',
          content: 'Set up stop losses to limit your downside risk',
          target: '.stop-loss'
        }
      ]
    }
  ];

  // Handle view change
  const handleViewChange = useCallback((view: ViewMode) => {
    setActiveView(view);
    setSidebarOpen(false);
    
    // Track user progress
    if (view === 'learning' && !userProgress.hasCompletedTutorial) {
      addNotification({
        type: 'info',
        title: 'Learning Mode',
        message: 'Great choice! Start with the basics to build a strong foundation.',
        action: {
          label: 'Start Tutorial',
          onClick: () => setShowUserGuide(true)
        }
      });
    }
  }, [userProgress.hasCompletedTutorial]);

  // Add notification
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString(),
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  // Complete onboarding
  const completeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
    setUserProgress(prev => ({ ...prev, hasCompletedOnboarding: true }));
    addNotification({
      type: 'success',
      title: 'Welcome aboard!',
      message: 'You\'ve completed the onboarding. Ready to start learning?',
      action: {
        label: 'Start Learning',
        onClick: () => handleViewChange('learning')
      }
    });
  }, [addNotification, handleViewChange]);

  // Start user guide
  const startUserGuide = useCallback((guide: UserGuide) => {
    setActiveGuide(guide);
    setShowUserGuide(true);
    setCurrentOnboardingStep(0);
  }, []);

  // Render main content based on active view
  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="dashboard-overview">
            <Grid container spacing={3}>
              {/* Quick Stats */}
              <Grid item xs={12}>
                <Paper className="stats-overview" elevation={2}>
                  <Typography variant="h6" gutterBottom>
                    Portfolio Overview
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Card className="stat-card">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom>
                            Total Value
                          </Typography>
                          <Typography variant="h5">
                            ${(portfolio.cashBalance + portfolio.unrealizedPL).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color={portfolio.unrealizedPL >= 0 ? 'success.main' : 'error.main'}>
                            {portfolio.unrealizedPL >= 0 ? '+' : ''}${portfolio.unrealizedPL.toFixed(2)} today
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={3}>
                      <Card className="stat-card">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom>
                            Active Positions
                          </Typography>
                          <Typography variant="h5">
                            {portfolio.positions.length}
                          </Typography>
                          <Typography variant="body2">
                            {portfolio.positions.filter(p => p.unrealizedPL > 0).length} profitable
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={3}>
                      <Card className="stat-card">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom>
                            Learning Progress
                          </Typography>
                          <Typography variant="h5">
                            Level {learning.level || 1}
                          </Typography>
                          <Typography variant="body2">
                            {learning.xp || 0} XP
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={3}>
                      <Card className="stat-card">
                        <CardContent>
                          <Typography color="textSecondary" gutterBottom>
                            Risk Level
                          </Typography>
                          <Typography variant="h5">
                            {portfolio.marginUsage < 30 ? 'Low' : portfolio.marginUsage < 70 ? 'Medium' : 'High'}
                          </Typography>
                          <Typography variant="body2">
                            {portfolio.marginUsage.toFixed(1)}% margin used
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Quick Actions */}
              <Grid item xs={12} md={6}>
                <Paper className="quick-actions" elevation={2}>
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PlayIcon />}
                        onClick={() => handleViewChange('learning')}
                        data-tour="learning"
                      >
                        Start Learning
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<TrendingUpIcon />}
                        onClick={() => handleViewChange('trading')}
                        data-tour="trading"
                      >
                        Start Trading
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<AnalyticsIcon />}
                        onClick={() => handleViewChange('analysis')}
                      >
                        View Analysis
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<HelpIcon />}
                        onClick={() => setShowUserGuide(true)}
                      >
                        Get Help
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Recent Activity */}
              <Grid item xs={12} md={6}>
                <Paper className="recent-activity" elevation={2}>
                  <Typography variant="h6" gutterBottom>
                    Recent Activity
                  </Typography>
                  {portfolio.positions.length === 0 ? (
                    <Box textAlign="center" py={3}>
                      <Typography color="textSecondary">
                        No trading activity yet
                      </Typography>
                      <Button
                        variant="text"
                        onClick={() => handleViewChange('learning')}
                        sx={{ mt: 1 }}
                      >
                        Start with tutorials
                      </Button>
                    </Box>
                  ) : (
                    <List>
                      {portfolio.positions.slice(0, 3).map((position, index) => (
                        <ListItem key={position.id}>
                          <ListItemText
                            primary={`${position.symbol} ${position.type}`}
                            secondary={`P&L: ${position.unrealizedPL >= 0 ? '+' : ''}$${position.unrealizedPL.toFixed(2)}`}
                          />
                          <Chip
                            label={position.unrealizedPL >= 0 ? 'Profit' : 'Loss'}
                            color={position.unrealizedPL >= 0 ? 'success' : 'error'}
                            size="small"
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </div>
        );

      case 'trading':
        return (
          <div className="trading-view">
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <Paper elevation={2} className="chart-container">
                  <AdvancedMarketChart 
                    symbol={selectedSymbol}
                    onSymbolChange={setSelectedSymbol}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} lg={4}>
                <Paper elevation={2} className="strategy-container">
                  <StrategyBuilder 
                    selectedSymbol={selectedSymbol}
                    onSymbolChange={setSelectedSymbol}
                  />
                </Paper>
              </Grid>
            </Grid>
          </div>
        );

      case 'learning':
        return (
          <div className="learning-view">
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper elevation={2}>
                  <EnhancedEducationalPanel 
                    currentStrategy={null}
                    selectedSymbol={selectedSymbol}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={2}>
                  <LearningProgressTracker />
                </Paper>
              </Grid>
            </Grid>
          </div>
        );

      case 'analysis':
        return (
          <div className="analysis-view">
            <Grid container spacing={3}>
              <Grid item xs={12} lg={6}>
                <Paper elevation={2}>
                  <RiskDashboard 
                    portfolio={portfolio}
                    marketData={marketData}
                    cashBalance={portfolio.cashBalance}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} lg={6}>
                <Paper elevation={2}>
                  <MarketDataPanel symbols={['AAPL', 'MSFT', 'GOOGL', 'TSLA']} />
                </Paper>
              </Grid>
            </Grid>
          </div>
        );

      case 'portfolio':
        return (
          <div className="portfolio-view">
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={2}>
                  <PortfolioSummary />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={2}>
                  <RealTimePLMonitor 
                    updateFrequency={5000}
                    showDetailedMetrics={true}
                  />
                </Paper>
              </Grid>
            </Grid>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modern-trading-dashboard">
      {/* Top App Bar */}
      <AppBar position="fixed" className="app-bar">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" className="app-title">
            Options Tutor
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* Market Status */}
          <Chip
            icon={<div className="status-dot active" />}
            label="Market Open"
            variant="outlined"
            size="small"
            className="market-status"
          />

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              onClick={() => setShowNotifications(true)}
            >
              <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Help */}
          <Tooltip title="Help & Guides">
            <IconButton
              color="inherit"
              onClick={() => setShowUserGuide(true)}
            >
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar Navigation */}
      <Drawer
        anchor="left"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        className="sidebar"
      >
        <div className="sidebar-content">
          <div className="sidebar-header">
            <Typography variant="h6">Navigation</Typography>
            <IconButton onClick={() => setSidebarOpen(false)}>
              <CloseIcon />
            </IconButton>
          </div>
          
          <List>
            {navigationItems.map((item) => (
              <Tooltip key={item.id} title={item.description} placement="right">
                <ListItem
                  button
                  selected={activeView === item.view}
                  onClick={() => handleViewChange(item.view)}
                  data-tour={item.id}
                >
                  <ListItemIcon>
                    <Badge badgeContent={item.badge} color="primary">
                      {item.icon}
                    </Badge>
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    secondary={item.description}
                  />
                </ListItem>
              </Tooltip>
            ))}
          </List>

          {/* User Progress */}
          <div className="user-progress">
            <Typography variant="subtitle2" gutterBottom>
              Your Progress
            </Typography>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="body2">Level {userProgress.currentLevel}</Typography>
              <Box sx={{ flexGrow: 1, mx: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(userProgress.totalXP % 1000) / 10} 
                />
              </Box>
              <Typography variant="caption">{userProgress.totalXP} XP</Typography>
            </Box>
          </div>
        </div>
      </Drawer>

      {/* Main Content */}
      <main className="main-content">
        {renderMainContent()}
      </main>

      {/* Onboarding Dialog */}
      <Dialog
        open={showOnboarding}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>
          Welcome to Options Tutor
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={currentOnboardingStep} orientation="vertical">
            {onboardingSteps.map((step, index) => (
              <Step key={step.id}>
                <StepLabel>{step.title}</StepLabel>
                <StepContent>
                  <Typography paragraph>
                    {step.content}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => {
                        if (index === onboardingSteps.length - 1) {
                          completeOnboarding();
                        } else {
                          setCurrentOnboardingStep(index + 1);
                        }
                      }}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      {step.action || 'Next'}
                    </Button>
                    {index > 0 && (
                      <Button
                        onClick={() => setCurrentOnboardingStep(index - 1)}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Back
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
      </Dialog>

      {/* User Guide Dialog */}
      <Dialog
        open={showUserGuide}
        onClose={() => setShowUserGuide(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          User Guides & Help
        </DialogTitle>
        <DialogContent>
          {!activeGuide ? (
            <Grid container spacing={2}>
              {userGuides.map((guide) => (
                <Grid item xs={12} md={6} key={guide.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {guide.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {guide.description}
                      </Typography>
                      <Chip 
                        label={guide.category} 
                        size="small" 
                        variant="outlined"
                      />
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        onClick={() => startUserGuide(guide)}
                      >
                        Start Guide
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <div>
              <Typography variant="h6" gutterBottom>
                {activeGuide.title}
              </Typography>
              <Stepper activeStep={currentOnboardingStep}>
                {activeGuide.steps.map((step) => (
                  <Step key={step.id}>
                    <StepLabel>{step.title}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              <Box mt={2}>
                <Typography paragraph>
                  {activeGuide.steps[currentOnboardingStep]?.content}
                </Typography>
              </Box>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          {activeGuide && (
            <>
              <Button 
                onClick={() => setCurrentOnboardingStep(Math.max(0, currentOnboardingStep - 1))}
                disabled={currentOnboardingStep === 0}
              >
                Previous
              </Button>
              <Button 
                onClick={() => {
                  if (currentOnboardingStep < activeGuide.steps.length - 1) {
                    setCurrentOnboardingStep(currentOnboardingStep + 1);
                  } else {
                    setActiveGuide(null);
                    setCurrentOnboardingStep(0);
                  }
                }}
                variant="contained"
              >
                {currentOnboardingStep < activeGuide.steps.length - 1 ? 'Next' : 'Complete'}
              </Button>
            </>
          )}
          <Button onClick={() => {
            setShowUserGuide(false);
            setActiveGuide(null);
            setCurrentOnboardingStep(0);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications Drawer */}
      <Drawer
        anchor="right"
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
      >
        <div className="notifications-panel">
          <div className="notifications-header">
            <Typography variant="h6">Notifications</Typography>
            <IconButton onClick={() => setShowNotifications(false)}>
              <CloseIcon />
            </IconButton>
          </div>
          <List>
            {notifications.length === 0 ? (
              <ListItem>
                <ListItemText primary="No notifications" />
              </ListItem>
            ) : (
              notifications.map((notification) => (
                <ListItem key={notification.id} className={`notification-item ${notification.type}`}>
                  <ListItemText
                    primary={notification.title}
                    secondary={notification.message}
                  />
                  {notification.action && (
                    <Button
                      size="small"
                      onClick={notification.action.onClick}
                    >
                      {notification.action.label}
                    </Button>
                  )}
                </ListItem>
              ))
            )}
          </List>
        </div>
      </Drawer>

      {/* Floating Action Button for Quick Help */}
      <Fab
        color="primary"
        className="help-fab"
        onClick={() => setShowUserGuide(true)}
      >
        <TipIcon />
      </Fab>
    </div>
  );
};

export default ModernTradingDashboard;