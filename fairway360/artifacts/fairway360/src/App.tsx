import type { ComponentType } from "react";
import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OrdersProvider } from "@/lib/orders-store";
import { AuthProvider, useAuth, type Role } from "@/lib/auth";
import NotFound from "@/pages/not-found";

import { Home } from "@/pages/home";
import { Platform } from "@/pages/platform";
import { Dining } from "@/pages/dining";
import { Pricing } from "@/pages/pricing";
import { Solutions } from "@/pages/solutions";
import { Automations } from "@/pages/automations";
import { Events } from "@/pages/events";
import { Demo } from "@/pages/demo";
import { PrivacyPolicy, TermsOfService } from "@/pages/legal";
import { PortalLogin } from "@/pages/portal/login";
import { SupervisorPortal } from "@/pages/portal/supervisor";
import { EmployeesPortal } from "@/pages/portal/employees";
import { MembersPortal } from "@/pages/portal/members";

const queryClient = new QueryClient();

function RequireRole({
  role,
  component: Component,
}: {
  role: Role;
  component: ComponentType;
}) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(146_46%_17%)]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }
  if (!user || user.role !== role) return <Redirect to="/portal" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/platform" component={Platform} />
      <Route path="/dining" component={Dining} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/solutions" component={Solutions} />
      <Route path="/automations" component={Automations} />
      <Route path="/events" component={Events} />
      <Route path="/demo" component={Demo} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/portal" component={PortalLogin} />
      <Route path="/portal/supervisor">
        <RequireRole role="supervisor" component={SupervisorPortal} />
      </Route>
      <Route path="/portal/employees">
        <RequireRole role="employee" component={EmployeesPortal} />
      </Route>
      <Route path="/portal/members">
        <RequireRole role="member" component={MembersPortal} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <TooltipProvider>
            <OrdersProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </OrdersProvider>
          </TooltipProvider>
        </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

export default App;
