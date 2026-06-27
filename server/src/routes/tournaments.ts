import { Router } from 'express';
import { z } from 'zod';
import { and, eq, asc, desc, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tournaments, tournamentEntries, members } from '../db/schema.js';
import { requireAuth, requireRole, clubScope } from '../middleware/auth.js';
import { validate, vquery } from '../middleware/validate.js';
import { asyncHandler, notFound, conflict } from '../lib/http.js';
import { TOURNAMENT_FORMATS, TOURNAMENT_STATUSES } from '../lib/constants.js';

const router = Router();
router.use(requireAuth);

// GET /tournaments
router.get(
  '/',
  validate({ query: z.object({ status: z.enum(TOURNAMENT_STATUSES).optional() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ status?: string }>(req);
    const filters = [eq(tournaments.clubId, clubId)];
    if (q.status) filters.push(eq(tournaments.status, q.status));
    const rows = await db
      .select({
        tournament: tournaments,
        entryCount: count(tournamentEntries.id),
      })
      .from(tournaments)
      .leftJoin(tournamentEntries, eq(tournamentEntries.tournamentId, tournaments.id))
      .where(and(...filters))
      .groupBy(tournaments.id)
      .orderBy(desc(tournaments.date));
    res.json(rows.map((r) => ({ ...r.tournament, entryCount: Number(r.entryCount) })));
  }),
);

// POST /tournaments
router.post(
  '/',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({
    body: z.object({
      name: z.string().min(1),
      date: z.string(),
      format: z.enum(TOURNAMENT_FORMATS),
      status: z.enum(TOURNAMENT_STATUSES).optional(),
      maxPlayers: z.coerce.number().optional(),
      entryFee: z.coerce.number().optional(),
      prizePool: z.coerce.number().optional(),
      description: z.string().optional(),
      rules: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as Record<string, unknown>;
    const [row] = await db
      .insert(tournaments)
      .values({
        clubId,
        name: b.name as string,
        date: b.date as string,
        format: b.format as string,
        status: (b.status as string) ?? 'upcoming',
        maxPlayers: b.maxPlayers as number | undefined,
        entryFee: b.entryFee !== undefined ? Number(b.entryFee).toFixed(2) : undefined,
        prizePool: b.prizePool !== undefined ? Number(b.prizePool).toFixed(2) : undefined,
        description: b.description as string | undefined,
        rules: b.rules as string | undefined,
      })
      .returning();
    res.status(201).json(row);
  }),
);

async function loadLeaderboard(tournamentId: string) {
  const entries = await db
    .select({
      entry: tournamentEntries,
      member: { id: members.id, firstName: members.firstName, lastName: members.lastName, memberNumber: members.memberNumber },
    })
    .from(tournamentEntries)
    .leftJoin(members, eq(tournamentEntries.memberId, members.id))
    .where(eq(tournamentEntries.tournamentId, tournamentId))
    .orderBy(asc(tournamentEntries.score));

  const scored = entries.filter((e) => e.entry.score != null);
  const unscored = entries.filter((e) => e.entry.score == null);
  const par = 72;
  const board = scored.map((e, i) => ({
    ...e.entry,
    member: e.member,
    position: i + 1,
    toPar: (e.entry.score ?? 0) - par,
  }));
  return [...board, ...unscored.map((e) => ({ ...e.entry, member: e.member, position: null, toPar: null }))];
}

// GET /tournaments/:id
router.get(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [t] = await db
      .select()
      .from(tournaments)
      .where(and(eq(tournaments.id, req.params.id), eq(tournaments.clubId, clubId)));
    if (!t) throw notFound('Tournament not found');
    const leaderboard = await loadLeaderboard(t.id);
    res.json({ ...t, entries: leaderboard, leaderboard });
  }),
);

// PUT /tournaments/:id
router.put(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      name: z.string().optional(),
      date: z.string().optional(),
      format: z.enum(TOURNAMENT_FORMATS).optional(),
      status: z.enum(TOURNAMENT_STATUSES).optional(),
      maxPlayers: z.coerce.number().optional(),
      entryFee: z.coerce.number().optional(),
      prizePool: z.coerce.number().optional(),
      description: z.string().optional(),
      rules: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as Record<string, unknown>;
    const [row] = await db
      .update(tournaments)
      .set({
        name: b.name as string | undefined,
        date: b.date as string | undefined,
        format: b.format as string | undefined,
        status: b.status as string | undefined,
        maxPlayers: b.maxPlayers as number | undefined,
        entryFee: b.entryFee !== undefined ? Number(b.entryFee).toFixed(2) : undefined,
        prizePool: b.prizePool !== undefined ? Number(b.prizePool).toFixed(2) : undefined,
        description: b.description as string | undefined,
        rules: b.rules as string | undefined,
      })
      .where(and(eq(tournaments.id, req.params.id), eq(tournaments.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Tournament not found');
    res.json(row);
  }),
);

// POST /tournaments/:id/entries
router.post(
  '/:id/entries',
  requireRole('superadmin', 'club_owner', 'manager', 'staff'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ memberId: z.string().uuid() }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [t] = await db
      .select()
      .from(tournaments)
      .where(and(eq(tournaments.id, req.params.id), eq(tournaments.clubId, clubId)));
    if (!t) throw notFound('Tournament not found');
    const { memberId } = req.body as { memberId: string };
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.clubId, clubId)));
    if (!member) throw notFound('Member not found');

    const [existing] = await db
      .select()
      .from(tournamentEntries)
      .where(and(eq(tournamentEntries.tournamentId, t.id), eq(tournamentEntries.memberId, memberId)));
    if (existing) throw conflict('Member already registered');

    const [entry] = await db
      .insert(tournamentEntries)
      .values({ tournamentId: t.id, memberId, handicapAtEntry: member.handicapIndex, status: 'registered' })
      .returning();
    res.status(201).json(entry);
  }),
);

