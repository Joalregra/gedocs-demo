# Deploy on AWS Lightsail

The public demo runs on **one** Amazon Lightsail instance with Docker Compose: the app container (FrankenPHP with its built-in Caddy, which gets a free Let's Encrypt certificate), the scheduler container and MariaDB. No other AWS service is needed: no managed database, no load balancer, no Lightsail container service.

This is the recommended way to run the demo. For a zero-cost alternative that depends on free capacity being available, see [Deploy on Oracle Cloud (Always Free)](deploy-oracle.md).

## At a glance

| Item | Choice |
|---|---|
| Service | Amazon Lightsail |
| Plan | General purpose, dual-stack: 2 vCPU, 2 GB RAM, 60 GB SSD, 3 TB transfer per month |
| Price | 12 USD per month, public IPv4 included (October 2026; check the [pricing page](https://aws.amazon.com/lightsail/pricing)) |
| Region | `us-east-1` (Virginia), or the region closest to your audience |
| Operating system | Ubuntu 24.04 LTS, x86_64 (pulls the `linux/amd64` image) |
| DNS | An `A` record for the demo subdomain pointing to a Lightsail static IP |
| TLS | Caddy inside the `app` container, automatic Let's Encrypt certificate |

## What it costs

- A Lightsail plan is a **fixed bundle**: it is billed hourly up to the monthly price and includes the transfer allowance and one public IPv4 address.
- You only pay more if you create something extra: snapshots (about 0.05 USD per GB per month), a static IP that is **not** attached to an instance, a managed database (from 15 USD), a load balancer (18 USD) or transfer beyond the allowance. This guide uses none of them.
- A **stopped** instance is still billed. To stop all charges, delete the instance **and** release its static IP.
- New AWS accounts can start on a *Free plan* with promotional credits. That plan closes the account after six months or when the credits run out, and later deletes its resources. For an always-on demo, switch the account to the *Paid plan* before you start (remaining credits keep applying).

## 0. Secure the account

Do this once, before creating anything.

1. **MFA on the root user.** Account menu > *Security credentials* > *Multi-factor authentication (MFA)* > *Assign MFA device*.
2. **Account plan.** *Billing and Cost Management*: if the account is on the *Free plan*, upgrade it to the *Paid plan* (see above).
3. **Budget alert.** *Billing and Cost Management* > *Budgets* > *Create budget* > monthly cost budget of **15 USD** with email alerts on actual and forecasted spend.
4. **Daily-use IAM user (recommended).** *IAM* > *Users* > *Create user* with console access and the `AdministratorAccess` policy, then enable MFA for it. Use it instead of the root user from now on.

## 1. Create the instance

1. Open the Lightsail console and choose **Create instance**.
2. **Location:** region `us-east-1` (Virginia). Keep the default availability zone.
3. **Image:** platform **Linux/Unix**, blueprint **Operating System (OS) only** > **Ubuntu 24.04 LTS**. Do not pick an application blueprint (LAMP, Node.js and so on): the stack runs in Docker.
4. Leave the launch script empty and automatic snapshots off.
5. **SSH key pair:** *Change SSH key pair* > *Upload New* and upload your **public** key (`~/.ssh/<key>.pub`). Lightsail key pairs are per region, so upload it while `us-east-1` is selected. To create a key first: `ssh-keygen -t ed25519 -C "gedocs-demo" -f ~/.ssh/gedocs_demo`.
6. **Plan:** network type **Dual-stack**, size **General purpose, 2 GB**. Avoid the IPv6-only plans: many visitors still have no IPv6.
7. **Name:** `gedocs-demo`, then **Create instance**. It reaches *Running* in a minute or two.

## 2. Attach a static IP

The default public IP changes when the instance is stopped and started.

1. Lightsail console > **Networking** > **Create static IP**.
2. Same region, attach it to `gedocs-demo`, name it `gedocs-ip`, create.

A static IP is free while it is attached to an instance and billed while it is not. Use this address for DNS and SSH from now on.

## 3. Open the firewall

Instance > **Networking** tab > firewall rules. Lightsail opens SSH (22) and HTTP (80) by default; add HTTPS. Use "any address" as the source for every rule; the current console lists them as *Any IPv4 or IPv6 address* (older consoles show separate IPv4 and IPv6 tables: add the same rules to both).

| Application | Protocol | Port | Why |
|---|---|---|---|
| HTTP | TCP | 80 | Let's Encrypt validation and the redirect to HTTPS |
| HTTPS | TCP | 443 | The demo |
| Custom | UDP | 443 | HTTP/3 (optional) |
| SSH | TCP | 22 | Administration. Keep "Allow Lightsail browser SSH" enabled |

Leave port 22 open to any address: the instance only accepts key-based logins, and home IP addresses change often. Do not restrict port 80, or Let's Encrypt cannot validate the domain.

The Lightsail Ubuntu image has no extra host firewall rules, so there is nothing to change with `iptables`. MariaDB publishes no port, so it is unreachable from the internet regardless of these rules.

## 4. DNS

Create an `A` record for the demo subdomain (for example `gedocs.yourdomain.com`) pointing to the static IP.

If the domain is on **Cloudflare**, set the record's proxy status to **DNS only** (grey cloud). With the proxy on, Cloudflare terminates TLS in front of Caddy and the first certificate request can fail or end in 525/526 errors or redirect loops. Once the site works you may turn the proxy on with SSL/TLS mode **Full (strict)** to cache static assets closer to visitors.

Do not add an `AAAA` record for now. If the domain has `CAA` records, they must allow `letsencrypt.org`. Before starting the app, wait until this returns the static IP:

```bash
dig +short gedocs.yourdomain.com
```

Caddy cannot get a certificate until the name resolves, and failed attempts count against Let's Encrypt rate limits.

## 5. Connect

The Lightsail Ubuntu user is `ubuntu`:

```bash
ssh -i ~/.ssh/<key> ubuntu@<static-ip>
```

Optional shortcut in `~/.ssh/config` on your machine:

```
Host gedocs
    HostName <static-ip>
    User ubuntu
    IdentityFile ~/.ssh/<key>
```

If you ever lose terminal access, use **Connect using SSH** on the instance page (browser terminal).

The image already disables root and password logins. Confirm it:

```bash
sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication'
```

Expected: `permitrootlogin no` (or `without-password`) and `passwordauthentication no`. If not, add `PermitRootLogin no` and `PasswordAuthentication no` to `/etc/ssh/sshd_config.d/00-hardening.conf` (files in that directory are read first and the first value wins), then run `sudo sshd -t && sudo systemctl restart ssh`.

## 6. Prepare the server

Update the system and add 2 GB of swap as a safety margin for the 2 GB plan:

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

If the upgrade installed a new kernel, run `sudo reboot` and reconnect.

## 7. Install Docker

```bash
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Log out and back in, then check that `docker ps` works without `sudo`.

## 8. Get the image

The GitHub Actions workflow [`docker.yml`](../.github/workflows/docker.yml) builds `linux/amd64` and `linux/arm64` and publishes `ghcr.io/<your-user>/gedocs-demo`. Confirm that the latest run on `main` succeeded and that the package appears under your GitHub profile's *Packages*.

GHCR packages are private by default:

- **Public repository:** make the package public (*Package settings* > *Change visibility* > *Public*).
- **Private repository:** keep the package private and run `docker login ghcr.io -u <your-user>` on the server with a personal access token that has only `read:packages`. Do not publish the image of a private repository, because it contains the code.

## 9. Configure

```bash
git clone https://github.com/<your-user>/gedocs-demo.git && cd gedocs-demo
cp .env.production.example .env
nano .env
```

For a private repository, copy only the two files the server needs instead of cloning:

```bash
ssh gedocs 'mkdir -p ~/gedocs-demo'
scp docker-compose.yml .env.production.example gedocs:~/gedocs-demo/
ssh gedocs 'cd ~/gedocs-demo && cp .env.production.example .env'
```

Edit `.env`. The template ships with the placeholder `gedocs.example.com` in the four domain values and with `APP_IMAGE` commented out: replace the domain everywhere and **uncomment `APP_IMAGE` before generating `APP_KEY`**, because the key command reads it.

| Variable | Value |
|---|---|
| `APP_DOMAIN` | `gedocs.yourdomain.com` |
| `APP_URL` | `https://gedocs.yourdomain.com` |
| `SANCTUM_STATEFUL_DOMAINS` | `gedocs.yourdomain.com` |
| `CORS_ALLOWED_ORIGINS` | `https://gedocs.yourdomain.com` |
| `ACME_EMAIL` | An address Let's Encrypt can reach. It must not be empty, or Caddy fails to parse its configuration |
| `APP_IMAGE` | `ghcr.io/<your-user-in-lowercase>/gedocs-demo:latest` (uncomment the line) |
| `DB_PASSWORD`, `DB_ROOT_PASSWORD` | Long random values: `openssl rand -hex 24` |
| `APP_KEY` | `docker run --rm "$(grep ^APP_IMAGE= .env \| cut -d= -f2)" php artisan key:generate --show`, then paste the result |
| `DB_BUFFER_POOL` | Keep the default (`128M`) on the 2 GB plan. It is not in the template: add it only to change it |
| `APP_DEMO`, `SESSION_SECURE_COOKIE` | Already `true` in the template. Keep them: the first enables the demo data, the one-click login and the nightly reset, the second keeps the session cookie on HTTPS only |

This `.env` exists only on the server and is never committed.

## 10. Start and verify

```bash
docker compose pull
docker compose up -d
docker compose logs -f app
```

On the first start the app runs the migrations and loads the fictional data (about 15 seconds), and Caddy obtains the certificate. Then check:

1. `https://gedocs.yourdomain.com` shows the login page with the one-click role buttons and a valid certificate.
2. Each role can sign in and stays signed in.
3. `docker compose exec scheduler php artisan schedule:list` lists `demo:reset` at 03:00 and `pqrs:auto-archive-expired` every ten minutes.
4. `docker stats --no-stream` and `free -h` show memory use. Note the numbers as a baseline.

## Operate

| Task | Command or place |
|---|---|
| Update to the latest image | `docker compose pull && docker compose up -d` |
| Restore the demo now | `docker compose exec app php artisan demo:reset` |
| Logs | `docker compose logs -f app` and `docker compose exec app tail -f storage/logs/laravel.log` |
| Memory | `docker stats --no-stream`, `free -h` |
| CPU, network and burst capacity | Instance > *Metrics* in the Lightsail console |
| Spend | *Billing and Cost Management* > *Bills* |
| Stop the containers | `docker compose down` |

- `docker compose down -v` also deletes the `caddy_data` volume with the TLS certificates, besides the database and uploads. Let's Encrypt limits how many certificates it issues per domain, so use `-v` only when you really want to start from zero.
- The configuration is cached when the container starts: after editing `.env`, run `docker compose up -d` so the containers are recreated.
- Security updates install automatically (`unattended-upgrades`). When the login banner says *System restart required*, run `sudo reboot`; the containers restart on their own.
- The database resets every night by design, so no backups or snapshots are configured.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Permission denied (publickey)` | Wrong user (it is `ubuntu`) or key, or the key pair was uploaded in another region |
| The browser times out | The HTTPS (443) rule is missing from the instance firewall |
| The IP changed after a restart | The static IP is not attached (step 2) |
| Certificate error, or the site only works on `http://` | DNS does not point to the static IP yet, or port 80 is closed. Check `dig` and `docker compose logs app` |
| Cloudflare 525/526 errors or a redirect loop | The Cloudflare proxy (orange cloud) is on. Set the record to DNS only |
| `denied` or `unauthorized` when pulling | The GHCR package is private: make it public or run `docker login ghcr.io` |
| "No application encryption key has been specified" | `APP_KEY` is empty: generate it (step 9) and run `docker compose up -d` |
| Signed out right after signing in | `SANCTUM_STATEFUL_DOMAINS` does not match the domain, or the site is being visited over plain HTTP while `SESSION_SECURE_COOKIE=true` |
| The demo data did not load | `APP_DEMO` is not `true`, or the database was not empty. Run `docker compose exec app php artisan demo:reset` |
| Slow after sustained use | Burst capacity exhausted or memory pressure: check *Metrics*, `free -h` and `docker stats` |

## Checklist

- [ ] Root user has MFA; a separate IAM user is used day to day.
- [ ] The account is on the Paid plan and a 15 USD budget alert exists.
- [ ] The static IP is attached to the instance.
- [ ] Firewall: 22, 80 and 443 (TCP) open, optional 443 (UDP); nothing else.
- [ ] The DNS record points to the static IP (DNS only on Cloudflare).
- [ ] The demo loads over HTTPS and the scheduler lists both tasks.
- [ ] The server `.env` is stored safely outside Git.

## Behind the shared proxy

The `app` container publishes ports 80 and 443 because its Caddy terminates TLS. To host another service on the same instance (for example the portfolio API), a single reverse proxy sits in front of both: it owns ports 80 and 443 and the certificates, Gedocs serves plain HTTP on a shared Docker network, and the proxy routes each host name to its container. The proxy lives in the portfolio repository (`developer-portfolio`, `deploy/proxy/`), and its runbook is `docs/deploy.md` there.

`docker-compose.proxy.yml` is the variant that makes Gedocs run that way. The base `docker-compose.yml` is not changed, so the single-app setup above keeps working.

What changes for Gedocs:

- `app` publishes no port and joins the external Docker network `web` with the alias `gedocs-app`. The network is created once, with a fixed subnet, by the portfolio runbook.
- `APP_DOMAIN=:80` in the server `.env` makes the Caddy inside the container listen on port 80 only and request no certificate. It keeps adding its security headers and the sandbox for `/storage`.
- `COMPOSE_FILE=docker-compose.yml:docker-compose.proxy.yml` in the same `.env` makes `docker compose pull` and `docker compose up -d` use both files without `-f`.
- `APP_URL` stays `https://` with the public host name and `SESSION_SECURE_COOKIE` stays `true`. Laravel sees HTTPS through `X-Forwarded-Proto`, because the app already trusts the proxy headers (`trustProxies`). That is acceptable because the container can be reached only from the `web` network and its own internal network.
- `ACME_EMAIL` must stay defined even though it is no longer used: the internal `Caddyfile` reads it.
- The `caddy_data` volume is no longer used. Keep it until the change is confirmed, so going back finds the old certificate.

To switch (the demo is unavailable for one to three minutes, so do it at night):

```bash
docker compose version              # 2.24 or later is needed for !reset
git pull --ff-only
cp .env .env.before-proxy
sed -i 's/^APP_DOMAIN=.*/APP_DOMAIN=:80/' .env
grep -q '^COMPOSE_FILE=' .env || echo 'COMPOSE_FILE=docker-compose.yml:docker-compose.proxy.yml' >> .env
docker compose up -d                # Gedocs frees ports 80 and 443 here
# then start the shared proxy from the portfolio repository: cd deploy/proxy && docker compose up -d
```

To go back, stop the shared proxy and restore the old `.env`:

```bash
(cd <path-to-portfolio>/deploy/proxy && docker compose down)
cp .env.before-proxy .env
docker compose up -d
```

The demo then runs as before, with its own Caddy and the certificate saved in `caddy_data`. A `502` from the proxy means the `app` container is not on the `web` network or is not running: check `docker compose ps` and `docker network inspect web`.
