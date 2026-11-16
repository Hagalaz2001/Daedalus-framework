# Backend container. Build from the repository root (the workspace lockfile and contracts/ live there):
#   docker build -f backend/Dockerfile -t app-backend .
#   docker run -p 8787:8787 --env-file backend/.env app-backend
# Deno runs the TypeScript sources directly; migrations apply on start.
FROM denoland/deno:2.9.8
WORKDIR /app
# The whole workspace is copied because the lockfile covers every member; .dockerignore drops build output.
COPY . .
RUN deno install --frozen
WORKDIR /app/backend
ENV APP_ENV=production PORT=8787
EXPOSE 8787
USER deno
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s CMD ["deno", "eval", "const r = await fetch(`http://localhost:${Deno.env.get('PORT')}/health`); Deno.exit(r.ok ? 0 : 1)"]
CMD ["deno", "run", "-A", "src/main.ts"]
