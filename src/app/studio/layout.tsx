import { StudioProvider } from "@/components/studio/StudioContext";
import { StudioNav } from "@/components/studio/StudioNav";
import { AdminAlert } from "@/components/studio/AdminAlert";
import { requireUser } from "@/lib/auth";
import { aiProviders, isAdminEmail, isAiConfigured, isDemo, isPaymentConfigured } from "@/lib/config";
import { serverPricing } from "@/lib/generation";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUser();
  const admin = isAdminEmail(user.email);
  return (
    <StudioProvider initialProfile={profile} pricing={serverPricing} demo={{ app: isDemo, ai: !isAiConfigured, payments: isDemo && !isPaymentConfigured }} providers={aiProviders} isAdmin={admin}>
      <div className="flex min-h-screen flex-col">
        <StudioNav />
        {admin && <AdminAlert />}
        <div className="flex-1">{children}</div>
      </div>
    </StudioProvider>
  );
}
