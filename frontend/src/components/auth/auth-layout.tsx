import { NexoraMark } from "@/components/nexora-mark";
import { ReactNode } from "react";
import { ConstellationBackground } from "@/components/auth/constellation-background";

const FEATURES = [
  "AI-powered document analysis",
  "Cross-document contradiction detection",
  "Case-based investigation tracking",
];


export function AuthLayout({
  children,
  heading,
  subheading,
}: {
  children: ReactNode;
  heading: string;
  subheading: string;
}) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden flex-col justify-between p-12">
        <ConstellationBackground />

        <div className="relative flex items-center gap-2.5">
          <NexoraMark className="text-primary" />
          <span className="text-lg font-mono font-medium text-sidebar-foreground tracking-tight">
            NEXORA
          </span>
        </div>

        <div className="relative">
          <h1 className="text-3xl font-semibold text-sidebar-foreground leading-tight max-w-md tracking-tight">
            Turn scattered documents into connected evidence.
          </h1>
          <p className="text-sidebar-foreground/60 mt-4 max-w-sm text-sm leading-relaxed">
            Nexora uses AI to summarize, cross-reference, and flag
            inconsistencies across every document in your investigation.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-2.5 text-sm text-sidebar-foreground/70 font-mono"
              >
                <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-foreground/40 font-mono tracking-wide">
          BUILT FOR INVESTIGATORS, AUDITORS, AND COMPLIANCE TEAMS
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <NexoraMark className="text-primary" />
            <span className="text-lg font-mono font-medium text-foreground tracking-tight">
              NEXORA
            </span>
          </div>

          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            {heading}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-8">
            {subheading}
          </p>

          {children}
        </div>
      </div>
    </div>
  );
}
