# The landing page for kevspowertools.com: static files served by unprivileged nginx on port 8080.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY scripts ./scripts
COPY site ./site
RUN node scripts/build.mjs

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
