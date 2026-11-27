import { XIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Mark } from "../../components/Mark";
import { type MessageKey, useT } from "../../i18n";
import { AuthError, authenticate } from "../../lib/api";
import { usePrefs } from "../../lib/prefs";
import { useAuthDialog } from "./auth";

type Mode = "signin" | "signup";

const ERRORS = [
  "invalid_credentials",
  "email_taken",
  "invalid_request",
  "rate_limited",
];

const field =
  "h-10 w-full rounded-lg border border-line bg-bg px-3 text-base outline-none placeholder:text-subtle focus:border-accent aria-invalid:border-danger sm:text-sm";

export function AuthDialog() {
  const t = useT();
  const { open, limit } = useAuthDialog();
  const locale = usePrefs((s) => s.locale);
  const setName = usePrefs((s) => s.setName);
  const queryClient = useQueryClient();
  const dialog = useRef<HTMLDialogElement>(null);
  const email = useRef<HTMLInputElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const titleId = useId();
  const errorId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el || el.open === open) return;
    if (open) {
      setMode(limit ? "signup" : "signin");
      setError(null);
      el.showModal();
    } else el.close();
  }, [open, limit]);

  // After the render for the current mode: the name on sign-up, else the email.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus when the form switches
  useEffect(() => {
    if (open) first.current?.focus();
  }, [open, mode]);

  const close = () => useAuthDialog.setState({ open: false });

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const me = await authenticate(mode, {
        email: String(form.get("email")),
        password: String(form.get("password")),
        name: signup ? String(form.get("name")) : undefined,
        locale,
      });
      if (me.name) setName(me.name);
      // Chats, memory and the guest count all belong to someone else now.
      await queryClient.resetQueries();
      close();
    } catch (cause) {
      const code = cause instanceof AuthError ? cause.code : "server";
      setError(ERRORS.includes(code) ? code : "server");
      email.current?.focus();
    } finally {
      setPending(false);
    }
  };

  const signup = mode === "signup";
  const invalid = error ? true : undefined;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes natively; the click only dismisses via the backdrop
    <dialog
      ref={dialog}
      onClose={close}
      onClick={(e) => e.target === e.currentTarget && close()}
      aria-labelledby={titleId}
      className="modal m-auto w-[min(24rem,calc(100vw-2rem))] overflow-x-hidden [@media(min-height:36rem)]:overflow-y-hidden rounded-[1.4rem] border border-line bg-surface p-6 text-fg shadow-lift backdrop:bg-black/45 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between">
        <Mark className="size-8" />
        <button
          type="button"
          onClick={close}
          aria-label={t("close")}
          className="-me-2 -mt-2 grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
        >
          <XIcon className="size-4.5" aria-hidden />
        </button>
      </div>
      <h2
        id={titleId}
        className="mt-4 text-balance font-display font-semibold text-xl"
      >
        {t(limit ? "auth.limitTitle" : signup ? "auth.signUp" : "auth.signIn")}
      </h2>
      <p className="mt-1.5 text-pretty text-muted text-sm">
        {t(limit ? "auth.limitBody" : "auth.body")}
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-3.5">
        {signup ? (
          <label className="grid gap-1.5 font-medium text-sm">
            {t("name.label")}
            <input
              ref={first}
              name="name"
              autoComplete="nickname"
              maxLength={40}
              required
              className={field}
            />
          </label>
        ) : null}
        <label className="grid gap-1.5 font-medium text-sm">
          {t("auth.email")}
          <input
            ref={(el) => {
              email.current = el;
              if (!signup) first.current = el;
            }}
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            aria-invalid={invalid}
            aria-describedby={errorId}
            className={field}
          />
        </label>
        <label className="grid gap-1.5 font-medium text-sm">
          {t("auth.password")}
          <input
            name="password"
            type="password"
            dir="ltr"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 8 : undefined}
            required
            aria-invalid={invalid}
            aria-describedby={errorId}
            className={field}
          />
          {signup ? (
            <small className="font-normal text-subtle text-xs">
              {t("auth.passwordHint")}
            </small>
          ) : null}
        </label>
        <p
          id={errorId}
          role="alert"
          className="text-danger text-sm empty:hidden"
        >
          {error ? t(`auth.error.${error}` as MessageKey) : ""}
        </p>
        <button
          type="submit"
          aria-busy={pending}
          className="spring mt-1 h-10 rounded-xl bg-accent font-medium text-accent-ink text-sm hover:brightness-105 aria-busy:opacity-70"
        >
          {t(signup ? "auth.createAccount" : "auth.signIn")}
        </button>
      </form>
      <p className="mt-4 text-center text-muted text-sm">
        {t(signup ? "auth.haveAccount" : "auth.newHere")}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(signup ? "signin" : "signup");
            setError(null);
          }}
          className="font-medium text-accent-text hover:underline"
        >
          {t(signup ? "auth.signIn" : "auth.createAccount")}
        </button>
      </p>
    </dialog>
  );
}
