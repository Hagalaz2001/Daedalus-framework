# File storage module

Files live in an S3-compatible bucket; Postgres keeps the metadata (`files` table, per organization). Bytes never pass
through the API server.

Flow:

1. `POST /files { filename, contentType, sizeBytes }` returns a file record and a signed `PUT` URL (valid 15 minutes).
2. The client uploads the bytes straight to that URL (`PUT`, body = the file).
3. `POST /files/{id}/complete` checks the object exists and is within `FILE_MAX_BYTES`, then marks the file `ready`. S3
   cannot cap the size of a signed PUT, so this step is where the limit is enforced (oversized objects are deleted).
4. `GET /files/{id}` returns a 5-minute signed download URL. Lists only show `ready` files.

| Provider         | `S3_ENDPOINT`                                 | `S3_REGION`    |
| ---------------- | --------------------------------------------- | -------------- |
| Cloudflare R2    | `https://<account>.r2.cloudflarestorage.com`  | `auto`         |
| MinIO (local)    | `http://localhost:9000`                       | `us-east-1`    |
| Supabase Storage | `https://<project>.supabase.co/storage/v1/s3` | project region |
| AWS S3           | empty                                         | bucket region  |

Local development: run MinIO
(`docker run -p 9000:9000 -e MINIO_ROOT_USER=dev -e MINIO_ROOT_PASSWORD=devdevdev minio/minio server /data`), create the
bucket, set the five `S3_*` variables. Add a CORS rule on the bucket allowing `PUT` from your web origin. Use a key
scoped to one bucket, and a lifecycle rule to delete abandoned uploads (files stuck in `pending`).
