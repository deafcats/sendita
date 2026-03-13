import { describe, it, expect, vi } from 'vitest';

// Test moderation score mapping logic independently from OpenAI API
describe('moderation result mapping', () => {
  function mapModerationResult(categories: Record<string, boolean>, scores: Record<string, number>) {
    if (categories['sexual/minors']) return 'csam';
    if (categories['self-harm'] || categories['self-harm/intent'] || (scores['self_harm'] ?? 0) > 0.5) return 'self_harm';
    if (categories['harassment/threatening'] || categories['hate/threatening'] || (scores['harassment_threatening'] ?? 0) > 0.6 || (scores['hate_threatening'] ?? 0) > 0.6) return 'high_risk_harassment';
    if (categories['hate'] && (scores['hate'] ?? 0) > 0.8) return 'high_risk_hate';
    if (Object.values(categories).some(Boolean)) return 'low_risk';
    return 'clean';
  }

  it('returns csam for sexual/minors', () => {
    expect(mapModerationResult({ 'sexual/minors': true }, {})).toBe('csam');
  });

  it('returns self_harm for self-harm category', () => {
    expect(mapModerationResult({ 'self-harm': true }, {})).toBe('self_harm');
  });

  it('returns self_harm when score exceeds threshold', () => {
    expect(mapModerationResult({}, { self_harm: 0.6 })).toBe('self_harm');
  });

  it('returns high_risk_harassment for threatening harassment', () => {
    expect(mapModerationResult({ 'harassment/threatening': true }, {})).toBe('high_risk_harassment');
  });

  it('returns high_risk_hate for high-score hate', () => {
    expect(mapModerationResult({ hate: true }, { hate: 0.9 })).toBe('high_risk_hate');
  });

  it('returns low_risk for general flag without specific category', () => {
    expect(mapModerationResult({ harassment: true }, { hate: 0.3 })).toBe('low_risk');
  });

  it('returns clean for unflagged content', () => {
    expect(mapModerationResult({}, {})).toBe('clean');
  });

  it('prioritizes csam over self_harm', () => {
    expect(mapModerationResult({ 'sexual/minors': true, 'self-harm': true }, {})).toBe('csam');
  });
});
