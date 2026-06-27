import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, Textarea, Select } from '@/components/ui';
import { api, apiError } from '@/lib/api';
import { useUiStore } from '@/stores/ui';
import { MEMBERSHIP_TYPES, MEMBERSHIP_STATUSES, humanize } from '@/lib/constants';
import type { Member } from '@/lib/types';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  memberNumber: z.string().optional(),
  handicapIndex: z.string().optional(),
  membershipType: z.enum(MEMBERSHIP_TYPES).optional().or(z.literal('')),
  membershipStatus: z.enum(MEMBERSHIP_STATUSES).optional().or(z.literal('')),
  joinDate: z.string().optional(),
  expiryDate: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function MemberFormModal({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member?: Member | null;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const isEdit = !!member;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      firstName: member?.firstName ?? '',
      lastName: member?.lastName ?? '',
      email: member?.email ?? '',
      phone: member?.phone ?? '',
      memberNumber: member?.memberNumber ?? '',
      handicapIndex: member?.handicapIndex ?? '',
      membershipType: (member?.membershipType ?? '') as FormValues['membershipType'],
      membershipStatus: (member?.membershipStatus ?? '') as FormValues['membershipStatus'],
      joinDate: member?.joinDate ?? '',
      expiryDate: member?.expiryDate ?? '',
      emergencyContactName: member?.emergencyContactName ?? '',
      emergencyContactPhone: member?.emergencyContactPhone ?? '',
      notes: member?.notes ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = { ...values };
      // Drop empty optionals so the server keeps existing values / defaults.
      for (const k of Object.keys(payload)) {
        if (payload[k] === '') delete payload[k];
      }
      if (isEdit) {
        return (await api.put<Member>(`/members/${member!.id}`, payload)).data;
      }
      return (await api.post<Member>('/members', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['member', member!.id] });
      toast(isEdit ? 'Member updated' : 'Member created', 'success');
      reset();
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Member' : 'New Member'}
      description={isEdit ? `Update ${member!.firstName} ${member!.lastName}` : 'Add a new member to your club'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button form="member-form" type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create Member'}
          </Button>
        </>
      }
    >
      <form
        id="member-form"
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Input label="First name" required {...register('firstName')} error={errors.firstName?.message} />
        <Input label="Last name" required {...register('lastName')} error={errors.lastName?.message} />
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        <Input label="Phone" {...register('phone')} error={errors.phone?.message} />
        <Input label="Member number" {...register('memberNumber')} error={errors.memberNumber?.message} />
        <Input label="Handicap index" {...register('handicapIndex')} error={errors.handicapIndex?.message} />
        <Select
          label="Membership type"
          placeholder="Select type"
          options={MEMBERSHIP_TYPES.map((t) => ({ value: t, label: humanize(t) }))}
          {...register('membershipType')}
        />
        <Select
          label="Status"
          placeholder="Select status"
          options={MEMBERSHIP_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
          {...register('membershipStatus')}
        />
        <Input label="Join date" type="date" {...register('joinDate')} />
        <Input label="Expiry date" type="date" {...register('expiryDate')} />
        <Input label="Emergency contact" {...register('emergencyContactName')} />
        <Input label="Emergency phone" {...register('emergencyContactPhone')} />
        <div className="sm:col-span-2">
          <Textarea label="Notes" {...register('notes')} />
        </div>
      </form>
    </Modal>
  );
}
