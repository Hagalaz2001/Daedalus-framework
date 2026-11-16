# Third-party items in the observability module

| Package            | Licence    | Used for                                                    |
| ------------------ | ---------- | ----------------------------------------------------------- |
| @opentelemetry/api | Apache-2.0 | Adding attributes to the span Deno creates for each request |

PostHog and Plausible are called through their public HTTP APIs with `fetch`.
