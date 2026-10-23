import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, LoaderCircle, LockKeyhole, Mail } from "lucide-react";

const inputClass = "mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-primary";
const buttonClass = "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60";

export default function PasswordResetPage() {
  const [location] = useLocation();
  const isReset = location === "/reset-password";
  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") ?? "" : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (isReset && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(isReset ? "/api/auth/reset-password" : "/api/auth/forgot-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(isReset ? { token, password } : { email: email.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Something went wrong. Please try again.");
      if (isReset) {
        setSuccess("Your password has been reset. You can now sign in with your new password.");
      } else {
        setSuccess(typeof result.message === "string" ? result.message : "If an account matches that email, we’ll send a password reset link shortly.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="grain flex min-h-[100dvh] bg-primary">
    <div className="hidden w-[42%] flex-col justify-between p-10 text-primary-foreground md:flex">
      <Link href="/" className="text-xl font-black tracking-tight text-primary-foreground">homza<span className="text-secondary">.</span></Link>
      <div><p className="font-mono-custom text-xs uppercase tracking-[.18em] text-secondary">Account security</p><h1 className="mt-5 max-w-md font-display text-6xl font-bold leading-[.92] tracking-[-.06em]">A secure way<br />back <span className="text-secondary">in.</span></h1><p className="mt-6 max-w-sm text-sm leading-6 text-primary-foreground/65">Get back to finding, listing and managing homes.</p></div>
      <p className="text-xs text-primary-foreground/45">Homes with a little more certainty.</p>
    </div>
    <div className="flex flex-1 items-center justify-center bg-background px-5 py-10 md:rounded-l-[2rem] md:px-10">
      <div className="w-full max-w-md">
        <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Back to sign in</Link>
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">{isReset ? <LockKeyhole size={22} /> : <Mail size={22} />}</div>
        <p className="font-mono-custom text-xs uppercase tracking-[.18em] text-accent">{isReset ? "Choose a new password" : "Account recovery"}</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">{isReset ? "Reset password." : "Forgot password?"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{isReset ? "Choose a new password for your Homza account. Reset links expire after 30 minutes." : "Enter the email address linked to your account. We’ll email you a secure reset link if an account matches."}</p>
        {isReset && !token ? <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">This reset link is missing or invalid. Request a new link to continue.</div> : null}
        {success ? <div role="status" className="mt-6 rounded-xl border border-emerald-700/20 bg-emerald-500/10 p-4 text-sm text-foreground"><p className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> {isReset ? "Password updated" : "Check your email"}</p><p className="mt-2 leading-6">{success}</p>{isReset && <Link href="/login" className="mt-4 inline-flex font-bold underline">Continue to sign in</Link>}</div> : null}
        {!success && !(isReset && !token) ? <form onSubmit={submit} className="mt-7 space-y-4">
          {!isReset ? <label className="block text-sm font-bold">Email address<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@example.com" /></label> : <>
            <label className="block text-sm font-bold">New password<input required type="password" autoComplete="new-password" minLength={10} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder="At least 10 characters" /></label>
            <label className="block text-sm font-bold">Confirm new password<input required type="password" autoComplete="new-password" minLength={10} maxLength={200} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} placeholder="Enter the password again" /></label>
          </>}
          {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={busy || (isReset && !token)} className={buttonClass}>{busy ? <><LoaderCircle className="animate-spin" size={16} /> Please wait…</> : isReset ? <><LockKeyhole size={16} /> Save new password</> : <><Mail size={16} /> Send reset link</>}</button>
        </form> : null}
        <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">For your security, reset links expire after 30 minutes and can only be used once.</p>
      </div>
    </div>
  </main>;
}
