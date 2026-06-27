import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Flag, MailCheck } from 'lucide-react';
import { Button, Input } from '@/components/ui';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit() {
    // No public reset endpoint in the API; simulate the standard "if it exists" flow.
    await new Promise((r) => setTimeout(r, 600));
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-fairway-500">
            <Flag className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">Reset password</h1>
          <p className="mt-1 text-sm text-night-400">
            We'll email you a link to reset your password
          </p>
        </div>

        <div className="card card-pad">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fairway-500/15 text-fairway-400">
                <MailCheck className="h-6 w-6" />
              </div>
              <p className="text-sm text-night-200">
                If an account exists for <span className="font-medium text-white">{getValues('email')}</span>,
                you'll receive reset instructions shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@club.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" loading={isSubmitting} className="w-full">
                Send reset link
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm text-night-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