// PUT /tournaments/:id/entries/:entryId/score
router.put(
  '/:id/entries/:entryId/score',
  requireRole('superadmin', 'club_owner', 'manager', 'staff'),
  validate({
    params: z.object({ id: z.string().uuid(), entryId: z.string().uuid() }),
    body: z.object({ score: z.coerce.number().int(), scoreDetail: z.array(z.number()).optional() }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [t] = await db
      .select()
      .from(tournaments)
      .where(and(eq(tournaments.id, req.params.id), eq(tournaments.clubId, clubId)));
    if (!t) throw notFound('Tournament not found');
    const b = req.body as { score: number; scoreDetail?: number[] };
    const [row] = await db
      .update(tournamentEntries)
      .set({ score: b.score, scoreDetail: b.scoreDetail })
      .where(and(eq(tournamentEntries.id, req.params.entryId), eq(tournamentEntries.tournamentId, t.id)))
      .returning();
    if (!row) throw notFound('Entry not found');
    res.json(row);
  }),
);

// GET /tournaments/:id/leaderboard
router.get(
  '/:id/leaderboard',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [t] = await db
      .select()
      .from(tournaments)
      .where(and(eq(tournaments.id, req.params.id), eq(tournaments.clubId, clubId)));
    if (!t) throw notFound('Tournament not found');
    res.json(await loadLeaderboard(t.id));
  }),
);

// POST /tournaments/:id/pairings  (AI: group by handicap)
router.post(
  '/:id/pairings',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ groupSize: z.coerce.number().min(2).max(4).default(4) }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [t] = await db
      .select()
      .from(tournaments)
      .where(and(eq(tournaments.id, req.params.id), eq(tournaments.clubId, clubId)));
    if (!t) throw notFound('Tournament not found');
    const groupSize = (req.body as { groupSize: number }).groupSize;

    const entries = await db
      .select({
        id: tournamentEntries.id,
        handicap: tournamentEntries.handicapAtEntry,
        firstName: members.firstName,
        lastName: members.lastName,
      })
      .from(tournamentEntries)
      .leftJoin(members, eq(tournamentEntries.memberId, members.id))
      .where(eq(tournamentEntries.tournamentId, t.id));

    entries.sort((a, b) => Number(a.handicap ?? 99) - Number(b.handicap ?? 99));
    const groups: typeof entries[] = [];
    for (let i = 0; i < entries.length; i += groupSize) {
      groups.push(entries.slice(i, i + groupSize));
    }
    res.json({
      groups: groups.map((g, i) => ({
        group: i + 1,
        teeTime: `${String(7 + Math.floor((i * 10) / 60)).padStart(2, '0')}:${String((i * 10) % 60).padStart(2, '0')}`,
        players: g.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, handicap: Number(p.handicap ?? 0) })),
      })),
    });
  }),
);

export default router;
