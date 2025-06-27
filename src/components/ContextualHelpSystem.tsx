import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Tooltip,
  Popover,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fab,
  Zoom,
  Paper
} from '@mui/material';
import {
  Help as HelpIcon,
  Close as CloseIcon,
  Lightbulb as TipIcon,
  School as LearnIcon,
  Quiz as QuizIcon,
  PlayArrow as DemoIcon,
  Bookmark as BookmarkIcon
} from '@mui/icons-material';
import { contextualHelp, ContextualHelp } from '../data/tutorialContent';
import './ContextualHelpSystem.scss';

interface ContextualHelpSystemProps {
  enabled?: boolean;
  showFloatingHelp?: boolean;
  onHelpRequest?: (topic: string) => void;
}

interface ActiveHelp {
  help: ContextualHelp;
  element: Element;
  position: { x: number; y: number };
}

interface HelpTooltipProps {
  help: ContextualHelp;
  anchorEl: Element | null;
  open: boolean;
  onClose: () => void;
}

// Individual help tooltip component
const HelpTooltip: React.FC<HelpTooltipProps> = ({ help, anchorEl, open, onClose }) => {
  if (help.type === 'tooltip') {
    return (
      <Tooltip
        title={
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {help.title}
            </Typography>
            <Typography variant="body2">
              {help.content}
            </Typography>
          </Box>
        }
        open={open}
        onClose={onClose}
        placement={help.position || 'top'}
        arrow
        PopperProps={{
          anchorEl: anchorEl,
          className: 'contextual-help-tooltip'
        }}
      >
        <span />
      </Tooltip>
    );
  }

  if (help.type === 'popover') {
    return (
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{
          vertical: help.position === 'top' ? 'top' : help.position === 'bottom' ? 'bottom' : 'center',
          horizontal: help.position === 'left' ? 'left' : help.position === 'right' ? 'right' : 'center',
        }}
        transformOrigin={{
          vertical: help.position === 'bottom' ? 'top' : help.position === 'top' ? 'bottom' : 'center',
          horizontal: help.position === 'right' ? 'left' : help.position === 'left' ? 'right' : 'center',
        }}
        className="contextual-help-popover"
      >
        <Paper className="help-popover-content">
          <Box className="help-header">
            <Typography variant="h6">
              {help.title}
            </Typography>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" paragraph>
            {help.content}
          </Typography>
          <Box className="help-actions">
            <Button size="small" startIcon={<LearnIcon />}>
              Learn More
            </Button>
            <Button size="small" startIcon={<BookmarkIcon />}>
              Bookmark
            </Button>
          </Box>
        </Paper>
      </Popover>
    );
  }

  return null;
};

