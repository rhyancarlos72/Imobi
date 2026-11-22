import { StudioProvider } from "@/components/studio/StudioContext";
import { StudioNav } from "@/components/studio/StudioNav";
import { requireUser } from "@/lib/auth";
import { aiProviders, isAiConfigured, isDemo, isPaymentConfigured } from "@/lib/config";
import { serverPricing } from "@/lib/generation";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  return (
    <StudioProvider initialProfile={profile} pricing={serverPricing} demo={{ app: isDemo, ai: !isAiConfigured, payments: isDemo && !isPaymentConfigured }} providers={aiProviders}>
      <div className="flex min-h-screen flex-col">
        <StudioNav />
        <div className="flex-1">{children}</div>
      </div>
    </StudioProvider>
  );
}
