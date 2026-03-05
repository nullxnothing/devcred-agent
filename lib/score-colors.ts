/**
 * Monochrome tier color system — white intensity levels with red for FLAGGED.
 */

type ScoreColorLevel =
  | 'sovereign'
  | 'cleared'
  | 'operative'
  | 'vetted'
  | 'tracked'
  | 'filed'
  | 'flagged'
  | 'ghost';

interface ScoreColorResult {
  level: ScoreColorLevel;
  textClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
  hex: string;
}

const SCORE_COLORS: Record<ScoreColorLevel, Omit<ScoreColorResult, 'level'>> = {
  sovereign: { textClass: 'text-tier-sovereign', bgClass: 'bg-tier-sovereign', borderClass: 'border-tier-sovereign', glowClass: 'tier-sovereign', hex: 'var(--color-tier-sovereign)' },
  cleared:   { textClass: 'text-tier-cleared',   bgClass: 'bg-tier-cleared',   borderClass: 'border-tier-cleared',   glowClass: '',              hex: 'var(--color-tier-cleared)' },
  operative: { textClass: 'text-tier-operative', bgClass: 'bg-tier-operative', borderClass: 'border-tier-operative', glowClass: '',              hex: 'var(--color-tier-operative)' },
  vetted:    { textClass: 'text-tier-vetted',    bgClass: 'bg-tier-vetted',    borderClass: 'border-tier-vetted',    glowClass: '',              hex: 'var(--color-tier-vetted)' },
  tracked:   { textClass: 'text-tier-tracked',   bgClass: 'bg-tier-tracked',   borderClass: 'border-tier-tracked',   glowClass: '',              hex: 'var(--color-tier-tracked)' },
  filed:     { textClass: 'text-tier-filed',     bgClass: 'bg-tier-filed',     borderClass: 'border-tier-filed',     glowClass: '',              hex: 'var(--color-tier-filed)' },
  flagged:   { textClass: 'text-tier-flagged',   bgClass: 'bg-tier-flagged',   borderClass: 'border-tier-flagged',   glowClass: 'tier-flagged',  hex: 'var(--color-tier-flagged)' },
  ghost:     { textClass: 'text-tier-ghost',     bgClass: 'bg-tier-ghost',     borderClass: 'border-tier-ghost',     glowClass: '',              hex: 'var(--color-tier-ghost)' },
};

/**
 * Get tier color classes for a dev score (0-740 scale)
 */
export function getDevScoreColor(score: number): ScoreColorResult {
  let level: ScoreColorLevel;

  if (score <= 0) {
    level = 'ghost';
  } else if (score < 150) {
    level = 'flagged';
  } else if (score < 300) {
    level = 'filed';
  } else if (score < 450) {
    level = 'tracked';
  } else if (score < 500) {
    level = 'vetted';
  } else if (score < 600) {
    level = 'operative';
  } else if (score < 700) {
    level = 'cleared';
  } else {
    level = 'sovereign';
  }

  return { level, ...SCORE_COLORS[level] };
}

/**
 * Get tier color classes for a token score (0-100, or negative for rug)
 */
export function getTokenScoreColor(score: number): ScoreColorResult {
  let level: ScoreColorLevel;

  if (score <= 0) {
    level = 'ghost';
  } else if (score < 20) {
    level = 'flagged';
  } else if (score < 40) {
    level = 'filed';
  } else if (score < 55) {
    level = 'tracked';
  } else if (score < 70) {
    level = 'vetted';
  } else if (score < 85) {
    level = 'operative';
  } else if (score < 95) {
    level = 'cleared';
  } else {
    level = 'sovereign';
  }

  return { level, ...SCORE_COLORS[level] };
}

/**
 * Shorthand: text class only for inline score display
 */
export function getDevScoreTextClass(score: number): string {
  return getDevScoreColor(score).textClass;
}

export function getTokenScoreTextClass(score: number): string {
  return getTokenScoreColor(score).textClass;
}
