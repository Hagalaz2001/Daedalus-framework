// Minimal FHIR R4 client (https://hl7.org/fhir/R4/). Read and search only, fetch injected so tests need no server.
// Resources are typed loosely on purpose: model the fields you use. Never point it at a real server with real data
// from a development machine.

export interface Resource {
  resourceType: string;
  id?: string;
}
export interface Patient extends Resource {
  resourceType: "Patient";
  name?: { family?: string; given?: string[] }[];
  birthDate?: string;
  gender?: "male" | "female" | "other" | "unknown";
}
export interface Bundle<T extends Resource = Resource> extends Resource {
  resourceType: "Bundle";
  total?: number;
  entry?: { resource: T }[];
}

export class FhirError extends Error {
  constructor(public status: number, public outcome: unknown) {
    super(`FHIR request failed with status ${status}`);
  }
}

export class FhirClient {
  constructor(
    private baseUrl: string,
    private token: () => Promise<string>,
    private fetcher: typeof fetch = fetch,
  ) {}

  async #get<T>(path: string): Promise<T> {
    const res = await this.fetcher(new URL(path, this.baseUrl.replace(/\/?$/, "/")), {
      headers: { accept: "application/fhir+json", authorization: `Bearer ${await this.token()}` },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new FhirError(res.status, body); // body is an OperationOutcome; do not log it with PHI
    return body as T;
  }

  read<T extends Resource = Patient>(type: string, id: string): Promise<T> {
    return this.#get<T>(`${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
  }

  async search<T extends Resource = Patient>(type: string, params: Record<string, string>): Promise<T[]> {
    const q = new URLSearchParams(params).toString();
    const bundle = await this.#get<Bundle<T>>(`${encodeURIComponent(type)}?${q}`);
    return (bundle.entry ?? []).map((e) => e.resource);
  }
}
