import { NextRequest, NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { getPrimaryClient } from '@anon-inbox/db';
import { users } from '@anon-inbox/db';
import {
  buildUsernameSuggestionCandidates,
  isReservedSlug,
  isValidVanitySlug,
  sanitizeSlugInput,
} from '@/lib/slugs/index';

function buildSuggestions(
  input: string,
  unavailableUsernames: Iterable<string>,
): string[] {
  const taken = new Set(Array.from(unavailableUsernames, (value) => value.toLowerCase()));
  return buildUsernameSuggestionCandidates(input)
    .filter((candidate) => !taken.has(candidate) && !isReservedSlug(candidate))
    .slice(0, 4);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestedUsername = req.nextUrl.searchParams.get('username') ?? '';
  const username = sanitizeSlugInput(requestedUsername);

  if (!username) {
    return NextResponse.json({
      username,
      available: false,
      reason: 'EMPTY',
      message: 'Enter a username to generate your link',
      suggestions: buildSuggestions('creator', []),
    });
  }

  if (!isValidVanitySlug(username)) {
    const reason = isReservedSlug(username) ? 'RESERVED' : 'INVALID';
    return NextResponse.json({
      username,
      available: false,
      reason,
      message:
        reason === 'RESERVED'
          ? 'That username is reserved'
          : 'Use 4-20 lowercase letters, numbers, or hyphens',
      suggestions: buildSuggestions(username, []),
    });
  }

  const db = getPrimaryClient();
  const candidates = buildUsernameSuggestionCandidates(username);
  const takenRows = candidates.length > 0
    ? await db
      .select({ slug: users.slug })
      .from(users)
      .where(inArray(users.slug, candidates))
    : [];

  const taken = new Set(takenRows.map((row) => row.slug.toLowerCase()));

  if (taken.has(username)) {
    return NextResponse.json({
      username,
      available: false,
      reason: 'TAKEN',
      message: 'That username is already taken',
      suggestions: buildSuggestions(username, taken),
    });
  }

  return NextResponse.json({
    username,
    available: true,
    reason: null,
    message: 'Username is available',
    suggestions: [],
  });
}
