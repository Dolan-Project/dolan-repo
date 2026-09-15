"use client";

import { Icon } from "@/components/ui/Icon";

export function PackingListField({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="type-label text-on-surface">List perlengkapan <span className="font-normal text-on-surface-variant">(opsional)</span></p>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-3 text-xs font-extrabold text-white"
          onClick={() => onChange([...items, ""])}
        >
          Add list perlengkapan <Icon name="add" className="text-[16px]" />
        </button>
      </div>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <div key={`pack-${index}`} className="flex gap-2">
              <input
                className="field-input min-h-10 flex-1 text-sm"
                value={item}
                placeholder={`Perlengkapan ${index + 1}`}
                onChange={(event) => onChange(items.map((value, itemIndex) => itemIndex === index ? event.target.value : value))}
              />
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white"
                aria-label="Tambah baris perlengkapan"
                onClick={() => onChange([...items.slice(0, index + 1), "", ...items.slice(index + 1)])}
              >
                <Icon name="add" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 type-caption text-on-surface-variant">Kosongkan saja jika tidak perlu. Nanti bisa dicentang di detail trip.</p>
      )}
    </div>
  );
}
