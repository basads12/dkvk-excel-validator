"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FileUploadForm({
  action,
  label,
  accept = ".xlsx",
  buttonText = "Upload Excel-bestand",
  disabled = false,
}: {
  action: string;
  label: string;
  accept?: string;
  buttonText?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch(action, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload mislukt");
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError("Upload mislukt. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="file"
        name="file"
        accept={accept}
        required
        disabled={disabled || loading}
        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={disabled || loading}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Uploaden..." : buttonText}
      </button>
    </form>
  );
}
