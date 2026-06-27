import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Flag } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { apiError } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { label: 'Club Owner', email: 'admin@pinevalley.com', password: 'Password123!' },
  { label: 'Manager', email: 'manager@pinevalley.com', password: 'Password123!' },
  { label: 'Super Admin', email: 'demo@fairway360.com', password: 'Demo123!' },
];

export function Login() {
  const status = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(apiError(err, 'Unable to sign in'));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-fairway-500">
            <Flag className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-night-400">Sign in to your Fairway360 account</p>
        </div>

        <div className="card card-pad">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@club.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            {formError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {formError}
              </div>
            )}
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-fairway-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" loading={isSubmitting} className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-6 border-t border-night-800 pt-4">
            <p className="mb-2 text-center text-xs uppercase tracking-wide text-night-500">
              Demo accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setValue('email', a.email);
                    setValue('password', a.password);
                  }}
                  className="rounded-lg border border-night-700 bg-night-800 px-2 py-2 text-xs font-medium text-night-200 hover:border-fairway-500 hover:text-white"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
