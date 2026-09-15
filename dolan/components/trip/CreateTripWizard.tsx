"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Field } from "@/components/auth/Field";
import { Icon } from "@/components/ui/Icon";
import { PlacePicker } from "@/components/trip/PlacePicker";
import { CreateTripItineraryStep } from "@/components/trip/CreateTripItineraryStep";
import type { EditableItineraryDay, EditableItineraryStop, ItineraryEditorSnapshot, ItineraryTemplateDetail, ItineraryTemplateSummary, UseTemplateResult } from "@dolan/shared";
import type { ApiError, CreateTripInput, TripDetail } from "@/lib/contracts";
import { ROUTES } from "@/lib/routes";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { buildDestinationItinerary, buildProvinceTemplateDays, clampItineraryToDestination, templateMatchesDestination } from "@/lib/destination-itinerary";
import { INDONESIA_PROVINCES, findProvinceForTemplate } from "@/lib/provinces";
import { PlacePhoto } from "@/features/explore/PlacePhoto";
import {
  applyTemplatePrefill,
  applyPublicMeetingPoint,
  availableBudgetPool,
  budgetItemsFromPlan,
  canRegenerate,
  estimateItineraryBudget,
  firstStopMeetingLabel,
  formatRupiah,
  appendVisitStop,
  mergeLockedStops,
  packItinerarySchedule,
  placeTicketEstimate,
  hydrateItineraryPlaces,
  reorderStopsInDay,
  toItinerarySaveDays,
  tripTitleFromDestination,
  validateWizardBasics,
  WIZARD_STEPS,
  type WizardPath,
} from "@/lib/template-itinerary";
import { generateAlternative, generateInitialItinerary, saveItineraryVersion } from "@/features/itinerary/api";
import { INITIAL_BUDGET_ITEMS, createBudgetSummary } from "@/features/itinerary/mock-data";
import { provinceCoverUrl } from "@/lib/province-cover";
import { PackingListField } from "@/components/trip/PackingListField";
import { TemplateRoutePeek } from "@/components/trip/TemplateRoutePeek";

const BUDGET_PRESETS = [750_000, 1_500_000, 2_500_000, 5_000_000];

function provinceCatalogTemplates(query: string): ItineraryTemplateSummary[] {
  const city = query.trim().toLowerCase();
  return INDONESIA_PROVINCES.filter((province) => {
    if (!city) return true;
    const hay = `${province.name} ${province.capital} ${province.template.title}`.toLowerCase();
    return hay.includes(city);
  })
    .slice(0, 24)
    .map((province) => ({
      id: province.template.id,
      title: province.template.title,
      city: province.name,
      durationDays: province.template.durationDays,
      source: "CURATED" as const,
      sourceLabel: "Kurasi Dolan" as const,
      usageCount: 0,
      popularityLabel: null,
      coverPlace: null,
    }));
}

function localTemplateDetail(templateIdToUse: string): ItineraryTemplateDetail | null {
  const province = INDONESIA_PROVINCES.find((item) => item.template.id === templateIdToUse);
  if (!province) return null;
  return {
    id: province.template.id,
    title: province.template.title,
    description: province.template.description,
    city: province.name,
    durationDays: province.template.durationDays,
    source: "CURATED",
    sourceLabel: "Kurasi Dolan",
    usageCount: 0,
    popularityLabel: "Populer di Dolan",
    coverPlace: null,
    transportMode: province.template.transportMode,
    days: [],
  };
}

function templateRowsFromPayload(payload: { data?: unknown }): ItineraryTemplateSummary[] | null {
  if (Array.isArray(payload.data)) return payload.data as ItineraryTemplateSummary[];
  if (payload.data && typeof payload.data === "object" && Array.isArray((payload.data as { items?: unknown }).items)) {
    return (payload.data as { items: ItineraryTemplateSummary[] }).items;
  }
  return null;
}

function newKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `trip-${Date.now()}`;
}

type CreateTripWizardProps = {
  templateId?: string;
  initialPlaceId?: string;
  initialDestination?: string;
};

