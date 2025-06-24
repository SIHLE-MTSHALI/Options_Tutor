import React, { useState, useRef, useEffect } from 'react';
import {
  Tooltip,
  TooltipProps,
  Fade,
  Paper,
  Typography,
  Box,
  IconButton,
  Button,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Help as HelpIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Lightbulb as TipIcon,
  Close as CloseIcon,
  PlayArrow as DemoIcon
} from '@mui/icons-material';
import './SmartTooltip.scss';

interface SmartTooltipContent {
  title?: string;
  description: string;
  type?: 'info' | 'help' | 'warning' | 'error' | 'success' | 'tip';
  category?: 'basic' | 'intermediate' | 'advanced';
  relatedTopics?: string[];
  demoAction?: () => void;
  learnMoreUrl?: string;
  shortcut?: string;
  examples?: string[];
}

interface SmartTooltipProps extends Omit<TooltipProps, 'title' | 'children'> {
  content: SmartTooltipContent | string;
  children: React.ReactElement;
  interactive?: boolean;
  showIcon?: boolean;
  iconType?: 'help' | 'info' | 'warning' | 'error' | 'success' | 'tip';
  maxWidth?: number;
  persistent?: boolean;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onClose?: () => void;
  onLearnMore?: (topic: string) => void;
  onDemo?: () => void;
}

