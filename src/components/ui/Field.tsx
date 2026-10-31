import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface Base {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optionalLabel?: string;
  className?: string;
}

function Wrap({ id, label, error, hint, optionalLabel, required, className, children }: Base & { required?: boolean; children: ReactNode }) {
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id} className="field-label">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-nut">
            *
          </span>
        ) : optionalLabel ? (
          <span className="opt"> ({optionalLabel})</span>
        ) : null}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function TextField({ id, label, error, hint, optionalLabel, className, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrap {...{ id, label, error, hint, optionalLabel, className }} required={props.required}>
      <input id={id} name={id} className="field-input" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...props} />
    </Wrap>
  );
}

export function TextArea({ id, label, error, hint, optionalLabel, className, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrap {...{ id, label, error, hint, optionalLabel, className }} required={props.required}>
      <textarea id={id} name={id} className="field-input" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...props} />
    </Wrap>
  );
}

export function SelectField({
  id,
  label,
  error,
  hint,
  optionalLabel,
  className,
  options,
  ...props
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { options: Array<[string, string]> }) {
  return (
    <Wrap {...{ id, label, error, hint, optionalLabel, className }} required={props.required}>
      <select id={id} name={id} className="field-input" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...props}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}