export function CreateTripWizard({ templateId, initialPlaceId, initialDestination }: CreateTripWizardProps) {
  const router = useRouter();
  const idempotencyKey = useMemo(() => newKey(), []);
  const publishIdempotencyKey = useMemo(() => newKey(), []);
  const [step, setStep] = useState(templateId ? 2 : 1);
  const [path, setPath] = useState<WizardPath>(templateId ? "template" : "create");
  const [destinationCity, setDestinationCity] = useState(initialDestination ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transport, setTransport] = useState("Transportasi umum + sewa lokal");
  const [partySize, setPartySize] = useState(2);
  const [budgetAmount, setBudgetAmount] = useState(2_000_000);
  const [budgetBasis, setBudgetBasis] = useState<"PER_PERSON" | "GROUP">("PER_PERSON");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [maxParticipants, setMaxParticipants] = useState<number | "">("");
  const [genderRule, setGenderRule] = useState<"ALL_GENDERS" | "FEMALE_ONLY" | "MALE_ONLY">("ALL_GENDERS");
  const [inviteUsernames, setInviteUsernames] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateLoading, setTemplateLoading] = useState(Boolean(templateId));
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId ?? "");
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateDetail, setTemplateDetail] = useState<ItineraryTemplateDetail | null>(null);
  const [catalogTemplates, setCatalogTemplates] = useState<ItineraryTemplateSummary[]>([]);
  const [templatesError, setTemplatesError] = useState("");
  const [connections, setConnections] = useState<Array<{ username: string; displayName: string }>>([]);
  const [tripId, setTripId] = useState("");
  const [snapshot, setSnapshot] = useState<ItineraryEditorSnapshot | null>(null);
  const [days, setDays] = useState<EditableItineraryDay[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regenerateUsed, setRegenerateUsed] = useState(0);
  const [itineraryReady, setItineraryReady] = useState(false);
  const [packingItems, setPackingItems] = useState<string[]>([]);
  const [fromGroq, setFromGroq] = useState(false);

  const tripTitle = tripTitleFromDestination(destinationCity, templateTitle);
  const budgetPlan = useMemo(
    () => estimateItineraryBudget(days, availableBudgetPool(budgetAmount, budgetBasis, partySize), partySize),
    [days, budgetAmount, budgetBasis, partySize],
  );

  useEffect(() => {
    if (!templateId) return;
    const controller = new AbortController();
    fetch(`/api/v1/templates/${encodeURIComponent(templateId)}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as { success: boolean; data?: ItineraryTemplateDetail; error?: { message?: string } };
        if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message ?? "Template tidak tersedia.");
        applyChosenTemplate(payload.data);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        const local = localTemplateDetail(templateId);
        if (local) applyChosenTemplate(local);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTemplateLoading(false);
      });
    return () => controller.abort();
  }, [templateId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/users/me", { credentials: "include", signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : null))
      .then(async (payload: { success?: boolean; data?: { user?: { username?: string } } } | null) => {
        const username = payload?.data?.user?.username;
        if (!username) return;
        const [followingRes, followersRes] = await Promise.all([
          fetch(`/api/v1/users/${encodeURIComponent(username)}/following`, { credentials: "include", signal: controller.signal }),
          fetch(`/api/v1/users/${encodeURIComponent(username)}/followers`, { credentials: "include", signal: controller.signal }),
        ]);
        const [followingJson, followersJson] = await Promise.all([
          followingRes.ok ? followingRes.json() : null,
          followersRes.ok ? followersRes.json() : null,
        ]) as Array<{ success?: boolean; data?: { items?: Array<{ username: string; displayName: string }> } } | null>;
        const merged = [...(followingJson?.data?.items ?? []), ...(followersJson?.data?.items ?? [])];
        const unique = new Map(merged.map((person) => [person.username, person]));
        if (!controller.signal.aborted) setConnections([...unique.values()]);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ sort: "popular", limit: "24", page: "1" });
    if (templateQuery.trim()) params.set("city", templateQuery.trim());
    setTemplatesError("");
    const timer = window.setTimeout(() => {
      void fetch(`/api/v1/templates?${params}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
        .then(async (response) => {
          const json = (await response.json()) as {
            success?: boolean;
            data?: unknown;
            error?: { message?: string };
          };
          const rows = json.success ? templateRowsFromPayload(json) : null;
          if (!controller.signal.aborted) {
            setCatalogTemplates(rows && rows.length ? rows : provinceCatalogTemplates(templateQuery));
          }
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setCatalogTemplates(provinceCatalogTemplates(templateQuery));
          setTemplatesError("");
        });
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [templateQuery]);

  function applyChosenTemplate(detail: ItineraryTemplateDetail) {
    const prefill = applyTemplatePrefill(detail);
    setTemplateDetail(detail);
    setSelectedTemplateId(detail.id);
    setTemplateTitle(detail.title);
    setDestinationCity(prefill.destinationCity);
    setTransport(prefill.transport);
    setPath("template");
  }

  function payload(): CreateTripInput {
    const publicCapacity = visibility === "PUBLIC" ? Number(maxParticipants || 8) : undefined;
    return {
      path: path === "template" ? "template" : "ai-route",
      title: tripTitle,
      description: "",
      origin: "Titik awal belum ditentukan",
      destinationCity,
      startDate,
      endDate,
      transport,
      planningPartySize: partySize,
      budgetAmount,
      budgetBasis,
      lodgingPref: "",
      activityPrefs: [],
      visibility,
      maxParticipants: publicCapacity,
      meetingPoint: visibility === "PUBLIC" ? (firstStopMeetingLabel(days) || destinationCity) : "",
      companionNote: "",
      pace: "SEIMBANG",
      genderRule,
    };
  }

  async function chooseTemplateById(templateIdToUse: string) {
    setFormError("");
    setTemplateLoading(true);
    try {
      const response = await fetch(`/api/v1/templates/${encodeURIComponent(templateIdToUse)}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const json = await response.json() as { success: boolean; data?: ItineraryTemplateDetail; error?: { message?: string } };
      if (!response.ok || !json.success || !json.data) throw new Error(json.error?.message ?? "Template tidak tersedia.");
      applyChosenTemplate(json.data);
    } catch {
      const local = localTemplateDetail(templateIdToUse);
      if (local) applyChosenTemplate(local);
      else setFormError("Template tidak dapat dimuat.");
    } finally {
      setTemplateLoading(false);
    }
  }

  function goFromStep1() {
    if (path === "template" && !selectedTemplateId) {
      setFormError("Pilih dulu satu kartu template. Kartu yang dipilih punya bingkai biru.");
      return;
    }
    setFormError("");
    setStep(2);
  }

  function goFromStep2() {
    const errors = validateWizardBasics({ destinationCity, startDate, endDate, budgetAmount, partySize, budgetBasis });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setFormError(errors.budgetAmount?.includes("jangkauan") ? errors.budgetAmount : "Lengkapi destinasi, tanggal, jumlah orang, dan budget dulu.");
      return;
    }
    setFormError("");
    setItineraryReady(false);
    setDays([]);
    setStep(3);
    void prepareItinerary({ force: true });
  }

  function finalizeWizardDays(raw: EditableItineraryDay[]) {
    return packItinerarySchedule(
      clampItineraryToDestination(hydrateItineraryPlaces(raw, destinationCity), destinationCity),
    );
  }

  async function ensureDraftTrip() {
    if (tripId) return tripId;
    const activeTemplateId = path === "template" ? (selectedTemplateId || templateId) : undefined;
    const created = await fetch(activeTemplateId ? `/api/v1/templates/${encodeURIComponent(activeTemplateId)}/use` : "/api/v1/trips", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(activeTemplateId ? {
        templateTitle: tripTitle,
        destinationCity,
        originLabel: "Titik awal belum ditentukan",
        startDate,
        endDate,
        transportMode: transport,
        planningPartySize: partySize,
        budgetAmount: String(budgetAmount),
        budgetBasis,
      } : payload()),
    });
    const json = (await created.json()) as { success: true; data: TripDetail | UseTemplateResult } | ApiError;
    if (!json.success) {
      setFormError(json.error.message);
      setFieldErrors(json.error.fields ?? {});
      throw new Error(json.error.message);
    }
    const createdTripId = "tripId" in json.data ? json.data.tripId : json.data.id;
    setTripId(createdTripId);
    return createdTripId;
  }

  async function prepareItinerary(options?: { force?: boolean }) {
    if (!options?.force && itineraryReady && days.length > 0) return;
    setGenerating(true);
    setFormError("");
    setFromGroq(false);
    try {
      const createdTripId = await ensureDraftTrip();
      const province = INDONESIA_PROVINCES.find((item) => item.template.id === selectedTemplateId);
      const useTemplate = path === "template" && Boolean(province) && templateMatchesDestination(province!.name, destinationCity);
      const fallbackDays = packItinerarySchedule(
        useTemplate && province
          ? buildProvinceTemplateDays(province, { startDate })
          : buildDestinationItinerary({ destination: destinationCity, startDate, endDate, variant: 0 }),
      );

      // Template path: show curated route immediately (user chose template).
      // Create / AI path: request Groq (live) or mock stand-in with same API shape.
      if (useTemplate && province) {
        const nextDays = finalizeWizardDays(
          visibility === "PUBLIC" ? applyPublicMeetingPoint(fallbackDays, true) : fallbackDays,
        );
        setDays(nextDays);
        setSelectedStopId(nextDays[0]?.stops[0]?.id ?? null);
        setSnapshot({
          tripId: createdTripId,
          tripTitle,
          destinationCity,
          startDate,
          endDate,
          activeVersionId: "wizard-v1",
          versions: [{
            id: "wizard-v1",
            tripId: createdTripId,
            versionNumber: 1,
            source: "TEMPLATE",
            summary: "Rute dari template kurasi DOLAN.",
            assumptions: ["Estimasi biaya menyesuaikan budget trip"],
            days: nextDays,
            budget: createBudgetSummary(INITIAL_BUDGET_ITEMS),
            createdAt: new Date().toISOString(),
          }],
          checklist: [],
        });
        setItineraryReady(true);
        return;
      }

      const generated = await generateInitialItinerary({
        tripId: createdTripId,
        tripTitle,
        preferences: {
          destinationCity,
          startDate,
          endDate,
          partySize,
          budgetAmount,
          budgetBasis,
          transport,
          regenerateMode: "balanced",
          minStopsPerDay: 7,
          maxStopsPerDay: 8,
        },
        fallbackDays,
        budgetItems: INITIAL_BUDGET_ITEMS,
        sourceLabel: "AI",
      }).catch(async (error) => {
        // Live Groq often fails on place verification / provider — keep wizard usable.
        const message = error instanceof Error ? error.message : "Generate Groq gagal.";
        return {
          snapshot: {
            tripId: createdTripId,
            tripTitle,
            destinationCity,
            startDate,
            endDate,
            activeVersionId: "wizard-fallback",
            versions: [{
              id: "wizard-fallback",
              tripId: createdTripId,
              versionNumber: 1,
              source: "AI" as const,
              summary: `Cadangan lokal untuk ${destinationCity} setelah Groq gagal.`,
              assumptions: [message],
              days: fallbackDays,
              budget: createBudgetSummary(INITIAL_BUDGET_ITEMS),
              createdAt: new Date().toISOString(),
            }],
            checklist: [],
          },
          days: fallbackDays,
          job: null,
          fromGroq: false as const,
        };
      });
      const nextDays = finalizeWizardDays(
        visibility === "PUBLIC" ? applyPublicMeetingPoint(generated.days, true) : generated.days,
      );
      setDays(nextDays);
      setSelectedStopId(nextDays[0]?.stops[0]?.id ?? null);
      setSnapshot({
        ...generated.snapshot,
        tripId: createdTripId,
        tripTitle,
        destinationCity,
        startDate,
        endDate,
        versions: generated.snapshot.versions.map((version, index) =>
          index === 0 ? { ...version, days: nextDays, tripId: createdTripId } : version,
        ),
      });
      setFromGroq(generated.fromGroq);
      setItineraryReady(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Itinerary belum bisa disusun.");
      setStep(2);
    } finally {
      setGenerating(false);
    }
  }

  function updateStop(dayId: string, stopId: string, patch: Partial<EditableItineraryStop>) {
    setDays((current) => {
      const previous = current.flatMap((day) => day.stops).find((stop) => stop.id === stopId);
      const next = current.map((day) => (
        day.id === dayId
          ? { ...day, stops: day.stops.map((stop) => (stop.id === stopId ? { ...stop, ...patch } : stop)) }
          : day
      ));
      if (!patch.place) return next;
      const placeChanged =
        previous?.place?.latitude !== patch.place.latitude ||
        previous?.place?.longitude !== patch.place.longitude ||
        Boolean(patch.customTitle && patch.customTitle !== (previous?.customTitle || previous?.place?.name));
      if (!placeChanged) return next;
      const packed = packItinerarySchedule(next);
      return visibility === "PUBLIC" ? applyPublicMeetingPoint(packed, true) : packed;
    });
  }

  function addStop(dayId: string, pick: { name: string; city: string; latitude?: number; longitude?: number }) {
    setDays((current) => {
      const next = appendVisitStop(current, dayId, { ...pick, city: pick.city || destinationCity, lock: true });
      return visibility === "PUBLIC" ? applyPublicMeetingPoint(next, true) : next;
    });
  }

  function removeStop(dayId: string, stopId: string) {
    setDays((current) => {
      const next = packItinerarySchedule(current.map((day) => (
        day.id === dayId ? { ...day, stops: day.stops.filter((stop) => stop.id !== stopId) } : day
      )));
      return visibility === "PUBLIC" ? applyPublicMeetingPoint(next, true) : next;
    });
  }

  async function regenerate() {
    if (!snapshot || generating || !canRegenerate(regenerateUsed)) return;
    setGenerating(true);
    setFormError("");
    try {
      const lockedKeys = new Set(
        days.flatMap((day) => day.stops.filter((stop) => stop.isLocked).map((stop) => (stop.customTitle || stop.place?.name || "").trim().toLocaleLowerCase("id-ID"))),
      );
      const currentNames = days.flatMap((day) => day.stops.map((stop) => stop.customTitle || stop.place?.name || ""));
      const excludeNames = (budgetPlan.overBudget
        ? currentNames.filter((name) => placeTicketEstimate(name) > 0)
        : currentNames
      ).filter((name) => !lockedKeys.has(name.trim().toLocaleLowerCase("id-ID")));
      const createdTripId = tripId || (await ensureDraftTrip());
      const localFallback = buildDestinationItinerary({
        destination: destinationCity,
        startDate,
        endDate,
        variant: regenerateUsed + 1,
        excludeNames,
        preferCheaper: budgetPlan.overBudget,
      });
      const next = await generateAlternative(
        { ...snapshot, tripId: createdTripId },
        localFallback,
        budgetItemsFromPlan(days, budgetPlan).length ? budgetItemsFromPlan(days, budgetPlan) : INITIAL_BUDGET_ITEMS,
        budgetPlan.overBudget ? "cheaper" : "alternative",
        {
          destinationCity,
          startDate,
          endDate,
          partySize,
          budgetAmount,
          budgetBasis,
          transport,
          minStopsPerDay: 7,
          maxStopsPerDay: 8,
        },
      ).catch(() => ({
        snapshot: {
          ...snapshot,
          tripId: createdTripId,
          versions: [{
            id: `wizard-regen-${regenerateUsed + 1}`,
            tripId: createdTripId,
            versionNumber: (snapshot.versions[0]?.versionNumber ?? 1) + 1,
            source: "REGENERATED" as const,
            summary: "Alternatif lokal setelah generate gagal.",
            assumptions: ["Cadangan lokal"],
            days: localFallback,
            budget: snapshot.versions[0]?.budget ?? createBudgetSummary(INITIAL_BUDGET_ITEMS),
            createdAt: new Date().toISOString(),
          }, ...snapshot.versions],
        },
        job: null,
      }));
      const nextDays = finalizeWizardDays(
        mergeLockedStops(
          visibility === "PUBLIC"
            ? applyPublicMeetingPoint(next.snapshot.versions[0]?.days ?? localFallback, true)
            : (next.snapshot.versions[0]?.days ?? localFallback),
          days,
        ),
      );
      setSnapshot({
        ...next.snapshot,
        versions: [{ ...next.snapshot.versions[0]!, days: nextDays }, ...next.snapshot.versions.slice(1)],
      });
      setDays(nextDays);
      setSelectedStopId(nextDays[0]?.stops[0]?.id ?? selectedStopId);
      setFromGroq(!shouldUseMockApi());
      setRegenerateUsed((used) => used + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Regenerate gagal.");
    } finally {
      setGenerating(false);
    }
  }

  async function savePacking(createdTripId: string) {
    const titles = packingItems.map((item) => item.trim()).filter(Boolean);
    await Promise.all(titles.map((title) => fetch(`/api/v1/trips/${encodeURIComponent(createdTripId)}/checklist`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, isCompleted: false, dueDate: null }),
    })));
  }

  async function persistItineraryThenInvite() {
    const budgetError = validateWizardBasics({ destinationCity, startDate, endDate, budgetAmount, partySize, budgetBasis }).budgetAmount;
    if (budgetError) {
      setFieldErrors({ budgetAmount: budgetError });
      setFormError(budgetError);
      return;
    }
    if (!days.length) {
      setFormError("Itinerary masih kosong. Tunggu generate selesai atau pilih template.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const packed = packItinerarySchedule(days);
      setDays(packed);
      const createdTripId = await ensureDraftTrip();
      const current = {
        ...(snapshot ?? {
          tripId: createdTripId,
          tripTitle,
          destinationCity,
          startDate,
          endDate,
          activeVersionId: "wizard-v1",
          versions: [],
          checklist: [],
        }),
        tripId: createdTripId,
      } satisfies ItineraryEditorSnapshot;
      const items = budgetItemsFromPlan(packed, budgetPlan);
      const saved = await saveItineraryVersion(current, {
        baseVersionId: current.activeVersionId || "wizard-v1",
        summary: path === "template" ? "Itinerary dari template, disesuaikan di wizard" : "Itinerary AI yang sudah disetujui sesuai budget",
        days: toItinerarySaveDays(packed),
        budgetItems: items.length ? items : INITIAL_BUDGET_ITEMS,
      });
      await savePacking(createdTripId);
      setSnapshot({ ...saved, tripId: createdTripId });
      setDays(saved.versions[0]?.days?.length ? saved.versions[0].days : packed);
      setStep(4);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Gagal menyimpan itinerary.");
    } finally {
      setPending(false);
    }
  }

  async function persistCurrentItinerary(createdTripId: string) {
    const packed = packItinerarySchedule(days);
    const current = {
      ...(snapshot ?? {
        tripId: createdTripId,
        tripTitle,
        destinationCity,
        startDate,
        endDate,
        activeVersionId: "wizard-v1",
        versions: [],
        checklist: [],
      }),
      tripId: createdTripId,
    } satisfies ItineraryEditorSnapshot;
    const items = budgetItemsFromPlan(packed, budgetPlan);
    await saveItineraryVersion(current, {
      baseVersionId: current.activeVersionId || "wizard-v1",
      summary: path === "template" ? "Itinerary dari template, disesuaikan di wizard" : "Itinerary AI yang sudah disetujui sesuai budget",
      days: toItinerarySaveDays(packed),
      budgetItems: items.length ? items : INITIAL_BUDGET_ITEMS,
    });
  }

  async function finish() {
    if (pending) return;
    if (visibility === "PUBLIC" && maxParticipants !== "" && Number(maxParticipants) < 2) {
      setFormError("Kapasitas publik minimal 2 termasuk host.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const createdTripId = await ensureDraftTrip();
      if (days.length) {
        await persistCurrentItinerary(createdTripId);
      }
      await savePacking(createdTripId);
      await fetch(`/api/v1/trips/${createdTripId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      for (const username of inviteUsernames) {
        await fetch(`/api/v1/trips/${createdTripId}/invitations`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channel: "DOLAN", username: `@${username}` }),
        }).catch(() => undefined);
      }
      if (visibility === "PUBLIC") {
        const published = await fetch(`/api/v1/trips/${createdTripId}/publish`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json", "idempotency-key": publishIdempotencyKey },
          body: JSON.stringify({ confirmPublish: true, visibility }),
        });
        const pubJson = (await published.json()) as { success: true } | ApiError;
        if (!pubJson.success) {
          setFormError(pubJson.error.message);
          setPending(false);
          return;
        }
      }
      router.push(ROUTES.tripSaya);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Trip belum tersimpan.");
    } finally {
      setPending(false);
    }
  }

  const templates = catalogTemplates;

  return (
    <div className={`${step === 3 ? "mx-auto max-w-6xl rounded-[1.5rem] bg-white" : "mx-auto max-w-3xl"} px-margin py-8 md:px-margin-desktop md:py-12`}>
      <p className="type-micro font-extrabold uppercase tracking-[0.18em] text-primary">Buat trip</p>
      <h1 className="type-title mt-2 text-on-surface">Rencana perjalanan, empat langkah</h1>
      <p className="type-body mt-2 max-w-2xl text-on-surface-variant">
        Destinasi, jumlah orang, dan budget dulu. AI lalu menyusun rute sekaligus estimasi biaya per tempat.
      </p>

      <WizardProgress step={step} />

      {initialPlaceId && step === 2 ? (
        <p className="mb-5 rounded-2xl bg-primary-fixed/45 px-4 py-3 type-caption text-on-surface-variant">
          Destinasi dari halaman wisata sudah dimasukkan. Lengkapi tanggal, jumlah orang, dan budget.
        </p>
      ) : null}

      {step === 1 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setPath("create");
                setTemplateDetail(null);
                setSelectedTemplateId("");
                setTemplateTitle("");
              }}
              className={`card-surface p-6 text-left ${path === "create" ? "ring-2 ring-primary" : ""}`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-fixed text-primary"><Icon name="alt_route" className="text-[22px]" /></span>
              <h2 className="type-subtitle mt-3 text-on-surface">Buat itinerary baru</h2>
              <p className="type-body mt-2 text-on-surface-variant">
                Isi destinasi, jumlah orang, tanggal, dan budget. AI mengoptimalkan rute plus estimasi biaya.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setPath("template")}
              className={`card-surface p-6 text-left ${path === "template" ? "ring-2 ring-primary" : ""}`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary-fixed text-secondary"><Icon name="map" className="text-[22px]" /></span>
              <h2 className="type-subtitle mt-3 text-on-surface">Pakai template itinerary</h2>
              <p className="type-body mt-2 text-on-surface-variant">
                Pilih rute 38 provinsi. Peta langsung muncul, biaya tetap dihitung dari budget kamu.
              </p>
            </button>
          </div>
          {path === "template" ? (
            <div className="card-surface mt-5 p-5">
              <Field id="templateQuery" label="Cari template di database" hint="Ambil dari server. Ketik kota/provinsi untuk menyaring.">
                <div className="relative">
                  <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-primary" />
                  <input id="templateQuery" className="field-input field-input-icon" value={templateQuery} onChange={(event) => setTemplateQuery(event.target.value)} placeholder="Bali, Aceh, Yogyakarta…" />
                </div>
              </Field>
              {templatesError ? <p className="mt-3 type-caption text-error">{templatesError}</p> : null}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {templates.map((template) => {
                  const selected = selectedTemplateId === template.id;
                  const province = findProvinceForTemplate({ templateId: template.id, city: template.city });
                  const cover = province ? provinceCoverUrl(province) : null;
                  return (
                    <article
                      key={template.id}
                      className={`group relative overflow-hidden rounded-[1.35rem] border bg-white text-left shadow-[0_10px_30px_rgba(15,59,94,.08)] transition ${
                        selected ? "border-primary ring-2 ring-primary" : "border-slate-200 hover:-translate-y-0.5 hover:border-primary/40"
                      }`}
                    >
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => void chooseTemplateById(template.id)}
                      >
                        <div className="relative h-36 bg-surface-container">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt={template.city} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                          ) : template.coverPlace ? (
                            <PlacePhoto
                              googlePlaceId={template.coverPlace.googlePlaceId}
                              photoName={template.coverPlace.photoName}
                              photoUri={template.coverPlace.photoUri}
                              alt={template.title}
                              className="h-full w-full"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-primary"><Icon name="route" className="text-[28px]" /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                          <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-extrabold text-primary">{template.city}</span>
                          <span className="absolute bottom-3 left-3 rounded-full bg-[#004ac6] px-2.5 py-1 text-[10px] font-extrabold text-white">{template.durationDays} hari</span>
                          {selected ? (
                            <span className="absolute right-14 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-extrabold text-white">Dipilih</span>
                          ) : null}
                        </div>
                        <div className="p-3.5 pb-2">
                          <p className="type-subtitle text-on-surface">{template.title}</p>
                          <p className="type-caption mt-1 text-on-surface-variant">{template.durationDays} hari · dipakai {template.usageCount}x</p>
                        </div>
                      </button>
                      {province ? (
                        <div className="absolute right-3 top-3 z-20">
                          <TemplateRoutePeek province={province} />
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-2 px-3.5 pb-3.5">
                        <p className="type-caption text-on-surface-variant">{selected ? "Lanjut ke detail trip." : "Klik kartu untuk memilih."}</p>
                        {province ? (
                          <Link
                            href={ROUTES.province(province.slug)}
                            className="btn-ghost !min-h-8 !px-2.5 !text-xs"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Lihat detail
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="mt-3 type-caption text-on-surface-variant">
                Template diambil dari API. Pastikan Express + database sudah jalan.
              </p>
            </div>
          ) : null}
          <Nav nextLabel="Lanjut ke detail" onNext={goFromStep1} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div className="card-surface space-y-5 p-5 md:p-7">
            {path === "template" ? (
              <p className="rounded-2xl bg-primary-fixed/40 px-4 py-3 type-caption text-on-surface-variant">
                Destinasi terisi dari <strong className="text-on-surface">{templateTitle || "kurasi DOLAN"}</strong>. Judul trip otomatis: {tripTitle}.
              </p>
            ) : (
              <p className="rounded-2xl bg-surface-container-low px-4 py-3 type-caption text-on-surface-variant">
                Judul trip dibuat otomatis dari destinasi: <strong className="text-on-surface">{tripTitle}</strong>
              </p>
            )}
            <PlacePicker
              id="destinationCity"
              label="Destinasi / tujuan"
              value={destinationCity}
              onChange={setDestinationCity}
              error={fieldErrors.destinationCity}
              placeholder="Ketik destinasi, misal Jambi atau Lampung"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="startDate" label="Tanggal mulai" error={fieldErrors.startDate}>
                <div className="relative">
                  <Icon name="calendar_month" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-primary" />
                  <input id="startDate" type="date" className="field-input field-input-icon" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
              </Field>
              <Field id="endDate" label="Tanggal selesai" error={fieldErrors.endDate}>
                <div className="relative">
                  <Icon name="calendar_month" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-primary" />
                  <input id="endDate" type="date" className="field-input field-input-icon" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
              </Field>
            </div>
            <div className="space-y-4">
              <Field id="partySize" label="Berapa orang" error={fieldErrors.partySize}>
                <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low px-3 py-2">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-primary"><Icon name="group" className="text-[20px]" /></span>
                  <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white type-subtitle" onClick={() => setPartySize((value) => Math.max(1, value - 1))} aria-label="Kurangi orang">−</button>
                  <input
                    id="partySize"
                    type="number"
                    min={1}
                    max={20}
                    className="h-10 w-16 border-0 bg-transparent text-center type-subtitle outline-none"
                    value={partySize}
                    onChange={(event) => setPartySize(Math.max(1, Number(event.target.value) || 1))}
                  />
                  <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white type-subtitle" onClick={() => setPartySize((value) => Math.min(20, value + 1))} aria-label="Tambah orang">+</button>
                </div>
              </Field>
              <div className="rounded-2xl bg-surface-container-low p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 type-label text-on-surface">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-primary"><Icon name="payments" className="text-[18px]" /></span>
                    Budget tersedia
                  </span>
                  <div className="flex rounded-full bg-white p-0.5">
                    <button type="button" className={`rounded-full px-2.5 py-1 type-caption ${budgetBasis === "PER_PERSON" ? "bg-primary text-white" : "text-on-surface-variant"}`} onClick={() => setBudgetBasis("PER_PERSON")}>Per orang</button>
                    <button type="button" className={`rounded-full px-2.5 py-1 type-caption ${budgetBasis === "GROUP" ? "bg-primary text-white" : "text-on-surface-variant"}`} onClick={() => setBudgetBasis("GROUP")}>Rombongan</button>
                  </div>
                </div>
                <Field id="budgetAmount" label="Nominal (Rp)" error={fieldErrors.budgetAmount}>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 type-label text-primary">Rp</span>
                    <input
                      id="budgetAmount"
                      type="text"
                      inputMode="numeric"
                      className="field-input pl-12"
                      value={budgetAmount.toLocaleString("id-ID")}
                      onChange={(event) => setBudgetAmount(Number(event.target.value.replace(/\D/g, "")) || 0)}
                    />
                  </div>
                </Field>
                <div className="mt-3 flex flex-wrap gap-2">
                  {BUDGET_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setBudgetAmount(amount)}
                      className={`rounded-full px-3 py-1.5 type-caption ${budgetAmount === amount ? "bg-primary text-white" : "bg-white text-on-surface"}`}
                    >
                      {formatRupiah(amount)}
                    </button>
                  ))}
                </div>
                <p className="type-caption mt-2 text-on-surface-variant">
                  Pool itinerary: {formatRupiah(availableBudgetPool(budgetAmount, budgetBasis, partySize))} · swadaya, bukan harga join.
                </p>
              </div>
              <PackingListField items={packingItems} onChange={setPackingItems} />
            </div>
          </div>
          <Nav onBack={path === "template" ? undefined : () => setStep(1)} onNext={goFromStep2} nextLabel={path === "template" ? "Lihat rute + biaya" : "Generate itinerary"} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          {generating && days.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <p className="type-subtitle text-on-surface">
                {path === "template" ? "Menyiapkan rute template…" : "Groq sedang menyusun rekomendasi itinerary…"}
              </p>
              <p className="type-body mt-2 text-on-surface-variant">
                Destinasi, tanggal, jumlah orang, dan budget dikirim ke AI. Setelah siap, kamu bisa edit tempat atau urutan per hari.
              </p>
            </div>
          ) : (
            <CreateTripItineraryStep
              days={days}
              selectedStopId={selectedStopId}
              editingStopId={editingStopId}
              generating={generating}
              fromTemplate={path === "template"}
              fromGroq={fromGroq}
              regenerateUsed={regenerateUsed}
              budgetPlan={budgetPlan}
              partySize={partySize}
              isPublic={visibility === "PUBLIC"}
              destinationCity={destinationCity}
              budgetAmount={budgetAmount}
              budgetBasis={budgetBasis}
              budgetWarning={validateWizardBasics({ destinationCity, startDate, endDate, budgetAmount, partySize, budgetBasis }).budgetAmount}
              onBudgetAmountChange={setBudgetAmount}
              onBudgetBasisChange={setBudgetBasis}
              onSelectStop={(id) => {
                setSelectedStopId(id);
                setEditingStopId(id);
              }}
              onEditStop={(id) => {
                setSelectedStopId(id);
                setEditingStopId(id);
              }}
              onCloseEdit={() => setEditingStopId(null)}
              onReorderStops={(dayId, fromIndex, toIndex) => {
                setDays((current) => {
                  const next = reorderStopsInDay(current, dayId, fromIndex, toIndex);
                  return visibility === "PUBLIC" ? applyPublicMeetingPoint(next, true) : next;
                });
              }}
              onUpdateStop={updateStop}
              onAddStop={addStop}
              onRemoveStop={removeStop}
              onRegenerate={() => void regenerate()}
            />
          )}
          <Nav
            onBack={() => setStep(2)}
            onNext={() => void persistItineraryThenInvite()}
            nextLabel={pending ? "Menyimpan…" : "Setuju & lanjut undang"}
            nextDisabled={pending || generating || days.length === 0 || Boolean(validateWizardBasics({ destinationCity, startDate, endDate, budgetAmount, partySize, budgetBasis }).budgetAmount)}
          />
        </>
      ) : null}

      {step === 4 ? (
        <>
          <div className="card-surface space-y-5 p-5 md:p-7">
            <div>
              <p className="type-label mb-3 text-on-surface">Private / public</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => {
                  setVisibility("PRIVATE");
                  setDays((current) => applyPublicMeetingPoint(current, false));
                }} className={`rounded-2xl border p-4 text-left ${visibility === "PRIVATE" ? "border-primary bg-primary-fixed/40" : "border-outline-variant"}`}>
                  <p className="type-subtitle text-on-surface">Private</p>
                  <p className="type-caption mt-1 text-on-surface-variant">Hanya kamu dan teman yang diundang.</p>
                </button>
                <button type="button" onClick={() => {
                  setVisibility("PUBLIC");
                  setDays((current) => applyPublicMeetingPoint(current, true));
                }} className={`rounded-2xl border p-4 text-left ${visibility === "PUBLIC" ? "border-primary bg-primary-fixed/40" : "border-outline-variant"}`}>
                  <p className="type-subtitle text-on-surface">Public</p>
                  <p className="type-caption mt-1 text-on-surface-variant">Bisa ditemukan traveler lain. Join tetap gratis. Titik pertama itinerary jadi titik kumpul.</p>
                </button>
              </div>
            </div>
            {visibility === "PUBLIC" ? (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="rounded-2xl border border-primary/20 bg-primary-fixed/35 px-4 py-3 type-body text-on-surface">
                  Titik kumpul: <strong>{firstStopMeetingLabel(days) || destinationCity}</strong>
                </p>
                <Field id="maxParticipants" label="Max grup (opsional)" hint="Termasuk host. Kosongkan untuk memakai default 8.">
                  <input id="maxParticipants" type="number" min={2} className="field-input bg-white ring-1 ring-slate-200" value={maxParticipants} onChange={(event) => setMaxParticipants(event.target.value === "" ? "" : Number(event.target.value))} placeholder="8" />
                </Field>
                <Field id="genderRule" label="Gender (public)">
                  <select id="genderRule" className="field-input bg-white ring-1 ring-slate-200" value={genderRule} onChange={(event) => setGenderRule(event.target.value as typeof genderRule)}>
                    <option value="ALL_GENDERS">All gender</option>
                    <option value="FEMALE_ONLY">Female only</option>
                    <option value="MALE_ONLY">Male only</option>
                  </select>
                </Field>
              </div>
            ) : null}
            <FriendInviteField
              connections={connections}
              selected={inviteUsernames}
              onToggle={(username) => {
                setInviteUsernames((current) =>
                  current.includes(username) ? current.filter((item) => item !== username) : [...current, username],
                );
              }}
            />
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button type="button" className="btn-ghost" onClick={() => setStep(3)}>Kembali</button>
            <button type="button" className="btn-primary" disabled={pending} onClick={() => void finish()}>
              {pending ? "Menyimpan…" : "Simpan ke Trip Saya"}
              <Icon name="arrow_forward" className="text-[16px]" />
            </button>
          </div>
        </>
      ) : null}

      {formError ? <p className="type-body mt-4 text-error" role="alert">{formError}</p> : null}
      {templateLoading ? <p className="type-caption mt-3 text-on-surface-variant">Memuat template…</p> : null}
    </div>
  );
}

