import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Inloggen</h1>
        <p className="mb-6 text-sm text-slate-600">
          Excel-validatie voor medewerkers van De Kunst van Kunst
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
