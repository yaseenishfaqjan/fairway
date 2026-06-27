import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function Field({
  label,
  error,
  hint,
  required,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-night-400">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, required, className, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <input ref={ref} className={cn('input', error && 'border-red-500', className)} {...props} />
    </Field>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, required, className, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <textarea
        ref={ref}
        className={cn('input min-h-[88px] resize-y', error && 'border-red-500', className)}
        {...props}
      />
    </Field>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, required, className, options, placeholder, ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <select ref={ref} className={cn('input', error && 'border-red-500', className)} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
});