function FriendInviteField({
  connections,
  selected,
  onToggle,
}: {
  connections: Array<{ username: string; displayName: string }>;
  selected: string[];
  onToggle: (username: string) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().replace(/^@/, "").toLocaleLowerCase("id-ID");
  const matches = connections.filter((person) => {
    if (!needle) return false;
    return (
      person.username.toLocaleLowerCase("id-ID").includes(needle) ||
      person.displayName.toLocaleLowerCase("id-ID").includes(needle)
    );
  }).slice(0, 8);

  return (
    <div>
      <p className="type-label text-on-surface">Invite friend (opsional)</p>
      <p className="type-caption mt-1 text-on-surface-variant">Cari username teman yang sudah connect denganmu, lalu pilih dari saran.</p>
      <div className="relative mt-3">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-primary" />
        <input
          className="field-input field-input-icon bg-white ring-1 ring-slate-200"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ketik username, misalnya @salsa"
          autoComplete="off"
        />
        {needle && matches.length > 0 ? (
          <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {matches.map((person) => {
              const picked = selected.includes(person.username);
              return (
                <li key={person.username}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left ${picked ? "bg-primary-fixed/60" : "hover:bg-slate-50"}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onToggle(person.username);
                      setQuery("");
                    }}
                  >
                    <span>
                      <span className="type-label text-on-surface">@{person.username}</span>
                      <span className="ml-2 type-caption text-on-surface-variant">{person.displayName}</span>
                    </span>
                    <span className="type-caption font-bold text-primary">{picked ? "Dipilih" : "Undang"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {needle && connections.length > 0 && matches.length === 0 ? (
          <p className="mt-2 type-caption text-on-surface-variant">Tidak ada teman dengan username itu. Pastikan sudah follow / terhubung.</p>
        ) : null}
      </div>
      {selected.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((username) => (
            <button
              type="button"
              key={username}
              className="rounded-full bg-primary px-3 py-1.5 type-label text-white"
              onClick={() => onToggle(username)}
            >
              @{username} ×
            </button>
          ))}
        </div>
      ) : null}
      {connections.length === 0 ? (
        <p className="mt-2 rounded-2xl bg-primary-fixed/35 px-4 py-3 type-caption text-on-surface-variant">
          Belum ada koneksi DOLAN. Follow dulu, atau simpan trip tanpa undangan.
        </p>
      ) : null}
    </div>
  );
}

function WizardProgress({ step }: { step: number }) {
  return (
    <ol className="mt-6 mb-8 flex items-center">
      {WIZARD_STEPS.map((item, index) => {
        const done = step > item.n;
        const active = step === item.n;
        return (
          <li key={item.n} className={`flex items-center ${index === WIZARD_STEPS.length - 1 ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center">
              <span
                className={`grid h-10 w-10 place-items-center rounded-full border-2 type-label ${
                  done || active ? "border-primary bg-primary text-white" : "border-outline-variant bg-white text-on-surface-variant"
                }`}
              >
                {String(item.n).padStart(2, "0")}
              </span>
              <span className="mt-1 hidden type-caption font-bold text-on-surface sm:block">{item.label}</span>
            </div>
            {index < WIZARD_STEPS.length - 1 ? (
              <div className="mx-2 mb-5 h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high sm:mb-6">
                <div
                  className={`h-full rounded-full bg-primary transition-all ${done ? "w-full" : active ? "w-1/2 animate-pulse" : "w-0"}`}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Nav({
  onBack,
  onNext,
  nextLabel = "Lanjut",
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-6 flex justify-between gap-3">
      {onBack ? (
        <button type="button" className="btn-ghost" onClick={onBack}>Kembali</button>
      ) : (
        <span />
      )}
      <button type="button" className="btn-primary" disabled={nextDisabled} onClick={onNext}>
        {nextLabel}
        <Icon name="arrow_forward" className="text-[16px]" />
      </button>
    </div>
  );
}
