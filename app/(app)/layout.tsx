import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import { SubscriptionProvider } from "@/components/subscription-provider";
import { TrialBanner } from "@/components/trial-banner";
import { BottomNav } from "@/components/bottom-nav";

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
      <div className="flex flex-col min-h-screen">
        {subscription.status === "trial" && subscription.daysLeft !== null && (
          <TrialBanner daysLeft={subscription.daysLeft} />
        )}
        <main className="flex-1 pb-16">{children}</main>
        <BottomNav />
      </div>
    </SubscriptionProvider>
  );
}
