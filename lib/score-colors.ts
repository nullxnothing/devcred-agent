/**
 * Score color utilities for dev scores (0-740) and token scores (0-100)
 */

type ScoreColorLevel = 'legend' | 'elite' | 'proven' | 'builder' | 'verified' | 'low' | 'danger' | 'negative';

interface ScoreColorResult {
  level: ScoreColorLevel;
  textClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
  hex: string;
}

const SCORE_COLORS: Record<ScoreColorLevel, { textClass: string; bgClass: string; borderClass: string; glowClass: string; hex: string }> = {
  legend:   { textClass: 'text-score-legend',   bgClass: 'bg-score-legend',   borderClass: 'border-score-legend',   glowClass: 'score-glow-legend',  hex: '#D4AF37' },
  elite:    { textClass: 'text-score-elite',    bgClass: 'bg-score-elite',    borderClass: 'border-score-elite',    glowClass: 'score-glow-elite',   hex: '#A78BFA' },
  proven:   { textClass: 'text-score-proven',   bgClass: 'bg-score-proven',   borderClass: 'border-score-proven',   glowClass: 'score-glow-proven',  hex: '#4ADE80' },
  builder:  { textClass: 'text-score-builder',  bgClass: 'bg-score-builder',  borderClass: 'border-score-builder',  glowClass: '',                   hex: '#3B82F6' },
  verified: { textClass: 'text-score-verified', bgClass: 'bg-score-verified', borderClass: 'border-score-verified', glowClass: '',                   hex: '#6B7280' },
  low:      { textClass: 'text-score-low',      bgClass: 'bg-score-low',      borderClass: 'border-score-low',      glowClass: '',                   hex: '#F97316' },
  danger:   { textClass: 'text-score-danger',   bgClass: 'bg-score-danger',   borderClass: 'border-score-danger',   glowClass: '',                   hex: '#DC2626' },
  negative: { textClass: 'text-score-negative', bgClass: 'bg-score-negative', borderClass: 'border-score-negative', glowClass: '',                   hex: '#F87171' },
};

/**
 * Get color classes for a dev score (0-740 scale)
 */
export function getDevScoreColor(score: number): ScoreColorResult {
  let level: ScoreColorLevel;

  if (score < 0) {
    level = 'negative';
  } else if (score < 100) {
    level = 'danger';
  } else if (score < 200) {
    level = 'low';
  } else if (score < 350) {
    level = 'verified';
  } else if (score < 500) {
    level = 'builder';
  } else if (score < 600) {
    level = 'proven';
  } else if (score < 700) {
    level = 'elite';
  } else {
    level = 'legend';
  }

  return { level, ...SCORE_COLORS[level] };
}

/**
 * Get color classes for a token score (0-100 scale, or -100 for rug)
 */
export function getTokenScoreColor(score: number): ScoreColorResult {
  let level: ScoreColorLevel;

  if (score < 0) {
    level = 'negative';
  } else if (score < 20) {
    level = 'danger';
  } else if (score < 40) {
    level = 'low';
  } else if (score < 55) {
    level = 'verified';
  } else if (score < 70) {
    level = 'builder';
  } else if (score < 85) {
    level = 'proven';
  } else if (score < 95) {
    level = 'elite';
  } else {
    level = 'legend';
  }

  return { level, ...SCORE_COLORS[level] };
}

/**
 * Get a simple text color class for inline score display
 */
export function getDevScoreTextClass(score: number): string {
  return getDevScoreColor(score).textClass;
}

export function getTokenScoreTextClass(score: number): string {
  return getTokenScoreColor(score).textClass;
}
