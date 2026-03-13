import OpenAI from 'openai';

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

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const key = process.env['OPENAI_API_KEY'];
    if (!key) throw new Error('OPENAI_API_KEY not set');
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

export async function moderateContent(text: string): Promise<ModerationResult> {
  const openai = getOpenAI();
  const response = await openai.moderations.create({ input: text });
  const result = response.results[0];

  if (!result) throw new Error('No moderation result returned');

  const { categories, category_scores } = result;

  const scores: Record<string, number> = {
    harassment: category_scores['harassment'] ?? 0,
    harassment_threatening: category_scores['harassment/threatening'] ?? 0,
    hate: category_scores['hate'] ?? 0,
    hate_threatening: category_scores['hate/threatening'] ?? 0,
    self_harm: category_scores['self-harm'] ?? 0,
    self_harm_intent: category_scores['self-harm/intent'] ?? 0,
    sexual: category_scores['sexual'] ?? 0,
    sexual_minors: category_scores['sexual/minors'] ?? 0,
    violence: category_scores['violence'] ?? 0,
  };

  // CSAM detection (highest priority)
  if (categories['sexual/minors']) {
    return { category: 'csam', scores, flagged: true };
  }

  // Self harm
  if (
    categories['self-harm'] ||
    categories['self-harm/intent'] ||
    (scores['self_harm'] ?? 0) > 0.5
  ) {
    return { category: 'self_harm', scores, flagged: true };
  }

  // High risk harassment
  if (
    categories['harassment/threatening'] ||
    categories['hate/threatening'] ||
    (scores['harassment_threatening'] ?? 0) > 0.6 ||
    (scores['hate_threatening'] ?? 0) > 0.6
  ) {
    return { category: 'high_risk_harassment', scores, flagged: true };
  }

  // High risk hate
  if (categories['hate'] && (scores['hate'] ?? 0) > 0.8) {
    return { category: 'high_risk_hate', scores, flagged: true };
  }

  // Low risk
  if (result.flagged) {
    return { category: 'low_risk', scores, flagged: true };
  }

  return { category: 'clean', scores, flagged: false };
}
