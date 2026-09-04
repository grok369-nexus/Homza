import { Link } from 'wouter';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="grain flex min-h-[100dvh] items-center justify-center bg-primary px-5 text-primary-foreground">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-foreground">
          <Compass size={26} />
        </span>
        <p className="mt-8 font-mono-custom text-xs uppercase tracking-[.18em] text-secondary">
          A quiet patch of map
        </p>
        <h1 className="mt-3 font-display text-5xl font-bold tracking-[-.05em]">
          This page wandered off.
        </h1>
        <p className="mt-4 text-sm leading-6 text-primary-foreground/65">
          The address does not lead to a Homza home. Let’s get you back to somewhere useful.
        </p>
        <Link
          href="/"
          data-testid="link-not-found-home"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground"
        >
          <ArrowLeft size={16} /> Back to Homza
        </Link>
      </div>
    </main>
  );
}
