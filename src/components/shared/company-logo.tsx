"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";

export function CompanyLogo({
  company,
  size = "md",
  className,
}: {
  company: Pick<Company, "name" | "color"> | { name: string; color: string };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const initials = company.name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-12 w-12 text-sm",
    xl: "h-16 w-16 text-lg",
  };
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm ring-1 ring-black/5",
        sizes[size],
        className
      )}
      style={{ backgroundColor: company.color }}
    >
      {initials}
    </div>
  );
}
