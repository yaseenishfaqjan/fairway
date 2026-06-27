import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Plus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Card,
  Button,
  Select,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  StatusBadge,
  Badge,
  SkeletonRows,
  EmptyState,
} from '@/components/ui';
import { TournamentFormModal } from './TournamentFormModal';
import { useAuthStore } from '@/stores/auth';
import { TOURNAMENT_STATUSES, humanize } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Tournament } from '@/lib/types';

export function Tournaments() {
  const navigate = useNavigate();
  const canManage = useAuthStore((s) => s.hasMinRole('manager'));
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tournaments', { status }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      return (await api.get<Tournament[]>('/tournaments', { params })).data;
    },
  });

  const tournaments = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-auto"
          placeholder="All statuses"
          options={TOURNAMENT_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        {canManage && (
          <Button className="ml-auto" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> New Tournament
          </Button>
        )}
      </div>

      <Card className="card-pad">
        {isLoading ? (
          <SkeletonRows rows={6} cols={6} />
        ) : tournaments.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No tournaments"
            message={status ? 'No tournaments match this filter.' : 'Schedule your first tournament to get started.'}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Tournament</TH>
                <TH>Date</TH>
                <TH>Format</TH>
                <TH>Status</TH>
                <TH>Entries</TH>
                <TH className="text-right">Prize Pool</TH>
              </TR>
            </THead>
            <TBody>
              {tournaments.map((t) => (
                <TR key={t.id} className="cursor-pointer" onClick={() => navigate(`/tournaments/${t.id}`)}>
                  <TD>
                    <p className="font-medium text-night-100">{t.name}</p>
                    {t.entryFee && Number(t.entryFee) > 0 && (
                      <p className="text-xs text-night-500">{formatCurrency(t.entryFee)} entry</p>
                    )}
                  </TD>
                  <TD className="text-night-300">{formatDate(t.date)}</TD>
                  <TD className="text-night-300">{humanize(t.format)}</TD>
                  <TD>
                    <StatusBadge status={t.status} />
                  </TD>
                  <TD>
                    <Badge tone="slate">
                      <Users className="mr-1 inline h-3 w-3" />
                      {t.entryCount ?? 0}
                      {t.maxPlayers ? ` / ${t.maxPlayers}` : ''}
                    </Badge>
                  </TD>
                  <TD className="text-right tabular-nums text-night-200">{formatCurrency(t.prizePool)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <TournamentFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
