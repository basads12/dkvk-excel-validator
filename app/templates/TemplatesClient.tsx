"use client";

import { useRouter } from "next/navigation";
import { FileUploadForm } from "@/components/FileUploadForm";
import type { Template } from "@/types";

export default function TemplatesClient({
  templates,
}: {
  templates: Template[];
}) {
  const router = useRouter();

  async function activateTemplate(templateId: string) {
    const res = await fetch("/api/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Templates</h1>

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium">Nieuwe template uploaden</h2>
        <FileUploadForm
          action="/api/templates"
          label="Voorbeeld-Excelbestand (.xlsx)"
          buttonText="Template uploaden"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium">Beschikbare templates</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-slate-500">Geen templates gevonden.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-slate-500">
                    {t.column_schema.columns.length} kolommen ·{" "}
                    {new Date(t.created_at).toLocaleDateString("nl-NL")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {t.is_active ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Actief
                    </span>
                  ) : (
                    <button
                      onClick={() => activateTemplate(t.id)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      Activeren
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
