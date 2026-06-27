import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench, Plus, AlertTriangle } from 'lucide-react';
import { api, apiError } from '@/lib/api';
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
  SkeletonRows,
  EmptyState,
  Modal,
  Input,
  Textarea,
} from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import {
  MAINTENANCE_AREAS,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  humanize,
} from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import type { MaintenanceLog, StaffUser } from '@/lib/types';

const createSchema = z.object({
  area: z.enum(MAINTENANCE_AREAS),
  issueType: z.string().min(1, 'Required'),
  priority: z.enum(MAINTENANCE_PRIORITIES),
  description: z.string().min(1, 'Required'),
});
type CreateValues = z.infer<typeof createSchema>;

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { area: 'hole_1', priority: 'medium', issueType: '', description: '' },
  });

  const mutation = useMutation({
    mutationFn: async (v: CreateValues) => (await api.post('/maintenance', v)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      toast('Issue logged', 'success');
      reset();
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log Maintenance Issue"
      description="Report a course or facility issue"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="maint-form" type="submit" loading={mutation.isPending}>
            Log Issue
          </Button>
        </>
      }
    >
      <form id="maint-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
        <Select label="Area" options={MAINTENANCE_AREAS.map((a) => ({ value: a, label: humanize(a) }))} {...register('area')} />
        <Select label="Priority" options={MAINTENANCE_PRIORITIES.map((p) => ({ value: p, label: humanize(p) }))} {...register('priority')} />
        <div className="sm:col-span-2">
          <Input label="Issue type" required placeholder="e.g. Irrigation, Mowing, Bunker" {...register('issueType')} error={errors.issueType?.message} />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Description" required {...register('description')} error={errors.description?.message} />
        </div>
      </form>
    </Modal>
  );
}

const updateSchema = z.object({
  status: z.enum(MAINTENANCE_STATUSES),
  priority: z.enum(MAINTENANCE_PRIORITIES),
  assignedTo: z.string().optional(),
  description: z.string().optional(),
});
type UpdateValues = z.infer<typeof updateSchema>;

function UpdateModal({
  log,
  staff,
  onClose,
}: {
  log: MaintenanceLog | null;
  staff: StaffUser[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const { register, handleSubmit } = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
    values: {
      status: (log?.status ?? 'open') as UpdateValues['status'],
      priority: (log?.priority ?? 'medium') as UpdateValues['priority'],
      assignedTo: log?.assignedTo ?? '',
      description: log?.description ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: UpdateValues) => {
      const payload: Record<string, unknown> = { ...v };
      if (payload.assignedTo === '') payload.assignedTo = null;
      return (await api.put(`/maintenance/${log!.id}`, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      toast('Issue updated', 'success');
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  return (
    <Modal
      open={!!log}
      onClose={onClose}
      title="Update Issue"
      description={log ? `${humanize(log.area)} · ${log.issueType}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="maint-update-form" type="submit" loading={mutation.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form id="maint-update-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
        <Select label="Status" options={MAINTENANCE_STATUSES.map((s) => ({ value: s, label: humanize(s) }))} {...register('status')} />
        <Select label="Priority" options={MAINTENANCE_PRIORITIES.map((p) => ({ value: p, label: humanize(p) }))} {...register('priority')} />
        <div className="sm:col-span-2">
          <Select
            label="Assign to"
            placeholder="Unassigned"
            options={staff.map((u) => ({ value: u.id, label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email }))}
            {...register('assignedTo')}
          />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Description" {...register('description')} />
        </div>
      </form>
    </Modal>
  );
}

export function Maintenance() {
  const canManage = useAuthStore((s) => s.hasMinRole('manager'));
  const canUpdate = useAuthStore((s) => s.hasMinRole('staff'));
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<MaintenanceLog | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', { status, priority }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (priority) params.priority = priority;
      return (await api.get<MaintenanceLog[]>('/maintenance', { params })).data;
    },
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => (await api.get<StaffUser[]>('/staff')).data,
    enabled: canManage,
  });
  const staff = staffData ?? [];
  const staffName = (uid: string | null) => {
    if (!uid) return '—';
    const u = staff.find((s) => s.id === uid);
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : 'Assigned';
  };

  const logs = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          className="w-auto"
          placeholder="All statuses"
          options={MAINTENANCE_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <Select
          className="w-auto"
          placeholder="All priorities"
          options={MAINTENANCE_PRIORITIES.map((p) => ({ value: p, label: humanize(p) }))}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
        <Button className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Log Issue
        </Button>
      </div>

      <Card className="card-pad">
        {isLoading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No maintenance issues"
            message={status || priority ? 'No issues match these filters.' : 'Course and facility issues will appear here.'}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Area</TH>
                <TH>Issue</TH>
                <TH>Priority</TH>
                <TH>Status</TH>
                <TH>Assigned</TH>
                <TH>Reported</TH>
                {canUpdate && <TH />}
              </TR>
            </THead>
            <TBody>
              {logs.map((l) => (
                <TR key={l.id}>
                  <TD className="text-night-300">{humanize(l.area)}</TD>
                  <TD>
                    <p className="font-medium text-night-100">{l.issueType}</p>
                    <p className="max-w-md truncate text-xs text-night-500">{l.description}</p>
                  </TD>
                  <TD>
                    {l.priority === 'critical' ? (
                      <span className="inline-flex items-center gap-1 text-red-300">
                        <AlertTriangle className="h-3 w-3" /> <StatusBadge status={l.priority} />
                      </span>
                    ) : (
                      <StatusBadge status={l.priority} />
                    )}
                  </TD>
                  <TD>
                    <StatusBadge status={l.status} />
                  </TD>
                  <TD className="text-night-400">{staffName(l.assignedTo)}</TD>
                  <TD className="text-night-400">{formatDateTime(l.createdAt)}</TD>
                  {canUpdate && (
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setUpdateTarget(l)}>
                        Update
                      </Button>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <UpdateModal log={updateTarget} staff={staff} onClose={() => setUpdateTarget(null)} />
    </div>
  );
}
