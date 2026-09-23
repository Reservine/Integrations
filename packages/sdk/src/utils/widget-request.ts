import type { ReservineMembershipsData } from '../contract.js';

/** A settled widget-API response, parsed once and handed to every caller that shared it. */
export interface WidgetResponse {
  status: number;
  ok: boolean;
  /** The JSON envelope; `null` when the body is not JSON. */
  body: { data?: ReservineMembershipsData | null } | null;
}

const inFlight = new Map<string, Promise<WidgetResponse>>();

/**
 * `GET` a public widget endpoint, sharing ONE request between every caller asking for
 * the same URL while it is in flight — two `<reservine-memberships>` with the same
 * api-url + partner + branch on one page cost one call. A settled request is forgotten
 * (success or failure), so a later load always goes to the network. `fresh` never joins
 * (refresh() / Retry); it becomes the request later callers join instead.
 *
 * `fetch` is resolved on the global at call time, so host-page fetch wrappers see it.
 */
export function fetchWidgetData(url: string, fresh = false): Promise<WidgetResponse> {
  const pending = fresh ? undefined : inFlight.get(url);
  if (pending) return pending;

  const request = fetch(url, { credentials: 'omit' }).then(
    async (response): Promise<WidgetResponse> => ({
      status: response.status,
      ok: response.ok,
      // A non-JSON body (a proxy error page) renders the element's error state.
      body: (await response.json().catch(() => null)) as WidgetResponse['body']
    })
  );
  inFlight.set(url, request);

  const forget = (): void => {
    if (inFlight.get(url) === request) inFlight.delete(url);
  };
  request.then(forget, forget);
  return request;
}
