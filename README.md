# kevspowertools.com

The landing page for Kev's Power Tools: one card per tool, linking to

- [Puddle](https://puddle.kevspowertools.com/), messy data to tidy in the browser
- [Mermaid Factory](https://mermaid.kevspowertools.com/), Mermaid diagrams with a live preview
- Wellyboot BI, charts and dashboards from Puddle data (coming soon)

It is a static page with no scripts, served by unprivileged nginx in a container, and published through a
Cloudflare Tunnel like the tools themselves.

## The app list

`site/apps.json` is the one list of tools. The build renders a card for each into `index.html`, and the page serves
the file itself at `https://kevspowertools.com/apps.json`, so the app switcher in each tool reads the same list.
It is served with `Access-Control-Allow-Origin: *` and `Cross-Origin-Resource-Policy: cross-origin`, because Puddle is
cross-origin isolated and could not read it otherwise, and cached for five minutes.

Each entry has:

| Field | Meaning |
| --- | --- |
| `id` | Stable id, also picks the card's icon in `scripts/build.mjs` |
| `name` | Display name |
| `url` | Where the tool lives (https) |
| `description` | A short line, for the switcher |
| `summary` | A sentence or two, for the card |
| `status` | `live` for a link card, `soon` for a "Coming soon" card with no link |

To add a tool or open Wellyboot BI, edit `apps.json` (for Wellyboot, set `status` to `live` and check `url`), then
merge to main; CI publishes a new image.

## Development

Needs Node 22. No dependencies.

```sh
npm test            # unit tests for the build, compose file and nginx headers
npm run build       # writes dist/
python3 -m http.server -d dist 8000
```

## Running it

```sh
cp .env.example .env    # then paste the tunnel token into it
docker compose up -d
```

The page is on http://localhost:8090 (`SITE_PORT`). `SITE_IMAGE` in `.env.example` pulls the amd64 and arm64 image
CI publishes from main, `ghcr.io/kevinmcaleer/kevspowertools.com:latest`; leave it unset to build locally.

### The tunnel

The landing page needs its own tunnel. Puddle's `cloudflared` sits on Puddle's compose network and can't reach this
stack's `site` service, and replicas of one tunnel must all reach every hostname it serves.

1. Cloudflare dashboard, **Zero Trust > Networks > Tunnels > Create a tunnel**, type **Cloudflared**, name it
   `kevspowertools`. Copy the token (the string after `--token` in the install command) into `CLOUDFLARE_TUNNEL_TOKEN`
   in `.env`.
2. On **Public Hostname**, add the apex: leave the subdomain empty, domain `kevspowertools.com`, service **HTTP**,
   URL `site:8080`. Add `www` the same way if you want it.
3. `docker compose up -d`. `COMPOSE_PROFILES=tunnel` in `.env` starts `cloudflared` with the page; it shows as
   **Healthy** in the dashboard once connected.

Cloudflare replaces the apex DNS record when you add the hostname, so remove any existing A or CNAME record for
`kevspowertools.com` first. Treat the token like a password and never commit it; rotate it from the tunnel's page if it
leaks. Running the same stack with the same token on more nodes adds replicas, which is safe here since the page holds
no state.
