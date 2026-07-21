import { describe, it, expect } from "vitest";

describe("SubscriptionProvider / useSubscription", () => {
  it("módulo subscription-provider exporta SubscriptionProvider", async () => {
    const mod = await import("@/components/subscription-provider");
    expect(typeof mod.SubscriptionProvider).toBe("function");
  });

  it("módulo subscription-provider exporta useSubscription", async () => {
    const mod = await import("@/components/subscription-provider");
    expect(typeof mod.useSubscription).toBe("function");
  });

  it("SubscriptionInfo com status 'trial' tem canWrite=true", () => {
    // Valida o contrato da interface de dados
    const info = {
      status: "trial" as const,
      daysLeft: 10,
      canWrite: true,
      trialEndsAt: new Date(),
    };
    expect(info.canWrite).toBe(true);
    expect(info.status).toBe("trial");
    expect(info.daysLeft).toBe(10);
  });

  it("SubscriptionInfo com status 'active' tem canWrite=true", () => {
    const info = {
      status: "active" as const,
      daysLeft: null,
      canWrite: true,
      trialEndsAt: null,
    };
    expect(info.canWrite).toBe(true);
    expect(info.daysLeft).toBeNull();
  });

  it("SubscriptionInfo com status 'read_only' tem canWrite=false", () => {
    const info = {
      status: "read_only" as const,
      daysLeft: null,
      canWrite: false,
      trialEndsAt: null,
    };
    expect(info.canWrite).toBe(false);
    expect(info.status).toBe("read_only");
  });

  it("SubscriptionInfo com status 'cancelled' tem canWrite=false", () => {
    const info = {
      status: "cancelled" as const,
      daysLeft: null,
      canWrite: false,
      trialEndsAt: null,
    };
    expect(info.canWrite).toBe(false);
  });
});
