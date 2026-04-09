"use client";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center shadow-xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">System is Upgrading...</h1>
        <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
          Please check back after some time.
        </p>
      </div>
    </div>
  );
}
