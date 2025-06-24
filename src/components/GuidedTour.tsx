import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Paper,
  Fade,
  Backdrop,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Lightbulb as TipIcon
} from '@mui/icons-material';
import './GuidedTour.scss';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'click' | 'hover' | 'input' | 'wait';
    element?: string;
    value?: string;
    duration?: number;
  };
  validation?: () => boolean;
  tip?: string;
  optional?: boolean;
}

interface Tour {
  id: string;
  title: string;
  description: string;
  category: 'onboarding' | 'feature' | 'advanced';
  steps: TourStep[];
  prerequisites?: string[];
  estimatedTime: number; // minutes
}

interface GuidedTourProps {
  tours: Tour[];
  activeTour?: string;
  onTourComplete?: (tourId: string) => void;
  onTourSkip?: (tourId: string) => void;
  onClose?: () => void;
  autoStart?: boolean;
}

interface TooltipPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

const GuidedTour: React.FC<GuidedTourProps> = ({
  tours,
  activeTour,
  onTourComplete,
  onTourSkip,
  onClose,
  autoStart = false
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentTour, setCurrentTour] = useState<Tour | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Find and start tour
  const startTour = useCallback((tourId: string) => {
    const tour = tours.find(t => t.id === tourId);
    if (tour) {
      setCurrentTour(tour);
      setCurrentStep(0);
      setIsActive(true);
      setCompletedSteps(new Set());
      
      // Store tour progress
      localStorage.setItem('currentTour', tourId);
      localStorage.setItem('currentTourStep', '0');
    }
  }, [tours]);

  // Auto-start tour if specified
  useEffect(() => {
    if (autoStart && activeTour) {
      startTour(activeTour);
    }
  }, [autoStart, activeTour, startTour]);

  // Calculate tooltip position
  const calculateTooltipPosition = useCallback((element: HTMLElement, position: string = 'bottom'): TooltipPosition => {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    let top = rect.top + scrollTop;
    let left = rect.left + scrollLeft;

    switch (position) {
      case 'top':
        top = rect.top + scrollTop - 10;
        left = rect.left + scrollLeft + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + scrollTop + 10;
        left = rect.left + scrollLeft + rect.width / 2;
        break;
      case 'left':
        top = rect.top + scrollTop + rect.height / 2;
        left = rect.left + scrollLeft - 10;
        break;
      case 'right':
        top = rect.top + scrollTop + rect.height / 2;
        left = rect.right + scrollLeft + 10;
        break;
      case 'center':
        top = window.innerHeight / 2;
        left = window.innerWidth / 2;
        break;
    }

    return {
      top,
      left,
      width: rect.width,
      height: rect.height
    };
  }, []);

  // Highlight element
  const highlightElement = useCallback((selector: string, position: string = 'bottom') => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      setHighlightedElement(element);
      const pos = calculateTooltipPosition(element, position);
      setTooltipPosition(pos);
      
      // Scroll element into view
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });

      // Add highlight class
      element.classList.add('tour-highlight');
      
      return true;
    }
    return false;
  }, [calculateTooltipPosition]);

  // Remove highlight
  const removeHighlight = useCallback(() => {
    if (highlightedElement) {
      highlightedElement.classList.remove('tour-highlight');
      setHighlightedElement(null);
    }
    setTooltipPosition(null);
    setShowTooltip(false);
  }, [highlightedElement]);

  // Execute step action
  const executeStepAction = useCallback(async (step: TourStep) => {
    if (!step.action) return true;

    const { type, element, value, duration = 1000 } = step.action;

    switch (type) {
      case 'click':
        if (element) {
          const el = document.querySelector(element) as HTMLElement;
          if (el) {
            el.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        break;

      case 'hover':
        if (element) {
          const el = document.querySelector(element) as HTMLElement;
          if (el) {
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, duration));
          }
        }
        break;

      case 'input':
        if (element && value) {
          const el = document.querySelector(element) as HTMLInputElement;
          if (el) {
            el.focus();
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        break;

      case 'wait':
        setIsWaiting(true);
        await new Promise(resolve => setTimeout(resolve, duration));
        setIsWaiting(false);
        break;
    }

    return true;
  }, []);

  // Validate step completion
  const validateStep = useCallback((step: TourStep): boolean => {
    if (step.validation) {
      return step.validation();
    }
    return true;
  }, []);

  // Go to next step
  const nextStep = useCallback(async () => {
    if (!currentTour) return;

    const step = currentTour.steps[currentStep];
    
    // Execute step action if present
    if (step.action) {
      await executeStepAction(step);
    }

    // Validate step if required
    if (!step.optional && !validateStep(step)) {
      return;
    }

    // Mark step as completed
    setCompletedSteps(prev => new Set([...prev, step.id]));

    // Move to next step or complete tour
    if (currentStep < currentTour.steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      localStorage.setItem('currentTourStep', nextStepIndex.toString());
      
      // Highlight next element
      const nextStepData = currentTour.steps[nextStepIndex];
      if (nextStepData.target) {
        setTimeout(() => {
          const success = highlightElement(nextStepData.target!, nextStepData.position);
          setShowTooltip(success);
        }, 300);
      } else {
        setShowTooltip(true);
      }
    } else {
      completeTour();
    }
  }, [currentTour, currentStep, executeStepAction, validateStep, highlightElement]);

  // Go to previous step
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      localStorage.setItem('currentTourStep', prevStepIndex.toString());
      
      // Highlight previous element
      const prevStepData = currentTour!.steps[prevStepIndex];
      if (prevStepData.target) {
        setTimeout(() => {
          const success = highlightElement(prevStepData.target!, prevStepData.position);
          setShowTooltip(success);
        }, 300);
      } else {
        setShowTooltip(true);
      }
    }
  }, [currentStep, currentTour, highlightElement]);

  // Complete tour
  const completeTour = useCallback(() => {
    if (currentTour) {
      removeHighlight();
      setIsActive(false);
      localStorage.removeItem('currentTour');
      localStorage.removeItem('currentTourStep');
      
      if (onTourComplete) {
        onTourComplete(currentTour.id);
      }
    }
  }, [currentTour, removeHighlight, onTourComplete]);

  // Skip tour
  const skipTour = useCallback(() => {
    if (currentTour) {
      removeHighlight();
      setIsActive(false);
      localStorage.removeItem('currentTour');
      localStorage.removeItem('currentTourStep');
      
      if (onTourSkip) {
        onTourSkip(currentTour.id);
      }
    }
  }, [currentTour, removeHighlight, onTourSkip]);

  // Close tour
  const closeTour = useCallback(() => {
    removeHighlight();
    setIsActive(false);
    if (onClose) {
      onClose();
    }
  }, [removeHighlight, onClose]);

  // Initialize current step
  useEffect(() => {
    if (currentTour && isActive) {
      const step = currentTour.steps[currentStep];
      if (step.target) {
        setTimeout(() => {
          const success = highlightElement(step.target!, step.position);
          setShowTooltip(success);
        }, 500);
      } else {
        setShowTooltip(true);
      }
    }
  }, [currentTour, currentStep, isActive, highlightElement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      removeHighlight();
    };
  }, [removeHighlight]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (highlightedElement && tooltipPosition) {
        const step = currentTour?.steps[currentStep];
        if (step?.target) {
          const pos = calculateTooltipPosition(highlightedElement, step.position);
          setTooltipPosition(pos);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [highlightedElement, tooltipPosition, currentTour, currentStep, calculateTooltipPosition]);

  if (!isActive || !currentTour) {
    return null;
  }

  const step = currentTour.steps[currentStep];
  const progress = ((currentStep + 1) / currentTour.steps.length) * 100;

  return (
    <>
      {/* Backdrop Overlay */}
      <Backdrop
        open={isActive}
        className="tour-backdrop"
        style={{ zIndex: 9999 }}
      >
        <div ref={overlayRef} className="tour-overlay" />
      </Backdrop>

      {/* Tooltip */}
      {showTooltip && tooltipPosition && (
        <Fade in={showTooltip}>
          <Paper
            ref={tooltipRef}
            className={`tour-tooltip ${step.position || 'bottom'} ${isMobile ? 'mobile' : ''}`}
            style={{
              position: 'absolute',
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              zIndex: 10000,
              transform: step.position === 'center' ? 'translate(-50%, -50%)' : undefined
            }}
            elevation={8}
          >
            {/* Header */}
            <div className="tour-tooltip-header">
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" className="tour-step-title">
                  {step.title}
                </Typography>
                <IconButton
                  size="small"
                  onClick={closeTour}
                  className="tour-close-button"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              
              {/* Progress */}
              <Box display="flex" alignItems="center" mt={1}>
                <Typography variant="caption" className="tour-progress-text">
                  Step {currentStep + 1} of {currentTour.steps.length}
                </Typography>
                <Box flexGrow={1} mx={2}>
                  <div className="tour-progress-bar">
                    <div 
                      className="tour-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </Box>
                <Typography variant="caption">
                  {Math.round(progress)}%
                </Typography>
              </Box>
            </div>

            {/* Content */}
            <div className="tour-tooltip-content">
              <Typography variant="body1" paragraph>
                {step.content}
              </Typography>

              {/* Tip */}
              {step.tip && (
                <Box display="flex" alignItems="flex-start" className="tour-tip">
                  <TipIcon className="tour-tip-icon" />
                  <Typography variant="body2" className="tour-tip-text">
                    {step.tip}
                  </Typography>
                </Box>
              )}

              {/* Waiting indicator */}
              {isWaiting && (
                <Box display="flex" alignItems="center" justifyContent="center" py={2}>
                  <div className="tour-spinner" />
                  <Typography variant="body2" ml={1}>
                    Please wait...
                  </Typography>
                </Box>
              )}
            </div>

            {/* Actions */}
            <div className="tour-tooltip-actions">
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Button
                  variant="text"
                  onClick={skipTour}
                  className="tour-skip-button"
                >
                  Skip Tour
                </Button>

                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    onClick={previousStep}
                    disabled={currentStep === 0}
                    startIcon={<BackIcon />}
                    className="tour-prev-button"
                  >
                    Previous
                  </Button>
                  
                  <Button
                    variant="contained"
                    onClick={nextStep}
                    disabled={isWaiting}
                    endIcon={currentStep === currentTour.steps.length - 1 ? <CompleteIcon /> : <NextIcon />}
                    className="tour-next-button"
                  >
                    {currentStep === currentTour.steps.length - 1 ? 'Complete' : 'Next'}
                  </Button>
                </Box>
              </Box>
            </div>
          </Paper>
        </Fade>
      )}

      {/* Mobile overlay for center positioned tooltips */}
      {isMobile && step.position === 'center' && (
        <Dialog
          open={showTooltip}
          onClose={closeTour}
          maxWidth="sm"
          fullWidth
          className="tour-mobile-dialog"
        >
          <DialogContent>
            <Box textAlign="center" mb={2}>
              <Typography variant="h6" gutterBottom>
                {step.title}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Step {currentStep + 1} of {currentTour.steps.length}
              </Typography>
            </Box>
            
            <Typography variant="body1" paragraph>
              {step.content}
            </Typography>

            {step.tip && (
              <Box display="flex" alignItems="flex-start" className="tour-tip" mb={2}>
                <TipIcon className="tour-tip-icon" />
                <Typography variant="body2" className="tour-tip-text">
                  {step.tip}
                </Typography>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={skipTour}>Skip</Button>
            <Button onClick={previousStep} disabled={currentStep === 0}>
              Previous
            </Button>
            <Button onClick={nextStep} variant="contained">
              {currentStep === currentTour.steps.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default GuidedTour;