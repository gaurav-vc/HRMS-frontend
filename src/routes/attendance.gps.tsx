import { createFileRoute } from "@tanstack/react-router";
import { Navigation as NavigationIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

/*
====================================================================
GPS CAPTURE PAGE - COMMENTED OUT AS REQUESTED
====================================================================
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sitesApi, attendanceApi } from "@/api";
import { useAuth } from "@/lib/auth-context";
...
====================================================================
*/

export const Route = createFileRoute("/attendance/gps")({
  loader: async () => {
    return { sites: [] };
  },
  component: GpsPage,
});

function GpsPage() {
  /*
  GPS Capture feature is commented out as requested.
  */
  return (
    <>
      <PageHeader
        title="GPS Capture"
        description="Geofenced location capture for mobile punches"
      />
      <Card className="p-12 text-center max-w-md mx-auto mt-8 border-dashed space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
          <NavigationIcon className="w-8 h-8 opacity-50" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">GPS Capture Disabled</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The GPS Capture module is currently commented out and disabled.
          </p>
        </div>
      </Card>
    </>
  );
}
