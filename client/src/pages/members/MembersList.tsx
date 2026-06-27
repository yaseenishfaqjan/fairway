import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, Plus, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Card,
  Button,
  Input,
  Select,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  StatusBadge,
  Avatar,
  Pagination,
  SkeletonRows,
  EmptyState,
} from '@/components/ui';
import { MemberFormModal } from './MemberFormModal';
import { useAuthStore } from '@/stores/auth';
import { useDebounced } from '@/lib/hooks';
import { MEMBERSHIP_TYPES, MEMBERSHIP_STATUSES, humanize } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Paginated, Member } from '@/lib/types';

export function MembersList() {
  const navigate = useNavigate();
  const canManage = useAuthStore((s) => s.hasMinRole('manager'));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['members', { search: debouncedSearch, status, type, page }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, pageSize: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (status) params.status = status;
      if (type) params.type = type;
      return (await api.get<Paginated<Member>>('/members', { params })).data;
    },
    placeholderData: keepPreviousData,
  });

  const members = data?.data ?? [];

  function resetPageThen(fn: () => void) {
    setPage(1);
    fn();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-500" />
          <Input
            placeholder="Search members…"
            value={search}
            onChange={(e) => resetPageThen(() => setSearch(e.target.value))}
            className="pl-9"
          />
        </div>
        <Select
          className="w-auto"
          placeholder="All statuses"
          options={MEMBERSHIP_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
          value={status}
          onChange={(e) => resetPageThen(() => setStatus(e.target.value))}
        />
        <Select
          className="w-auto"
          placeholder="All types"
          options={MEMBERSHIP_TYPES.map((t) => ({ value: t, label: humanize(t) }))}
          value={type}
          onChange={(e) => resetPageThen(() => setType(e.target.value))}
        />
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> New Member
          </Button>
        )}
      </div>

      <Card className="card-pad">
        {isLoading ? (
          <SkeletonRows rows={8} cols={5} />
        ) : members.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No members found"
            message={debouncedSearch || status || type ? 'Try adjusting your filters.' : 'Add your first member to get started.'}
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <Table>
              <THead>
                <TR>
                  <TH>Member</TH>
                  <TH>Number</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Balance</TH>
                  <TH>Joined</TH>
                </TR>
              </THead>
              <TBody>
                {members.map((m) => (
                  <TR
                    key={m.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/members/${m.id}`)}
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar first={m.firstName} last={m.lastName} url={m.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-night-100">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="truncate text-xs text-night-500">{m.email ?? '—'}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-night-300">{m.memberNumber ?? '—'}</TD>
                    <TD className="text-night-300">{humanize(m.membershipType)}</TD>
                    <TD>
                      <StatusBadge status={m.membershipStatus} />
                    </TD>
                    <TD className="text-right tabular-nums text-night-200">{formatCurrency(m.balance)}</TD>
                    <TD className="text-night-400">{formatDate(m.joinDate)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
        {data && <Pagination meta={data.pagination} onPage={setPage} />}
      </Card>

      <MemberFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
