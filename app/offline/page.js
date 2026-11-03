export const metadata = { title: "Offline — Buyer Radar" };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="text-5xl">📡</p>
      <h1 className="mt-4 text-xl font-bold text-navy-800">You are offline</h1>
      <p className="mt-2 text-sm text-navy-400">
        Lahore Property Buyer Radar needs an internet connection to fetch fresh buyer leads.
        Reconnect and reload this page.
      </p>
    </div>
  );
}
