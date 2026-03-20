import { describe, it, expect } from 'vitest';
import { moderateQuestion } from '../../../apps/api/src/lib/moderation/classic';

describe('classic moderation rules', () => {
  it('blocks a question containing a blocked keyword', () => {
    expect(
      moderateQuestion('this contains a spoiler', {
        blockedKeywords: 'spoiler',
        flaggedKeywords: '',
        requireReviewForUnknownLinks: false,
      }).status,
    ).toBe('blocked');
  });

  it('flags a question containing a flagged keyword', () => {
    expect(
      moderateQuestion('this feels like drama bait', {
        blockedKeywords: '',
        flaggedKeywords: 'drama',
        requireReviewForUnknownLinks: false,
      }).status,
    ).toBe('flagged');
  });

  it('flags a question containing an external link when that rule is enabled', () => {
    expect(
      moderateQuestion('check this out https://example.com', {
        blockedKeywords: '',
        flaggedKeywords: '',
        requireReviewForUnknownLinks: true,
      }).status,
    ).toBe('flagged');
  });

  it('flags repeated-character spam', () => {
    expect(
      moderateQuestion('loooooooooooooooooooooool', {
        blockedKeywords: '',
        flaggedKeywords: '',
        requireReviewForUnknownLinks: false,
      }).status,
    ).toBe('flagged');
  });

  it('approves a normal question', () => {
    expect(
      moderateQuestion('What game are you streaming tonight?', {
        blockedKeywords: '',
        flaggedKeywords: '',
        requireReviewForUnknownLinks: false,
      }).status,
    ).toBe('approved');
  });

  it('prioritizes blocked keywords over flagged keywords', () => {
    expect(
      moderateQuestion('this spoiler is also drama', {
        blockedKeywords: 'spoiler',
        flaggedKeywords: 'drama',
        requireReviewForUnknownLinks: false,
      }).status,
    ).toBe('blocked');
  });
});
