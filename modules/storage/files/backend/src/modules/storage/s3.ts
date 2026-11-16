import { AwsClient } from "aws4fetch";
import { AppError } from "../../shared/errors/problem.ts";

export interface ObjectStore {
  /** A URL that lets the holder PUT or GET exactly this object for `expiresIn` seconds. */
  presign(method: "GET" | "PUT", key: string, expiresIn: number): Promise<string>;
  /** Size in bytes, or null when the object does not exist. */
  size(key: string): Promise<number | null>;
  remove(key: string): Promise<void>;
}

type Env = (name: string) => string | undefined;

/** Reads S3_* settings when first used, so an installed but unconfigured module does not stop the server from booting. */
export function s3FromEnv(env: Env = Deno.env.get.bind(Deno.env)): ObjectStore {
  const bucket = env("S3_BUCKET");
  const accessKeyId = env("S3_ACCESS_KEY_ID");
  const secretAccessKey = env("S3_SECRET_ACCESS_KEY");
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new AppError(
      503,
      "Service Unavailable",
      "File storage is not configured (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)",
    );
  }
  const region = env("S3_REGION") ?? "auto";
  const endpoint = (env("S3_ENDPOINT") || `https://s3.${region}.amazonaws.com`).replace(/\/$/, "");
  const aws = new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
  // Path-style (endpoint/bucket/key) works on R2, MinIO and Supabase as well as AWS.
  const url = (key: string) => `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

  return {
    async presign(method, key, expiresIn) {
      // aws4fetch takes the expiry from the URL's query string (default 24 h).
      const target = new URL(url(key));
      target.searchParams.set("X-Amz-Expires", String(expiresIn));
      const signed = await aws.sign(target, { method, aws: { signQuery: true } });
      return signed.url;
    },
    async size(key) {
      const res = await aws.fetch(url(key), { method: "HEAD" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Storage HEAD answered ${res.status}`);
      return Number(res.headers.get("content-length") ?? 0);
    },
    async remove(key) {
      const res = await aws.fetch(url(key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`Storage DELETE answered ${res.status}`);
    },
  };
}
