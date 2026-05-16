import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className = "", variant = "secondary", ...props }: ButtonProps) {
  const variants = {
    primary: "border-transparent bg-[var(--app-foreground)] text-white hover:bg-black",
    secondary:
      "border-[var(--app-border)] bg-white text-[var(--app-foreground)] hover:bg-[var(--app-soft)]",
    ghost:
      "border-transparent bg-transparent text-[var(--app-muted)] hover:bg-[var(--app-soft)] hover:text-[var(--app-foreground)]",
  };

  return (
    <button
      className={`inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-[var(--app-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 ${variants[variant]} ${className}`}
      type="button"
      {...props}
    />
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
};

export function IconButton({ children, className = "", label, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--app-border)] bg-white text-[var(--app-muted)] transition hover:bg-[var(--app-soft)] hover:text-[var(--app-foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--app-accent-soft)] disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9 ${className}`}
      title={label}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full min-w-0 rounded-md border border-[var(--app-border)] bg-white px-3 text-sm text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] disabled:cursor-not-allowed disabled:opacity-60 focus:border-[var(--app-accent)] focus:ring-4 focus:ring-[var(--app-accent-soft)] sm:h-10 ${className}`}
      {...props}
    />
  );
}
