import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Textarea, Select } from '@/components/ui';
import { api, apiError } from '@/lib/api';
import { useUiStore } from '@/stores/ui';
import { TOURNAMENT_FORMATS, TOURNAMENT_STATUSES, humanize } from '@/lib/constants';
import type { Tournament } from '@/lib/types';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  format: z.enum(TOURNAMENT_FORMATS),
  status: z.enum(TOURNAMENT_STATUSES).optional().or(z.literal('')),
  maxPlayers: z.string().optional(),
  entryFee: z.string().optional(),
  prizePool: z.string().optional(),
  description: z.string().optional(),
  rules: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function TournamentFormModal({
  open,
  onClose,
  tournament,
}: {
  open: boolean;
  onClose: () => void;
  tournament?: Tournament | null;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const isEdit = !!tournament;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: tournament?.name ?? '',
      date: tournament?.date ?? '',
      format: (tournament?.format ?? 'stroke_play') as FormValues['format'],
      status: (tournament?.status ?? '') as FormValues['status'],
      maxPlayers: tournament?.maxPlayers != null ? String(tournament.maxPlayers) : '',
      entryFee: tournament?.entryFee ?? '',
      prizePool: tournament?.prizePool ?? '',
      description: tournament?.description ?? '',
      rules: tournament?.rules ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = { ...values };
      for (const k of Object.keys(payload)) {
        if (payload[k] === '') delete payload[k];
      }
      if (isEdit) {
        return (await api.put<Tournament>(`/tournaments/${tournament!.id}`, payload)).data;
      }
      return (await api.post<Tournament>('/tournaments', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournaments'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['tournament', tournament!.id] });
      toast(isEdit ? 'Tournament updated' : 'Tournament created', 'success');
      reset();
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Tournament' : 'New Tournament'}
      description={isEdit ? `Update ${tournament!.name}` : 'Schedule a new tournament'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button form="tournament-form" type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Tournament'}
          </Button>
        </>
      }
    >
      <form id="tournament-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Name" required {...register('name')} error={errors.name?.message} />
        </div>
        <Input label="Date" type="date" required {...register('date')} error={errors.date?.message} />
        <Select
          label="Format"
          options={TOURNAMENT_FORMATS.map((f) => ({ value: f, label: humanize(f) }))}
          {...register('format')}
        />
        <Select
          label="Status"
          placeholder="Upcoming"
          options={TOURNAMENT_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
          {...register('status')}
        />
        <Input label="Max players" type="number" min={0} {...register('maxPlayers')} />
        <Input label="Entry fee" type="number" min={0} step="0.01" {...register('entryFee')} />
        <Input label="Prize pool" type="number" min={0} step="0.01" {...register('prizePool')} />
        <div className="sm:col-span-2">
          <Textarea label="Description" {...register('description')} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Rules" {...register('rules')} />
        </div>
      </form>
    </Modal>
  );
}
