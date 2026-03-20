const URL_PATTERN = /(https?:\/\/|www\.)/i;
const REPEATED_CHAR_PATTERN = /(.)\1{10,}/i;

export interface ModerationSettings {
  blockedKeywords: string;
  flaggedKeywords: string;
  requireReviewForUnknownLinks: boolean;
}

export interface ModerationDecision {
  status: 'approved' | 'flagged' | 'blocked';
  matchedBlockedKeyword?: string;
  matchedFlaggedKeyword?: string;
  reason?: string;
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

function includesKeyword(body: string, keyword: string): boolean {
  return body.includes(keyword);
}

export function moderateQuestion(
  body: string,
  settings: ModerationSettings,
): ModerationDecision {
  const normalizedBody = body.toLowerCase();
  const blockedKeywords = parseKeywords(settings.blockedKeywords);
  const flaggedKeywords = parseKeywords(settings.flaggedKeywords);

  for (const keyword of blockedKeywords) {
    if (includesKeyword(normalizedBody, keyword)) {
      return {
        status: 'blocked',
        matchedBlockedKeyword: keyword,
        reason: 'blocked_keyword',
      };
    }
  }

  if (settings.requireReviewForUnknownLinks && URL_PATTERN.test(body)) {
    return {
      status: 'flagged',
      reason: 'external_link',
    };
  }

  if (REPEATED_CHAR_PATTERN.test(body)) {
    return {
      status: 'flagged',
      reason: 'repeated_character_spam',
    };
  }

  for (const keyword of flaggedKeywords) {
    if (includesKeyword(normalizedBody, keyword)) {
      return {
        status: 'flagged',
        matchedFlaggedKeyword: keyword,
        reason: 'flagged_keyword',
      };
    }
  }

  return { status: 'approved' };
}
