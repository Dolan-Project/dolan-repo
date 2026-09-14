"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Field } from "@/components/auth/Field";
import { Icon } from "@/components/ui/Icon";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { searchGeoPlaces } from "@/mocks/geo";

type Suggestion = { id: string; label: string; city: string };

async function searchLivePlaces(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  const params = new URLSearchParams({ q: query, page: "1", limit: "6" });
  const response = await fetch(`${baseUrl}/search/places?${params}`, {
    signal,
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    success?: boolean;
    data?: Array<{ googlePlaceId: string; name: string; city?: string | null }>;
  };
  if (!payload.success || !Array.isArray(payload.data)) return [];
  return payload.data.map((place) => ({
    id: place.googlePlaceId,
    label: place.name,
    city: place.city ?? "",
  }));
}

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
  const [liveSuggestions, setLiveSuggestions] = useState<Suggestion[]>([]);
  const useMock = shouldUseMockApi();

  const mockSuggestions = useMemo(
    () => searchGeoPlaces(value, { excludeLabel }).slice(0, 6).map((place) => ({
      id: place.id,
      label: place.label,
      city: place.city,
    })),
    [value, excludeLabel],
  );

  useEffect(() => {
    if (useMock || value.trim().length < 2) {
      setLiveSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchLivePlaces(value.trim(), controller.signal)
        .then((rows) => {
          setLiveSuggestions(
            excludeLabel
              ? rows.filter((row) => row.label.toLocaleLowerCase("id-ID") !== excludeLabel.toLocaleLowerCase("id-ID"))
              : rows,
          );
        })
        .catch(() => {
          if (!controller.signal.aborted) setLiveSuggestions([]);
        });
    }, 280);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, useMock, excludeLabel]);

  const suggestions = useMock ? mockSuggestions : liveSuggestions;

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
                  {place.city ? (
                    <span className="type-caption text-on-surface-variant">{place.city}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
