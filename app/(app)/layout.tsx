import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import { SubscriptionProvider } from "@/components/subscription-provider";
import { TrialBanner } from "@/components/trial-banner";
import { RenewalBanner } from "@/components/renewal-banner";
import { BottomNav } from "@/components/bottom-nav";
import { Sidebar } from "@/components/sidebar";

/**
 * Layout raiz do grupo (app).
 * Server Component: busca subscription e injeta via React Context.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const subscription = await getSubscriptionStatus(user.id);

  return (
    <SubscriptionProvider subscription={subscription}>
      <div className="flex h-screen overflow-hidden bg-bg-base">
        <Sidebar className="hidden lg:flex w-64 shrink-0" />
        <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
          {subscription.status === "trial" && subscription.daysLeft !== null && (
            <TrialBanner daysLeft={subscription.daysLeft} />
          )}
          {subscription.isExpired && <RenewalBanner />}
          <main className="flex-1 pb-16 lg:pb-0 p-4 lg:p-8">{children}</main>
          <BottomNav className="lg:hidden" />
        </div>
      </div>
    </SubscriptionProvider>
  );
}
