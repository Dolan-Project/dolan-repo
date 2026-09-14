"use client";

import { useId, useMemo, useState } from "react";
import { Field } from "@/components/auth/Field";
import { Icon } from "@/components/ui/Icon";
import { searchGeoPlaces } from "@/mocks/geo";

export function PlacePicker({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  excludeLabel,
  placeholder,
  icon = "location_on",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  error?: string;
  excludeLabel?: string;
  placeholder?: string;
  icon?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(
    () => searchGeoPlaces(value, { excludeLabel }).slice(0, 6),
    [value, excludeLabel],
  );

  return (
    <Field id={id} label={label} hint={open ? undefined : hint} error={error}>
      <div className="relative">
        <input
          id={id}
          className="field-input field-input-icon"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
        />
        <Icon name={icon} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-primary" />
        {open && suggestions.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-1 shadow-lg"
          >
            {suggestions.map((place) => (
              <li key={place.id} role="option" aria-selected={place.label === value}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left hover:bg-surface-container-low"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(place.label);
                    setOpen(false);
                  }}
                >
                  <span className="type-label text-on-surface">{place.label}</span>
                  <span className="type-caption text-on-surface-variant">
                    {place.city}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
