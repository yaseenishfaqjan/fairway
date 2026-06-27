import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCog, Plus, Trash2, CalendarPlus } from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { api, apiError } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Badge,
  Avatar,
  SkeletonRows,
  EmptyState,
  Modal,
  ConfirmDialog,
} from '@/components/ui';
import { useUiStore } from '@/stores/ui';
import { ROLES, ROLE_LABELS } from '@/lib/constants';
import { formatDate, formatTime } from '@/lib/utils';
import type { StaffUser, StaffSchedule } from '@/lib/types';

const staffSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  role: z.enum(ROLES),
  phone: z.string().optional(),
  password: z.string().min(8, 'Min 8 characters').optional().or(z.literal('')),
});
type StaffValues = z.infer<typeof staffSchema>;

function StaffFormModal({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member?: StaffUser | null;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const isEdit = !!member;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    values: {
      firstName: member?.firstName ?? '',
      lastName: member?.lastName ?? '',
      email: member?.email ?? '',
      role: (member?.role ?? 'staff') as StaffValues['role'],
      phone: member?.phone ?? '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: StaffValues) => {
      if (isEdit) {
        const payload = { firstName: v.firstName, lastName: v.lastName, role: v.role, phone: v.phone || undefined };
        return (await api.put(`/staff/${member!.id}`, payload)).data;
      }
      const payload: Record<string, unknown> = { ...v };
      if (!payload.password) delete payload.password;
      if (!payload.phone) delete payload.phone;
      return (await api.post('/staff', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast(isEdit ? 'Staff updated' : 'Staff member added', 'success');
      reset();
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Staff Member' : 'New Staff Member'}
      description={isEdit ? `Update ${member!.firstName} ${member!.lastName}` : 'Add a new team member'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="staff-form" type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" required {...register('firstName')} error={errors.firstName?.message} />
        <Input label="Last name" required {...register('lastName')} error={errors.lastName?.message} />
        <Input label="Email" type="email" required disabled={isEdit} {...register('email')} error={errors.email?.message} />
        <Select label="Role" options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} {...register('role')} />
        <Input label="Phone" {...register('phone')} error={errors.phone?.message} />
        {!isEdit && (
          <Input
            label="Password"
            type="password"
            placeholder="Default: Welcome123!"
            {...register('password')}
            error={errors.password?.message}
          />
        )}
      </form>
    </Modal>
  );
}

const shiftSchema = z.object({
  userId: z.string().uuid('Select a staff member'),
  date: z.string().min(1, 'Required'),
  shiftStart: z.string().min(1, 'Required'),
  shiftEnd: z.string().min(1, 'Required'),
  roleThatDay: z.string().optional(),
  notes: z.string().optional(),
});
type ShiftValues = z.infer<typeof shiftSchema>;

function ShiftModal({ open, onClose, staff }: { open: boolean; onClose: () => void; staff: StaffUser[] }) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShiftValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: { userId: '', date: format(new Date(), 'yyyy-MM-dd'), shiftStart: '08:00', shiftEnd: '16:00' },
  });

  const mutation = useMutation({
    mutationFn: async (v: ShiftValues) => {
      const payload: Record<string, unknown> = { ...v };
      if (!payload.roleThatDay) delete payload.roleThatDay;
      if (!payload.notes) delete payload.notes;
      return (await api.post('/staff/schedule', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', 'schedule'] });
      toast('Shift added', 'success');
      reset();
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Shift"
      description="Schedule a staff shift"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="shift-form" type="submit" loading={mutation.isPending}>
            Add Shift
          </Button>
        </>
      }
    >
      <form id="shift-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Select
            label="Staff member"
            placeholder="Select staff"
            options={staff.map((u) => ({ value: u.id, label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email }))}
            {...register('userId')}
          />
          {errors.userId && <p className="mt-1 text-xs text-red-400">{errors.userId.message}</p>}
        </div>
        <Input label="Date" type="date" required {...register('date')} error={errors.date?.message} />
        <Input label="Role that day" placeholder="Optional" {...register('roleThatDay')} />
        <Input label="Start" type="time" required {...register('shiftStart')} error={errors.shiftStart?.message} />
        <Input label="End" type="time" required {...register('shiftEnd')} error={errors.shiftEnd?.message} />
      </form>
    </Modal>
  );
}

export function Staff() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffUser | null>(null);

  const weekFrom = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekTo = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => (await api.get<StaffUser[]>('/staff')).data,
  });
  const staff = data ?? [];

  const { data: scheduleData } = useQuery({
    queryKey: ['staff', 'schedule', { from: weekFrom, to: weekTo }],
    queryFn: async () => (await api.get<StaffSchedule[]>('/staff/schedule', { params: { from: weekFrom, to: weekTo } })).data,
  });
  const shifts = scheduleData ?? [];

  const toggleActive = useMutation({
    mutationFn: async (u: StaffUser) => api.put(`/staff/${u.id}`, { isActive: !u.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast('Staff status updated', 'success');
      setDeactivateTarget(null);
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  const deleteShift = useMutation({
    mutationFn: async (sid: string) => api.delete(`/staff/schedule/${sid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', 'schedule'] });
      toast('Shift removed', 'success');
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  const staffName = (uid: string | null) => {
    const u = staff.find((s) => s.id === uid);
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '—';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Staff Directory"
          subtitle={`${staff.length} team members`}
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New Staff
            </Button>
          }
        />
        <CardBody>
          {isLoading ? (
            <SkeletonRows rows={5} cols={5} />
          ) : staff.length === 0 ? (
            <EmptyState icon={UserCog} title="No staff" message="Add your first team member." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Email</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {staff.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar first={u.firstName} last={u.lastName} url={u.avatarUrl} size="sm" />
                        <span className="font-medium text-night-100">
                          {u.firstName} {u.lastName}
                        </span>
                      </div>
                    </TD>
                    <TD className="text-night-400">{u.email}</TD>
                    <TD>
                      <Badge tone="blue">{ROLE_LABELS[u.role]}</Badge>
                    </TD>
                    <TD>
                      <Badge tone={u.isActive ? 'green' : 'slate'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(u)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeactivateTarget(u)}>
                          {u.isActive ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="This Week's Schedule"
          subtitle={`${formatDate(weekFrom)} – ${formatDate(weekTo)}`}
          action={
            <Button variant="secondary" onClick={() => setShiftOpen(true)}>
              <CalendarPlus className="h-4 w-4" /> Add Shift
            </Button>
          }
        />
        <CardBody>
          {shifts.length === 0 ? (
            <EmptyState title="No shifts scheduled" message="Add shifts to build this week's roster." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Staff</TH>
                  <TH>Role</TH>
                  <TH>Shift</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {shifts.map((s) => (
                  <TR key={s.id}>
                    <TD className="text-night-300">{formatDate(s.date)}</TD>
                    <TD className="font-medium text-night-100">{staffName(s.userId)}</TD>
                    <TD className="text-night-400">{s.roleThatDay ?? '—'}</TD>
                    <TD className="tabular-nums text-night-300">
                      {formatTime(s.shiftStart)} – {formatTime(s.shiftEnd)}
                    </TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteShift.mutate(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <StaffFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      <StaffFormModal open={!!editTarget} onClose={() => setEditTarget(null)} member={editTarget} />
      <ShiftModal open={shiftOpen} onClose={() => setShiftOpen(false)} staff={staff} />
      <ConfirmDialog
        open={!!deactivateTarget}
        title={deactivateTarget?.isActive ? 'Deactivate staff member?' : 'Reactivate staff member?'}
        message={
          deactivateTarget?.isActive
            ? `${deactivateTarget?.firstName} ${deactivateTarget?.lastName} will lose access until reactivated.`
            : `${deactivateTarget?.firstName} ${deactivateTarget?.lastName} will regain access.`
        }
        confirmLabel={deactivateTarget?.isActive ? 'Deactivate' : 'Reactivate'}
        danger={deactivateTarget?.isActive ?? false}
        onConfirm={async () => {
          if (deactivateTarget) await toggleActive.mutateAsync(deactivateTarget);
        }}
        onClose={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
