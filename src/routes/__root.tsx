import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouterState, HeadContent, Scripts, Link, useRouter,
} from "@tanstack/react-router";
import React, { Component, useEffect, type ReactNode, type ErrorInfo } from "react";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PeoplePulse — Enterprise HRMS & Payroll" },
      { name: "description", content: "Modern, enterprise-grade HRMS and Payroll platform for multi-entity organisations." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-5xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found.</p>
        <Link to="/" className="inline-block mt-4 underline text-primary">Go home</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, info }) => {
    const router = useRouter();
    const isSSR = typeof window === "undefined";

    useEffect(() => {
      if (!isSSR && error.message === "Unauthorized" && localStorage.getItem("access_token")) {
        // Server threw Unauthorized due to lack of localStorage. Force client to re-fetch with token!
        router.invalidate();
      } else if (!isSSR && error.message === "Unauthorized") {
        window.location.href = "/auth";
      }
    }, [isSSR, error, router]);

    if (error.message === "Unauthorized") {
      return <div className="min-h-screen grid place-items-center p-6 text-muted-foreground bg-background">Authenticating...</div>;
    }

    return (
      <div className="min-h-screen grid place-items-center p-6 bg-red-50/50">
        <div className="bg-red-50 border border-red-500 rounded-lg p-6 max-w-4xl w-full shadow-lg overflow-hidden">
          <h1 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Application Crash
          </h1>
          <p className="text-red-900 font-medium mb-4 text-lg">
            {error.message || "An unexpected error occurred."}
          </p>
          {(error.stack || info?.componentStack) && (
            <div className="mt-4 bg-red-950 rounded-md p-4 overflow-x-auto text-left">
              <pre className="text-red-300 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                {error.stack}
                {info?.componentStack && `\n\nComponent Stack:\n${info.componentStack}`}
              </pre>
            </div>
          )}
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      </div>
    );
  },
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

class GlobalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null, info: ErrorInfo | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught error:", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center p-6 bg-red-50/50">
          <div className="bg-red-50 border border-red-500 rounded-lg p-6 max-w-4xl w-full shadow-lg overflow-hidden">
            <h1 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Application Crash (Render Error)
            </h1>
            <p className="text-red-900 font-medium mb-4 text-lg">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            {(this.state.error?.stack || this.state.info?.componentStack) && (
              <div className="mt-4 bg-red-950 rounded-md p-4 overflow-x-auto text-left">
                <pre className="text-red-300 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {this.state.error?.stack}
                  {this.state.info?.componentStack && `\n\nComponent Stack:\n${this.state.info.componentStack}`}
                </pre>
              </div>
            )}
            <div className="mt-6">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Shell />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

function Shell() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { user, init } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (init && !user && pathname !== "/auth") {
      router.navigate({ to: '/auth' });
    }
  }, [init, user, pathname, router]);

  if (!init) return null; // Wait for hydration!

  if (pathname === "/auth") return <Outlet />;

  if (!user) {
    return null;
  }
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-4 md:p-6 min-w-0"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
