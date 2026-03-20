export interface ModerationResult {
  category:
    | 'clean'
    | 'low_risk'
    | 'high_risk_harassment'
    | 'high_risk_hate'
    | 'self_harm'
    | 'csam';
  scores: Record<string, number>;
  flagged: boolean;
}

const CSAM_PATTERNS = [/\bchild porn\b/i, /\bcsam\b/i, /\bminor sexual\b/i];
const SELF_HARM_PATTERNS = [/\bkill myself\b/i, /\bself harm\b/i, /\bsuicide\b/i];
const HARASSMENT_PATTERNS = [/\bi will hurt you\b/i, /\bworthless\b/i, /\bidiot\b/i];
const HATE_PATTERNS = [/\bslur\b/i, /\bwhite power\b/i];

function buildScores(text: string) {
  const score = (patterns: RegExp[]) =>
    patterns.some((pattern) => pattern.test(text)) ? 1 : 0;

  return {
    harassment: score(HARASSMENT_PATTERNS),
    harassment_threatening: score(HARASSMENT_PATTERNS),
    hate: score(HATE_PATTERNS),
    hate_threatening: score(HATE_PATTERNS),
    self_harm: score(SELF_HARM_PATTERNS),
    self_harm_intent: score(SELF_HARM_PATTERNS),
    sexual: score(CSAM_PATTERNS),
    sexual_minors: score(CSAM_PATTERNS),
    violence: score(HARASSMENT_PATTERNS),
  };
}

export async function moderateContent(text: string): Promise<ModerationResult> {
  const scores = buildScores(text);

  if (CSAM_PATTERNS.some((pattern) => pattern.test(text))) {
    return { category: 'csam', scores, flagged: true };
  }

  if (SELF_HARM_PATTERNS.some((pattern) => pattern.test(text))) {
    return { category: 'self_harm', scores, flagged: true };
  }

  if (HARASSMENT_PATTERNS.some((pattern) => pattern.test(text))) {
    return { category: 'high_risk_harassment', scores, flagged: true };
  }

  if (HATE_PATTERNS.some((pattern) => pattern.test(text))) {
    return { category: 'high_risk_hate', scores, flagged: true };
  }

  if (/(https?:\/\/|www\.)/i.test(text)) {
    return { category: 'low_risk', scores, flagged: true };
  }

  return { category: 'clean', scores, flagged: false };
}
