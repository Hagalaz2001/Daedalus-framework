import { trace } from "@opentelemetry/api";
import type { Module } from "../../shared/http/types.ts";

export { track } from "./analytics.ts";

// With OTEL_DENO=true Deno already traces every request and exports logs and metrics. This adds what only the app
// knows: the route pattern (low-cardinality, safe to group by), the caller and the organization.
export default {
  name: "observability",
  middleware: ({ contract }) => [
    async (c, next) => {
      await next();
      const span = trace.getActiveSpan();
      if (!span) return;
      span.setAttribute("http.route", contract.operationOf(c)?.path ?? "unmatched");
      span.setAttribute("app.request_id", c.get("requestId"));
      const user = c.get("user");
      if (user) span.setAttribute("enduser.id", user.id);
      const org = c.req.header("x-organization-id");
      if (org) span.setAttribute("app.organization_id", org);
    },
  ],
} satisfies Module;
