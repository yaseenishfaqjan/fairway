import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '@/lib/api';
import { Modal, Button, Input } from '@/components/ui';
import { useUiStore } from '@/stores/ui';

const schema = z.object({
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().optional(),
  courseName: z.string().min(1, 'Required'),
  intervalMinutes: z.coerce.number().min(5).max(30),
  openHour: z.coerce.number().min(0).max(23),
  closeHour: z.coerce.number().min(1).max(23),
  slotsTotal: z.coerce.number().min(1).max(5),
  cartFee: z.coerce.number().min(0),
});
type Values = z.infer<typeof schema>;

export function GenerateSheetModal({
  open,
  onClose,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      startDate: defaultDate,
      endDate: '',
      courseName: 'Main Course',
      intervalMinutes: 10,
      openHour: 7,
      closeHour: 18,
      slotsTotal: 4,
      cartFee: 20,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Values) => {
      const payload = { ...v, endDate: v.endDate || undefined };
      return (await api.post<{ created: number }>('/tee-sheet/bulk-create', payload)).data;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['tee-sheet'] });
      toast(`Generated ${res.created} tee times`, 'success');
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Tee Sheet"
      description="Create a block of tee times for one or more days"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="generate-form" type="submit" loading={mutation.isPending}>
            Generate
          </Button>
        </>
      }
    >
      <form
        id="generate-form"
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Input label="Start date" type="date" required {...register('startDate')} error={errors.startDate?.message} />
        <Input label="End date" type="date" hint="Leave blank for a single day" {...register('endDate')} />
        <Input label="Course name" required {...register('courseName')} error={errors.courseName?.message} className="sm:col-span-2" />
        <Input label="Interval (min)" type="number" {...register('intervalMinutes')} error={errors.intervalMinutes?.message} />
        <Input label="Slots per time" type="number" {...register('slotsTotal')} error={errors.slotsTotal?.message} />
        <Input label="Open hour (0–23)" type="number" {...register('openHour')} error={errors.openHour?.message} />
        <Input label="Close hour (1–23)" type="number" {...register('closeHour')} error={errors.closeHour?.message} />
        <Input label="Cart fee" type="number" step="0.01" {...register('cartFee')} error={errors.cartFee?.message} />
      </form>
    </Modal>
  );
}
