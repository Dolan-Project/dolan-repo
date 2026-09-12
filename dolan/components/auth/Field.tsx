type FieldProps = {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
  labelExtra?: React.ReactNode;
};

export function Field({
  id,
  label,
  error,
  children,
  hint,
  labelExtra,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="type-label text-on-surface">
          {label}
        </label>
        {labelExtra}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="type-caption text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="type-caption text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  );
}
