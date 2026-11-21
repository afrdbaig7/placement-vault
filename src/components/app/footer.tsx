"use client";

import { useApp } from "@/lib/store";
import { config } from "@/data/config";
import { navigateToCompany } from "@/components/views/navigation";

export function Footer() {
  const { navigate } = useApp();
  return (
    <footer className="mt-auto border-t bg-muted/40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{config.collegeName}</p>
          <p className="text-xs text-muted-foreground">
            {config.tagline}
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <button className="hover:text-foreground" onClick={() => navigate({ name: "companies" })}>
            Companies
          </button>
          <button className="hover:text-foreground" onClick={() => navigate({ name: "chat" })}>
            Campus chat
          </button>
          <button className="hover:text-foreground" onClick={() => navigate({ name: "contribute" })}>
            Contribute & earn coins
          </button>
          <button
            className="hover:text-foreground"
            onClick={() => navigateToCompany("amazon")}
          >
            Example: Amazon hub
          </button>
          {config.repoUrl && (
            <a className="hover:text-foreground" href={config.repoUrl} target="_blank" rel="noreferrer">
              Source repo
            </a>
          )}
          <span className="hidden sm:inline">Coins are enforced server-side, never in the UI</span>
        </nav>
      </div>
    </footer>
  );
}