const SmartTooltip: React.FC<SmartTooltipProps> = ({
  content,
  children,
  interactive = false,
  showIcon = false,
  iconType = 'help',
  maxWidth = 350,
  persistent = false,
  delay = 500,
  position = 'top',
  onClose,
  onLearnMore,
  onDemo,
  ...tooltipProps
}) => {
  const [open, setOpen] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Handle simple string content
  if (typeof content === 'string') {
    return (
      <Tooltip
        title={content}
        placement={position}
        enterDelay={delay}
        {...tooltipProps}
      >
        {children}
      </Tooltip>
    );
  }

  const {
    title,
    description,
    type = 'info',
    category = 'basic',
    relatedTopics = [],
    demoAction,
    learnMoreUrl,
    shortcut,
    examples = []
  } = content;

  // Get icon based on type
  const getIcon = () => {
    switch (type) {
      case 'help':
        return <HelpIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'success':
        return <SuccessIcon />;
      case 'tip':
        return <TipIcon />;
      default:
        return <InfoIcon />;
    }
  };

  // Get category color
  const getCategoryColor = () => {
    switch (category) {
      case 'basic':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'error';
      default:
        return 'default';
    }
  };

  // Handle tooltip open
  const handleOpen = () => {
    setOpen(true);
    setUserInteracted(true);
  };

  // Handle tooltip close
  const handleClose = () => {
    setOpen(false);
    if (onClose) {
      onClose();
    }
  };

  // Handle learn more
  const handleLearnMore = (topic: string) => {
    if (onLearnMore) {
      onLearnMore(topic);
    } else if (learnMoreUrl) {
      window.open(learnMoreUrl, '_blank');
    }
  };

  // Handle demo
  const handleDemo = () => {
    if (onDemo) {
      onDemo();
    } else if (demoAction) {
      demoAction();
    }
  };

  // Custom tooltip content
  const tooltipContent = (
    <div className={`smart-tooltip-content ${type} ${category}`}>
      {/* Header */}
      {title && (
        <div className="tooltip-header">
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <div className={`tooltip-icon ${type}`}>
                {getIcon()}
              </div>
              <Typography variant="subtitle2" className="tooltip-title">
                {title}
              </Typography>
              <Chip
                label={category}
                size="small"
                color={getCategoryColor() as any}
                variant="outlined"
                className="category-chip"
              />
            </Box>
            {interactive && (
              <IconButton
                size="small"
                onClick={handleClose}
                className="close-button"
              >
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </div>
      )}

      {/* Main content */}
      <div className="tooltip-body">
        <Typography variant="body2" className="tooltip-description">
          {description}
        </Typography>

        {/* Keyboard shortcut */}
        {shortcut && (
          <Box mt={1} display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="textSecondary">
              Shortcut:
            </Typography>
            <Chip
              label={shortcut}
              size="small"
              variant="outlined"
              className="shortcut-chip"
            />
          </Box>
        )}

        {/* Examples */}
        {examples.length > 0 && (
          <Box mt={1}>
            <Typography variant="caption" color="textSecondary" gutterBottom>
              Examples:
            </Typography>
            <ul className="examples-list">
              {examples.map((example, index) => (
                <li key={index}>
                  <Typography variant="caption">
                    {example}
                  </Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}

        {/* Related topics */}
        {relatedTopics.length > 0 && (
          <Box mt={1}>
            <Typography variant="caption" color="textSecondary" gutterBottom>
              Related:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {relatedTopics.map((topic, index) => (
                <Chip
                  key={index}
                  label={topic}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => handleLearnMore(topic)}
                  className="related-chip"
                />
              ))}
            </Box>
          </Box>
        )}
      </div>

      {/* Actions */}
      {(demoAction || onDemo || learnMoreUrl || onLearnMore) && (
        <div className="tooltip-actions">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {(demoAction || onDemo) && (
              <Button
                size="small"
                startIcon={<DemoIcon />}
                onClick={handleDemo}
                className="demo-button"
              >
                Show Demo
              </Button>
            )}
            {(learnMoreUrl || onLearnMore) && (
              <Button
                size="small"
                onClick={() => handleLearnMore(title || 'topic')}
                className="learn-more-button"
              >
                Learn More
              </Button>
            )}
          </Box>
        </div>
      )}
    </div>
  );

  // For mobile, use a different approach
  if (isMobile && interactive) {
    return (
      <>
        <div onClick={handleOpen}>
          {children}
        </div>
        {/* Mobile modal would go here */}
      </>
    );
  }

  return (
    <Tooltip
      title={tooltipContent}
      placement={position}
      open={persistent ? open : undefined}
      onOpen={handleOpen}
      onClose={handleClose}
      interactive={interactive}
      enterDelay={delay}
      leaveDelay={interactive ? 300 : 200}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
      componentsProps={{
        tooltip: {
          className: `smart-tooltip ${type} ${interactive ? 'interactive' : ''}`,
          style: { maxWidth }
        },
        popper: {
          className: 'smart-tooltip-popper'
        }
      }}
      {...tooltipProps}
    >
      <span className="smart-tooltip-trigger">
        {children}
        {showIcon && (
          <div className={`smart-tooltip-indicator ${iconType}`}>
            {getIcon()}
          </div>
        )}
      </span>
    </Tooltip>
  );
};

// Helper component for creating help icons with tooltips
export const HelpTooltip: React.FC<{
  content: SmartTooltipContent;
  size?: 'small' | 'medium';
  className?: string;
}> = ({ content, size = 'small', className = '' }) => (
  <SmartTooltip content={content} interactive showIcon>
    <IconButton
      size={size}
      className={`help-tooltip-button ${className}`}
      aria-label="Help"
    >
      <HelpIcon />
    </IconButton>
  </SmartTooltip>
);

// Helper component for inline help text
export const InlineHelp: React.FC<{
  content: SmartTooltipContent;
  text?: string;
  variant?: 'text' | 'outlined' | 'contained';
}> = ({ content, text = 'Help', variant = 'text' }) => (
  <SmartTooltip content={content} interactive>
    <Button
      size="small"
      variant={variant}
      startIcon={<HelpIcon />}
      className="inline-help-button"
    >
      {text}
    </Button>
  </SmartTooltip>
);

// Helper component for feature highlights
export const FeatureHighlight: React.FC<{
  content: SmartTooltipContent;
  children: React.ReactNode;
  highlight?: boolean;
}> = ({ content, children, highlight = false }) => (
  <SmartTooltip content={content} interactive>
    <div className={`feature-highlight ${highlight ? 'active' : ''}`}>
      {children}
    </div>
  </SmartTooltip>
);

export default SmartTooltip;