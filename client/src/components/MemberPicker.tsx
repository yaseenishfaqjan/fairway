import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui';
import { useDebounced } from '@/lib/hooks';
import type { Paginated, Member } from '@/lib/types';

export interface PickedMember {
  id: string;
  name: string;
  handicap: number | null;
}

export function MemberPicker({
  value,
  onChange,
  label = 'Member',
  placeholder = 'Search members…',
}: {
  value: PickedMember | null;
  onChange: (member: PickedMember | null) => void;
  label?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 250);

  const { data, isFetching } = useQuery({
    queryKey: ['members', 'picker', debounced],
    queryFn: async () =>
      (await api.get<Paginated<Member>>('/members', { params: { search: debounced, pageSize: 8 } })).data,
    enabled: open && debounced.length > 0,
  });

  if (value) {
    return (
      <div>
        <label className="label">{label}</label>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-night-700 bg-night-900 px-3 py-2">
          <span className="text-sm text-night-100">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-night-400 hover:text-night-200"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="label">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-500" />
        <input
          className="input pl-9"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && debounced.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-night-700 bg-night-900 shadow-xl">
          {isFetching ? (
            <p className="px-3 py-3 text-sm text-night-400">Searching…</p>
          ) : (data?.data.length ?? 0) === 0 ? (
            <p className="px-3 py-3 text-sm text-night-400">No matches.</p>
          ) : (
            data!.data.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange({
                    id: m.id,
                    name: `${m.firstName} ${m.lastName}`,
                    handicap: m.handicapIndex ? Number(m.handicapIndex) : null,
                  });
                  setSearch('');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-night-800"
              >
                <Avatar first={m.firstName} last={m.lastName} url={m.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-night-100">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="truncate text-xs text-night-500">{m.memberNumber ?? m.email ?? '—'}</p>
                </div>
                <Check className="h-4 w-4 text-transparent" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
