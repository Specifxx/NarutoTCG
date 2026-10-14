import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-chakra-400">404</p>
      <h1 className="text-3xl font-bold text-white">This scroll doesn&apos;t exist</h1>
      <p className="text-ash-400">The card or page you were looking for couldn&apos;t be found.</p>
      <Link
        href="/cards"
        className="rounded-md bg-chakra-500 px-4 py-2 text-sm font-semibold text-shadow-950 transition hover:bg-chakra-400"
      >
        Browse the card database
      </Link>
    </div>
  );
}
