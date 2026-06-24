import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSSE(): { connected: boolean } {
  const qc = useQueryClient();
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    function connect() {
      if (!active) return;
      try {
        es = new EventSource(`${import.meta.env.BASE_URL}api/sse/events`);

        es.onopen = () => setConnected(true);

        es.addEventListener("yetkiler_updated", () => {
          qc.invalidateQueries({ queryKey: ["yetkiler"] });
          qc.invalidateQueries({ queryKey: ["stats"] });
          qc.invalidateQueries({ queryKey: ["activity-logs"] });
        });

        es.onerror = () => {
          setConnected(false);
          es?.close();
          es = null;
          if (active) retryTimer = setTimeout(connect, 6000);
        };
      } catch {
        if (active) retryTimer = setTimeout(connect, 6000);
      }
    }

    connect();

    return () => {
      active = false;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
      setConnected(false);
    };
  }, [qc]);

  return { connected };
}
