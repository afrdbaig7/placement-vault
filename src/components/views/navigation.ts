"use client";

import { useApp } from "@/lib/store";

/** Shared navigation helper so any view can jump to a company hub. */
export function navigateToCompany(slug: string) {
  useApp.getState().navigate({ name: "hub", company: slug });
}