// Main contextual help system component
const ContextualHelpSystem: React.FC<ContextualHelpSystemProps> = ({
  enabled = true,
  showFloatingHelp = true,
  onHelpRequest
}) => {
  const [activeHelp, setActiveHelp] = useState<ActiveHelp | null>(null);
  const [helpMode, setHelpMode] = useState(false);
  const [discoveredHelp, setDiscoveredHelp] = useState<Set<string>>(new Set());
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const helpElementsRef = useRef<Map<string, Element>>(new Map());

  // Initialize help system
  useEffect(() => {
    if (!enabled) return;

    // Set up mutation observer to watch for new elements
    observerRef.current = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scanForHelpElements(node as Element);
          }
        });
      });
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial scan
    scanForHelpElements(document.body);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [enabled]);

  // Scan for elements that have contextual help
  const scanForHelpElements = useCallback((root: Element) => {
    contextualHelp.forEach((help) => {
      const elements = root.querySelectorAll(help.trigger);
      elements.forEach((element) => {
        if (!helpElementsRef.current.has(help.id)) {
          helpElementsRef.current.set(help.id, element);
          
          // Add help indicator
          addHelpIndicator(element, help);
          
          // Add event listeners
          if (help.type === 'tooltip') {
            element.addEventListener('mouseenter', () => showHelp(help, element));
            element.addEventListener('mouseleave', () => hideHelp());
          } else {
            element.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              showHelp(help, element);
            });
          }
        }
      });
    });
  }, []);

  // Add visual help indicator to elements
  const addHelpIndicator = useCallback((element: Element, help: ContextualHelp) => {
    if (element.querySelector('.help-indicator')) return;

    const indicator = document.createElement('div');
    indicator.className = 'help-indicator';
    indicator.innerHTML = '?';
    indicator.title = `Help: ${help.title}`;
    
    // Position the indicator
    const rect = element.getBoundingClientRect();
    indicator.style.position = 'absolute';
    indicator.style.top = '2px';
    indicator.style.right = '2px';
    indicator.style.width = '16px';
    indicator.style.height = '16px';
    indicator.style.borderRadius = '50%';
    indicator.style.background = '#4ade80';
    indicator.style.color = 'white';
    indicator.style.fontSize = '10px';
    indicator.style.display = 'flex';
    indicator.style.alignItems = 'center';
    indicator.style.justifyContent = 'center';
    indicator.style.cursor = 'pointer';
    indicator.style.zIndex = '1000';
    indicator.style.opacity = helpMode ? '1' : '0.7';
    indicator.style.transition = 'opacity 0.2s ease';

    // Make parent relative if needed
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.position === 'static') {
      (element as HTMLElement).style.position = 'relative';
    }

    element.appendChild(indicator);

    // Add click handler to indicator
    indicator.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showHelp(help, element);
    });
  }, [helpMode]);

  // Show contextual help
  const showHelp = useCallback((help: ContextualHelp, element: Element) => {
    const rect = element.getBoundingClientRect();
    setActiveHelp({
      help,
      element,
      position: { x: rect.left + rect.width / 2, y: rect.top }
    });

    // Mark as discovered
    setDiscoveredHelp(prev => new Set([...prev, help.id]));

    // Track help usage
    onHelpRequest?.(help.id);
  }, [onHelpRequest]);

  // Hide contextual help
  const hideHelp = useCallback(() => {
    setActiveHelp(null);
  }, []);

  // Toggle help mode
  const toggleHelpMode = useCallback(() => {
    setHelpMode(prev => {
      const newMode = !prev;
      
      // Update indicator visibility
      document.querySelectorAll('.help-indicator').forEach((indicator) => {
        (indicator as HTMLElement).style.opacity = newMode ? '1' : '0.7';
      });

      return newMode;
    });
  }, []);

  // Show all available help
  const showAllHelp = useCallback(() => {
    setShowHelpDialog(true);
  }, []);

  // Render help dialog with all available help topics
  const renderHelpDialog = () => (
    <Dialog
      open={showHelpDialog}
      onClose={() => setShowHelpDialog(false)}
      maxWidth="md"
      fullWidth
      className="contextual-help-dialog"
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            <HelpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Available Help Topics
          </Typography>
          <IconButton onClick={() => setShowHelpDialog(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" paragraph>
          Click on any topic to learn more about that feature.
        </Typography>
        
        <List>
          {contextualHelp.map((help) => {
            const isDiscovered = discoveredHelp.has(help.id);
            const element = helpElementsRef.current.get(help.id);
            
            return (
              <ListItem
                key={help.id}
                button
                onClick={() => {
                  if (element) {
                    showHelp(help, element);
                    setShowHelpDialog(false);
                  }
                }}
                className={isDiscovered ? 'discovered' : 'undiscovered'}
              >
                <ListItemIcon>
                  {help.type === 'tooltip' ? <TipIcon /> : 
                   help.type === 'popover' ? <HelpIcon /> : <QuizIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={help.title}
                  secondary={help.content.substring(0, 100) + '...'}
                />
                {isDiscovered && (
                  <Chip label="Discovered" size="small" color="primary" />
                )}
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowHelpDialog(false)}>
          Close
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            setHelpMode(true);
            setShowHelpDialog(false);
          }}
        >
          Enable Help Mode
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render floating help button
  const renderFloatingHelp = () => {
    if (!showFloatingHelp) return null;

    return (
      <Box className="floating-help-controls">
        <Zoom in={helpMode}>
          <Fab
            size="small"
            color="secondary"
            onClick={showAllHelp}
            sx={{ mr: 1, mb: 1 }}
          >
            <HelpIcon />
          </Fab>
        </Zoom>
        
        <Fab
          color={helpMode ? "primary" : "default"}
          onClick={toggleHelpMode}
          className={`help-mode-toggle ${helpMode ? 'active' : ''}`}
        >
          <TipIcon />
        </Fab>
      </Box>
    );
  };

  return (
    <Box className="contextual-help-system">
      {/* Active help tooltip/popover */}
      {activeHelp && (
        <HelpTooltip
          help={activeHelp.help}
          anchorEl={activeHelp.element}
          open={true}
          onClose={hideHelp}
        />
      )}

      {/* Floating help controls */}
      {renderFloatingHelp()}

      {/* Help dialog */}
      {renderHelpDialog()}

      {/* Help mode indicator */}
      {helpMode && (
        <Box className="help-mode-indicator">
          <Paper elevation={3}>
            <Typography variant="caption">
              <TipIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Help Mode Active - Click ? icons for help
            </Typography>
            <IconButton size="small" onClick={toggleHelpMode}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default ContextualHelpSystem;