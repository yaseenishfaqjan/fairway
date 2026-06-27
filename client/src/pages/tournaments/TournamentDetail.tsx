import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trophy, Users, DollarSign, CalendarDays, UserPlus, Shuffle, Flag } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  StatusBadge,
  Badge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Modal,
  Input,
  PageLoader,
  EmptyState,
} from '@/components/ui';
import { MemberPicker, type PickedMember } from '@/components/MemberPicker';
import { TournamentFormModal } from './TournamentFormModal';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { humanize } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Tournament } from '@/lib/types';

interface LeaderboardEntry {
  id: string;
  memberId: string | null;
  handicapAtEntry: string | null;
  score: number | null;
  status: string | null;
  position: number | null;
  toPar: number | null;
  member: { id: string; firstName: string; lastName: string; memberNumber: string | null } | null;
}

interface TournamentDetailResponse extends Tournament {
  entries: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
}

interface PairingGroup {
  group: number;
  teeTime: string;
  players: { id: string; name: string; handicap: number }[];
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-night-900/60 px-4 py-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-fairway-500/10 text-fairway-400">{icon}</span>
      <div>
        <p className="text-xs text-night-400">{label}</p>
        <p className="font-display text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

const scoreSchema = z.object({ score: z.coerce.number().int('Whole number').min(1, 'Required') });
type ScoreValues = z.infer<typeof scoreSchema>;

function ScoreModal({
  entry,
  tournamentId,
  onClose,
}: {
  entry: LeaderboardEntry | null;
  tournamentId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScoreValues>({ resolver: zodResolver(scoreSchema), values: { score: entry?.score ?? 0 } });

  const mutation = useMutation({
    mutationFn: async (v: ScoreValues) =>
      api.put(`/tournaments/${tournamentId}/entries/${entry!.id}/score`, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast('Score saved', 'success');
      reset();
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  const name = entry?.member ? `${entry.member.firstName} ${entry.member.lastName}` : 'player';

  return (
    <Modal
      open={!!entry}
      onClose={onClose}
      title="Enter Score"
      description={`Record the gross score for ${name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="score-form" type="submit" loading={mutation.isPending}>
            Save Score
          </Button>
        </>
      }
    >
      <form id="score-form" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <Input label="Gross score" type="number" required {...register('score')} error={errors.score?.message} />
      </form>
    </Modal>
  );
}

export function TournamentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const canManage = useAuthStore((s) => s.hasMinRole('manager'));
  const canScore = useAuthStore((s) => s.hasMinRole('staff'));
  const [editOpen, setEditOpen] = useState(false);
  const [scoreTarget, setScoreTarget] = useState<LeaderboardEntry | null>(null);
  const [registerMember, setRegisterMember] = useState<PickedMember | null>(null);
  const [pairings, setPairings] = useState<PairingGroup[] | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tournament', id],
    queryFn: async () => (await api.get<TournamentDetailResponse>(`/tournaments/${id}`)).data,
    enabled: !!id,
  });

  const enter = useMutation({
    mutationFn: async (memberId: string) => api.post(`/tournaments/${id}/entries`, { memberId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournament', id] });
      toast('Player registered', 'success');
      setRegisterMember(null);
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  const pair = useMutation({
    mutationFn: async () =>
      (await api.post<{ groups: PairingGroup[] }>(`/tournaments/${id}/pairings`, { groupSize: 4 })).data,
    onSuccess: (res) => {
      setPairings(res.groups);
      toast('Pairings generated', 'success');
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  if (isLoading) return <PageLoader />;
  if (isError || !data) {
    return (
      <EmptyState
        title="Tournament not found"
        message="This tournament may have been removed."
        action={
          <Button variant="secondary" onClick={() => navigate('/tournaments')}>
            Back to Tournaments
          </Button>
        }
      />
    );
  }

  const board = data.leaderboard ?? [];

  return (
    <div className="space-y-4">
      <Link to="/tournaments" className="inline-flex items-center gap-1 text-sm text-night-400 hover:text-night-200">
        <ArrowLeft className="h-4 w-4" /> Tournaments
      </Link>

      <Card>
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-white">{data.name}</h2>
              <StatusBadge status={data.status} />
            </div>
            <p className="mt-1 text-sm text-night-400">
              {humanize(data.format)} · {formatDate(data.date)}
            </p>
            {data.description && <p className="mt-2 max-w-2xl text-sm text-night-300">{data.description}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <Button variant="secondary" onClick={() => pair.mutate()} loading={pair.isPending}>
                <Shuffle className="h-4 w-4" /> Generate Pairings
              </Button>
            )}
            {canManage && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile icon={<Users className="h-4 w-4" />} label="Entries" value={`${board.length}${data.maxPlayers ? ` / ${data.maxPlayers}` : ''}`} />
        <StatTile icon={<DollarSign className="h-4 w-4" />} label="Entry Fee" value={formatCurrency(data.entryFee)} />
        <StatTile icon={<Trophy className="h-4 w-4" />} label="Prize Pool" value={formatCurrency(data.prizePool)} />
        <StatTile icon={<CalendarDays className="h-4 w-4" />} label="Date" value={formatDate(data.date)} />
      </div>

      {canScore && (
        <Card>
          <CardHeader title="Register Player" subtitle="Add a member to this tournament" />
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <MemberPicker value={registerMember} onChange={setRegisterMember} label="Member" />
            </div>
            <Button
              disabled={!registerMember}
              loading={enter.isPending}
              onClick={() => registerMember && enter.mutate(registerMember.id)}
            >
              <UserPlus className="h-4 w-4" /> Register
            </Button>
          </CardBody>
        </Card>
      )}

      {pairings && (
        <Card>
          <CardHeader title="Pairings" subtitle="Grouped by handicap" action={<Button variant="ghost" size="sm" onClick={() => setPairings(null)}>Dismiss</Button>} />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pairings.map((g) => (
                <div key={g.group} className="rounded-xl bg-night-900/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-night-100">Group {g.group}</p>
                    <Badge tone="blue">{g.teeTime}</Badge>
                  </div>
                  <ul className="space-y-1 text-sm text-night-300">
                    {g.players.map((p) => (
                      <li key={p.id} className="flex justify-between">
                        <span>{p.name}</span>
                        <span className="tabular-nums text-night-500">HCP {p.handicap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Leaderboard" subtitle={`${board.length} ${board.length === 1 ? 'entry' : 'entries'}`} />
        <CardBody>
          {board.length === 0 ? (
            <EmptyState icon={Flag} title="No entries yet" message="Register players to build the leaderboard." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Pos</TH>
                  <TH>Player</TH>
                  <TH className="text-right">HCP</TH>
                  <TH className="text-right">Score</TH>
                  <TH className="text-right">To Par</TH>
                  {canScore && <TH />}
                </TR>
              </THead>
              <TBody>
                {board.map((e) => (
                  <TR key={e.id}>
                    <TD className="tabular-nums text-night-300">{e.position ?? '—'}</TD>
                    <TD className="font-medium text-night-100">
                      {e.member ? `${e.member.firstName} ${e.member.lastName}` : '—'}
                      {e.member?.memberNumber && <span className="ml-1 text-xs text-night-500">#{e.member.memberNumber}</span>}
                    </TD>
                    <TD className="text-right tabular-nums text-night-400">{e.handicapAtEntry ?? '—'}</TD>
                    <TD className="text-right tabular-nums text-night-200">{e.score ?? '—'}</TD>
                    <TD className="text-right tabular-nums">
                      {e.toPar == null ? '—' : e.toPar === 0 ? 'E' : e.toPar > 0 ? `+${e.toPar}` : e.toPar}
                    </TD>
                    {canScore && (
                      <TD className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setScoreTarget(e)}>
                          <Flag className="h-4 w-4" /> Score
                        </Button>
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <TournamentFormModal open={editOpen} onClose={() => setEditOpen(false)} tournament={data} />
      <ScoreModal entry={scoreTarget} tournamentId={id} onClose={() => setScoreTarget(null)} />
    </div>
  );
}
