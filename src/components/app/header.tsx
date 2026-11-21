"use client";

import { useTheme } from "next-themes";
import { useApp, isModRole } from "@/lib/store";
import { useProgress } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GoogleLogoIcon } from "@/components/shared/bits";
import { Coins, Flame, GraduationCap, Moon, Sun, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { View } from "@/lib/store";

const NAV: { view: View; label: string; modOnly?: boolean }[] = [
  { view: { name: "home" }, label: "Home" },
  { view: { name: "problems" }, label: "Problems" },
  { view: { name: "companies" }, label: "Companies" },
  { view: { name: "drives" }, label: "Drives" },
  { view: { name: "chat" }, label: "Chat" },
  { view: { name: "contribute" }, label: "Contribute" },
  { view: { name: "wallet" }, label: "Wallet" },
];

export function Header() {
  const { view, navigate, session, setSignInOpen, signOut } = useApp();
  const streak = useProgress((s) => s.streak);
  const { theme, setTheme } = useTheme();
  const user = session?.user ?? null;
  const mod = isModRole(user?.role);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <button
          className="flex items-center gap-2 font-bold tracking-tight"
          onClick={() => navigate({ name: "home" })}
          aria-label="Go to home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span className="hidden sm:block">Campus Placement Hub</span>
          <span className="sm:hidden">CPH</span>
        </button>

        <nav aria-label="Main" className="ml-2 hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <NavItem key={item.view.name} active={view.name === item.view.name} onClick={() => navigate(item.view)}>
              {item.label}
            </NavItem>
          ))}
          {mod && (
            <NavItem active={view.name === "mod"} onClick={() => navigate({ name: "mod" })}>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Mod queue
              </span>
            </NavItem>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {streak > 0 && (
            <Badge variant="outline" className="hidden gap-1 border-orange-300 text-orange-700 sm:inline-flex dark:text-orange-300">
              <Flame className="h-3.5 w-3.5" aria-hidden /> {streak}
            </Badge>
          )}
          {user && (
            <button
              onClick={() => navigate({ name: "wallet" })}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 px-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
              aria-label={`${session?.balance ?? 0} coins — open wallet`}
            >
              <Coins className="h-4 w-4" aria-hidden />
              <span className="tabular-nums">{session?.balance ?? 0}</span>
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4.5 w-4.5 dark:hidden" />
            <Moon className="hidden h-4.5 w-4.5 dark:block" />
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Account menu" className="rounded-full outline-none ring-primary focus-visible:ring-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/90 text-xs text-primary-foreground">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {user.role}
                    </Badge>
                    {user.rollVerified ? (
                      <Badge className="bg-emerald-100 text-[10px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        unverified
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ name: "profile" })}>Profile & contributions</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ name: "wallet" })}>Coin wallet</DropdownMenuItem>
                {mod && <DropdownMenuItem onClick={() => navigate({ name: "mod" })}>Moderation</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={() => setSignInOpen(true)}>
              <GoogleLogoIcon className="h-4 w-4" /> Sign in
            </Button>
          )}
        </div>
      </div>

      {/* mobile nav */}
      <nav aria-label="Mobile" className="scrollbar-thin overflow-x-auto border-t lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-3 py-1.5">
          {NAV.map((item) => (
            <button
              key={item.view.name}
              onClick={() => navigate(item.view)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                view.name === item.view.name ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {item.label}
            </button>
          ))}
          {mod && (
            <button
              onClick={() => navigate({ name: "mod" })}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm",
                view.name === "mod" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              Mod
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

function NavItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </button>
  );
}
