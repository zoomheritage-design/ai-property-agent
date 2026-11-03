import Image from "next/image";

export const metadata = { title: "How to install — Buyer Radar" };

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-navy-800">📱 Install on Android</h1>
        <a className="btn-ghost !py-1.5" href="/">← Back</a>
      </header>
      <div className="card space-y-4 p-5 text-sm text-navy-700">
        <div>
          <h2 className="font-bold">Open the app in Chrome on Android</h2>
          <p className="text-navy-400">
            Use Chrome (or any Chromium browser) and open your deployed app URL.
          </p>
        </div>
        <div>
          <h2 className="font-bold">1. Tap the ⋮ menu</h2>
          <p className="text-navy-400">Top-right three-dot menu in Chrome.</p>
        </div>
        <div>
          <h2 className="font-bold">2. Choose “Add to Home screen” / “Install app”</h2>
          <p className="text-navy-400">
            Confirm the name <b>Lahore Property Buyer Radar</b>. An app icon is added to your home
            screen.
          </p>
        </div>
        <div>
          <h2 className="font-bold">3. Open it like a normal app</h2>
          <p className="text-navy-400">
            It launches full-screen, works offline for previously viewed pages, and keeps you signed
            in to your own dashboard.
          </p>
        </div>
        <div className="rounded-xl bg-brand-50 p-3 text-xs text-brand-700">
          Tip: on iPhone/Safari use Share → “Add to Home Screen” — the same PWA install works there.
        </div>
      </div>
    </div>
  );
}
