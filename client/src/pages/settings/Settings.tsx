import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Upload, Save } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  PageLoader,
  EmptyState,
  Avatar,
} from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { humanize } from '@/lib/constants';
import type { Club } from '@/lib/types';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function Settings() {
  const clubId = useAuthStore((s) => s.user?.clubId ?? '');
  const canEdit = useAuthStore((s) => s.hasMinRole('club_owner'));
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: club, isLoading, isError } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => (await api.get<Club>(`/clubs/${clubId}`)).data,
    enabled: !!clubId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: club?.name ?? '',
      email: club?.email ?? '',
      phone: club?.phone ?? '',
      address: club?.address ?? '',
      city: club?.city ?? '',
      state: club?.state ?? '',
      country: club?.country ?? '',
      timezone: club?.timezone ?? '',
      currency: club?.currency ?? '',
    },
  });

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = { ...v, email: v.email || null };
      return (await api.put<Club>(`/clubs/${clubId}`, payload)).data;
    },
    onSuccess: (updated) => {
      qc.setQueryData(['club', clubId], updated);
      qc.invalidateQueries({ queryKey: ['club', clubId] });
      toast('Settings saved', 'success');
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  const uploadLogo = useMutation({
    mutationFn: async (dataUrl: string) =>
      (await api.post<{ logoUrl: string }>(`/clubs/${clubId}/upload-logo`, { dataUrl })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club', clubId] });
      toast('Logo updated', 'success');
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('Logo must be under 2 MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => uploadLogo.mutate(reader.result as string);
    reader.onerror = () => toast('Could not read file', 'error');
    reader.readAsDataURL(file);
  }

  if (isLoading) return <PageLoader />;
  if (isError || !club) {
    return (
      <EmptyState
        icon={Building2}
        title="Club not found"
        message="Unable to load club settings."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Branding" subtitle="Your club logo appears across the app" />
        <CardBody className="flex flex-wrap items-center gap-5">
          <Avatar first={club.name} url={club.logoUrl} size="lg" />
          <div className="space-y-1">
            <p className="font-medium text-night-100">{club.name}</p>
            <p className="text-sm text-night-400">{club.plan ? humanize(club.plan) : 'Standard'} plan</p>
            {canEdit && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                loading={uploadLogo.isPending}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Upload logo
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Club Profile" subtitle="Contact details and regional preferences" />
        <CardBody>
          <form
            id="settings-form"
            onSubmit={handleSubmit((v) => save.mutate(v))}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Input label="Club name" required {...register('name')} error={errors.name?.message} disabled={!canEdit} />
            </div>
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} disabled={!canEdit} />
            <Input label="Phone" {...register('phone')} disabled={!canEdit} />
            <div className="sm:col-span-2">
              <Input label="Address" {...register('address')} disabled={!canEdit} />
            </div>
            <Input label="City" {...register('city')} disabled={!canEdit} />
            <Input label="State / Region" {...register('state')} disabled={!canEdit} />
            <Input label="Country" {...register('country')} disabled={!canEdit} />
            <Input label="Timezone" placeholder="e.g. America/New_York" {...register('timezone')} disabled={!canEdit} />
            <Input label="Currency" placeholder="e.g. USD" {...register('currency')} disabled={!canEdit} />
          </form>
        </CardBody>
        {canEdit && (
          <div className="flex justify-end border-t border-night-800 px-5 py-4">
            <Button form="settings-form" type="submit" loading={save.isPending} disabled={!isDirty}>
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
