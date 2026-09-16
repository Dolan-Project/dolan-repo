"use client";

import { useMemo, useState } from "react";
import { Field } from "@/components/auth/Field";
import { Icon } from "@/components/ui/Icon";
import { searchDomiciles } from "@/lib/domiciles";

const MAX_LENGTH = 120;

export function DomicileField({
  id,
  value,
  error,
  onChange,
}: {
  id: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const listId = `${id}-options`;
  const options = useMemo(() => searchDomiciles(query), [query]);
  const typed = query.trim();
  const exact = options.some((option) => option.label.toLocaleLowerCase("id-ID") === typed.toLocaleLowerCase("id-ID"));
  const custom = typed.length >= 2 && !exact ? typed.slice(0, MAX_LENGTH) : "";

  return (
    <Field
      id={id}
      label="Domisili Kota / Kabupaten"
      error={error}
      hint="Ketik nama kota atau kabupaten. Dipakai untuk titik kumpul terdekat."
    >
      <div className="relative">
        <Icon
          name="location_on"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
        />
        <input
          id={id}
          className="field-input field-input-icon"
          required
          maxLength={MAX_LENGTH}
          value={open ? query : value}
          placeholder="Cari, mis. Cirebon, Sleman, atau Makassar"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          onFocus={() => {
            setQuery(value);
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            const next = query.trim().slice(0, MAX_LENGTH);
            const needle = next.toLocaleLowerCase("id-ID");
            const matches = searchDomiciles(next, 20);
            const exact = matches.find((option) => option.label.toLocaleLowerCase("id-ID") === needle);
            const byName = matches.filter((option) => option.name.toLocaleLowerCase("id-ID") === needle);
            if (exact) onChange(exact.label);
            else if (byName.length === 1) onChange(byName[0]!.label);
            else if (next.length >= 2) onChange(next);
            else if (!next) onChange("");
            window.setTimeout(() => setOpen(false), 120);
          }}
        />
        {open ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-outline-variant/40 bg-white p-1 shadow-lg"
          >
            {options.map((option) => (
              <li key={option.label}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-primary-fixed/50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.label);
                    setQuery(option.label);
                    setOpen(false);
                  }}
                >
                  <span className="type-label text-on-surface">{option.name}</span>
                  <span className="type-caption text-on-surface-variant">{option.province}</span>
                </button>
              </li>
            ))}
            {custom ? (
              <li>
                <button
                  type="button"
                  role="option"
                  className="w-full rounded-lg px-3 py-2 text-left type-label text-primary hover:bg-primary-fixed/50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(custom);
                    setQuery(custom);
                    setOpen(false);
                  }}
                >
                  Gunakan “{custom}”
                </button>
              </li>
            ) : null}
            {options.length === 0 && !custom ? (
              <li className="px-3 py-2 type-caption text-on-surface-variant">Ketik minimal 2 huruf.</li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
