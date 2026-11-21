"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { useProgress } from "@/lib/progress";
import { Header } from "@/components/app/header";
import { Footer } from "@/components/app/footer";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { OnboardingDialog, VerificationBanner } from "@/components/auth/onboarding";
import { HomeView } from "@/components/views/home";
import { ProblemsView } from "@/components/views/problems";
import { CompaniesView } from "@/components/views/companies";
import { CompanyHubView } from "@/components/views/company-hub";
import { DrivesView } from "@/components/views/drives";
import { ChatView } from "@/components/views/chat";
import { ContributeView } from "@/components/views/contribute";
import { WalletView } from "@/components/views/wallet";
import { ModQueueView } from "@/components/views/mod-queue";
import { ProfileView } from "@/components/views/profile";

const AUTH_ERRORS: Record<string, string> = {
  oauth_not_configured: "Google OAuth is not configured on this server.",
  oauth_denied: "Google sign-in was cancelled.",
  invalid_oauth_state: "Invalid or expired OAuth state — please try signing in again.",
  oauth_failed: "Google sign-in failed — please try again.",
};

export default function App() {
  const { view, refreshSession } = useApp();
  const hydrate = useProgress((s) => s.hydrate);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const err = url.searchParams.get("auth_error");
    if (err) {
      toast.error(AUTH_ERRORS[err] ?? "Authentication error");
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="mb-4">
          <VerificationBanner />
        </div>
        {view.name === "home" && <HomeView />}
        {view.name === "problems" && <ProblemsView />}
        {view.name === "companies" && <CompaniesView />}
        {view.name === "hub" && <CompanyHubView key={view.company} slug={view.company} />}
        {view.name === "drives" && <DrivesView />}
        {view.name === "chat" && <ChatView />}
        {view.name === "contribute" && <ContributeView />}
        {view.name === "wallet" && <WalletView />}
        {view.name === "mod" && <ModQueueView />}
        {view.name === "profile" && <ProfileView />}
      </main>
      <Footer />
      <SignInDialog />
      <OnboardingDialog />
    </div>
  );
}
