"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Field } from "@/components/auth/Field";
import { Icon } from "@/components/ui/Icon";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { searchGeoPlaces } from "@/mocks/geo";

export type PlaceSuggestion = {
  id: string;
  label: string;
  city: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string | null;
  photoName?: string | null;
  photoUri?: string | null;
};

async function searchLivePlaces(query: string, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  const params = new URLSearchParams({ q: query, page: "1", limit: "8" });
  const response = await fetch(`${baseUrl}/search/places?${params}`, {
    signal,
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    success?: boolean;
    data?: Array<{
      googlePlaceId: string;
      name: string;
      city?: string | null;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string | null;
      photoName?: string | null;
      photoUri?: string | null;
    }>;
  };
  if (!payload.success || !Array.isArray(payload.data)) return [];
  return payload.data.map((place) => ({
    id: place.googlePlaceId,
    label: place.name,
    city: place.city ?? "",
    latitude: place.latitude,
    longitude: place.longitude,
    formattedAddress: place.formattedAddress ?? null,
    photoName: place.photoName ?? null,
    photoUri: place.photoUri ?? null,
  }));
}

export function PlacePicker({
  id,
  label,
  value,
  onChange,
  onSelectPlace,
  nearbyCity,
  hint,
  error,
  excludeLabel,
  placeholder,
  icon = "location_on",
  autoSelectOnBlur = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  onSelectPlace?: (place: PlaceSuggestion) => void;
  nearbyCity?: string;
  hint?: string;
  error?: string;
  excludeLabel?: string;
  placeholder?: string;
  icon?: string;
  autoSelectOnBlur?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  const [liveSuggestions, setLiveSuggestions] = useState<PlaceSuggestion[]>([]);
  const useMock = shouldUseMockApi();
  const query = focused ? draft : value;

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  const mockSuggestions = useMemo(
    () =>
      searchGeoPlaces(query, { excludeLabel, nearbyCity }).slice(0, 6).map((place) => ({
        id: place.id,
        label: place.label,
        city: place.city,
        latitude: place.latitude,
        longitude: place.longitude,
        formattedAddress: place.label,
      })),
    [query, excludeLabel, nearbyCity],
  );

  useEffect(() => {
    if (useMock || query.trim().length < 2) {
      setLiveSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchLivePlaces(query.trim(), controller.signal)
        .then((rows) => {
          if (controller.signal.aborted) return;
          setLiveSuggestions(
            excludeLabel
              ? rows.filter((row) => row.label.toLocaleLowerCase("id-ID") !== excludeLabel.toLocaleLowerCase("id-ID"))
              : rows,
          );
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setLiveSuggestions([]);
        });
    }, 280);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, useMock, excludeLabel]);

  const suggestions = liveSuggestions.length > 0 ? liveSuggestions : mockSuggestions;

  return (
    <Field id={id} label={label} hint={open ? undefined : hint} error={error || undefined}>
      <div className="relative">
        <input
          id={id}
          className="field-input field-input-icon"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={(event) => {
            setFocused(true);
            setOpen(true);
            if (onSelectPlace && autoSelectOnBlur) event.currentTarget.select();
          }}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            onChange(next);
            setOpen(true);
          }}
          onBlur={() => {
            const typed = draft.trim();
            window.setTimeout(() => {
              setOpen(false);
              setFocused(false);
              if (!onSelectPlace || !autoSelectOnBlur) return;
              if (!typed) return;
              const pool = suggestions.length ? suggestions : mockSuggestions;
              const photographed = pool.find((row) => ("photoName" in row && row.photoName) || ("photoUri" in row && row.photoUri));
              const exact = pool.find((place) => place.label.toLocaleLowerCase("id-ID") === typed.toLocaleLowerCase("id-ID"));
              const hit = exact ?? photographed ?? pool[0] ?? searchGeoPlaces(typed, { nearbyCity, excludeLabel })[0];
              if (!hit) return;
              const needle = typed.toLocaleLowerCase("id-ID");
              const hitLabel = hit.label.toLocaleLowerCase("id-ID");
              const city = hit.city.toLocaleLowerCase("id-ID");
              const matches = hitLabel === needle || city === needle || hitLabel.startsWith(needle) || (needle.length >= 3 && hitLabel.includes(needle));
              if (!matches && exact == null) return;
              setDraft(hit.label);
              onChange(hit.label);
              onSelectPlace({
                id: hit.id,
                label: hit.label,
                city: hit.city,
                latitude: hit.latitude,
                longitude: hit.longitude,
                formattedAddress: "formattedAddress" in hit ? hit.formattedAddress : hit.label,
                photoName: "photoName" in hit ? hit.photoName : null,
                photoUri: "photoUri" in hit ? hit.photoUri : null,
              });
            }, 140);
          }}
        />
        <Icon name={icon} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-primary" />
        {open && suggestions.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-outline-variant/40 bg-white p-1 shadow-lg"
          >
            {suggestions.map((place) => (
              <li key={place.id} role="option" aria-selected={place.label === query}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left hover:bg-surface-container-low"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setDraft(place.label);
                    onChange(place.label);
                    onSelectPlace?.(place);
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
