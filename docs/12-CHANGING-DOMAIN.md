# Moving to a different domain

Nothing in the code hardcodes a hostname. Four things reference the domain, and
they have to agree or the browser will fail in ways that do not mention DNS.

Assume you are moving from `foundervoice.app` to `example.com`, with
the API at `api.example.com`.

## 1. DNS

In your DNS editor, create:

| Type | Name | Value |
| --- | --- | --- |
| A | `api` | your server's IPv4 |
| CNAME | `@` or `www` | the target Vercel gives you |

Exactly one `A` record for the API, and **no `AAAA`** unless the box really has
IPv6. A stray `AAAA` sends Let's Encrypt to a host that is not yours, and the
error never mentions IPv6.

## 2. The API server

```bash
cd ~/voicecoach && git pull    # or re-fetch the tarball
API_HOST=api.example.com WEB_ORIGIN=https://example.com \
  bash deploy/tls-setup.sh
```

That one command re-renders the Caddyfile for the new hostname, obtains a
certificate for it, and rewrites `CORS_ORIGINS` in `apps/api/.env`. The script
refuses to continue if DNS does not already point at the box, so it will not
burn a Let's Encrypt rate-limit slot on a typo.

The old certificate is left in place and simply expires. Caddy serves whichever
hostname the Caddyfile names.

## 3. Vercel

Project → Settings → Environment Variables:

```
NEXT_PUBLIC_API_BASE=https://api.example.com
NEXT_PUBLIC_SITE_URL=https://example.com
```

Then Settings → Domains → add `example.com`, and **redeploy**. These are
`NEXT_PUBLIC_*` variables, which are baked in at build time — editing them
without redeploying changes nothing, and the site keeps calling the old API.

## 4. Check it end to end

```bash
curl https://api.example.com/api/health

# CORS must name the new origin, or the browser blocks every call
curl -si -X OPTIONS https://api.example.com/api/sessions/upload \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
```

If that header is missing or shows the old domain, `CORS_ORIGINS` did not
update — check `apps/api/.env` and `sudo systemctl restart foundervoice`.

## What does not need changing

`QUOTA_SECRET` should stay exactly as it is. It keys the per-visitor free-tier
counters, and changing it resets everyone's usage to zero.
