# Deploy on Oracle Cloud (Always Free)

The demo runs on **one** Always Free virtual machine with Docker. Nothing here needs a paid Oracle service: no load balancer, no managed database, no extra block volumes. TLS comes from Caddy (inside the app container) with a free Let's Encrypt certificate.

Check Oracle's current "Always Free resources" page before you start; limits and availability by region change.

## What fits in the free tier

| Option | Shape | Resources | Verdict |
|---|---|---|---|
| Recommended | Ampere A1 (`VM.Standard.A1.Flex`) | 1 OCPU, 6 GB RAM (the account allows up to 4 OCPU and 24 GB in total) | Comfortable: app, scheduler and database run with room to spare. |
| Fallback | AMD Micro (`VM.Standard.E2.1.Micro`) | 1/8 OCPU, 1 GB RAM | Works with a swap file and the tweaks in [the Micro section](#if-you-only-get-the-1-gb-amd-micro-vm). Never build the image on it. |

Also included in Always Free and enough for this project: 200 GB of block storage in total (a 50 GB boot volume is plenty), 10 TB of outbound traffic per month, one VCN with an internet gateway, and public IPv4 addresses.

Avoid, because they can cost money: a load balancer, NAT gateway, managed MySQL/HeatWave, extra block or object storage beyond the free allowance, and any shape without the "Always Free-eligible" label.

**Two risks to know about**

- *Capacity.* Free Ampere instances are often reported as "Out of host capacity". Try another availability domain or try again later. Upgrading the account to Pay As You Go (you keep paying nothing while you stay inside the Always Free limits) usually removes the problem.
- *Idle reclamation.* Oracle may reclaim Always Free compute instances that stay idle for 7 days (low CPU, network and, on Ampere, memory use). A demo that few people visit can fall under that. The nightly reset and a free uptime monitor pinging the site every few minutes help; a Pay As You Go account is also commonly reported as not being reclaimed. Create a **budget alert of 1 USD** so any unexpected charge reaches you by email.

## 1. Create the VM

1. Compute > Instances > Create instance. Image: Canonical Ubuntu 24.04 (aarch64 for Ampere). Shape: `VM.Standard.A1.Flex`, 1 OCPU, 6 GB. Boot volume: 50 GB.
2. Add your SSH public key. Keep "Assign a public IPv4 address" on.
3. After it starts, reserve the address so it survives a rebuild: Networking > IP management > Reserved public IPs (one is free while attached).

## 2. Open the network

Oracle blocks traffic twice: in the cloud network and again inside the Ubuntu image.

**Cloud network.** Networking > Virtual cloud networks > your VCN > Security lists > Default. Add ingress rules (source `0.0.0.0/0` unless stated):

| Protocol | Port | Why |
|---|---|---|
| TCP | 22 | SSH (restrict the source to your own IP if you can) |
| TCP | 80 | Let's Encrypt validation and redirect to HTTPS |
| TCP | 443 | HTTPS |
| UDP | 443 | HTTP/3 (optional) |

**Inside the VM.** The Oracle Ubuntu image ships firewall rules that reject new connections. List them, then insert the new rules **before** the final reject rule:

```bash
sudo iptables -L INPUT --line-numbers
sudo iptables -I INPUT 5 -p tcp --dport 80  -m state --state NEW -j ACCEPT
sudo iptables -I INPUT 5 -p tcp --dport 443 -m state --state NEW -j ACCEPT
sudo iptables -I INPUT 5 -p udp --dport 443 -j ACCEPT
sudo apt-get install -y iptables-persistent   # answer yes to save the current rules
sudo netfilter-persistent save
```

Adjust the position `5` so the rules land above the `REJECT` line you saw in the listing.

## 3. DNS

Create an `A` record for the subdomain (for example `gedocs.yourdomain.com`) pointing to the reserved public IP. Wait until `dig +short gedocs.yourdomain.com` returns that address; Caddy cannot get a certificate before that.

## 4. Install Docker

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER    # log out and back in afterwards
```

## 5. Get the image

The GitHub Actions workflow [`docker.yml`](../.github/workflows/docker.yml) builds `linux/arm64` and `linux/amd64` and publishes the image to `ghcr.io/<your-user>/gedocs-demo`. Push to `main` once and wait for it to finish.

If the package is private, create a personal access token with only `read:packages` and run `docker login ghcr.io -u <your-user>` on the server. Making the package public avoids that.

## 6. Configure

```bash
git clone https://github.com/<your-user>/gedocs-demo.git && cd gedocs-demo
cp .env.production.example .env
```

Edit `.env`:

- `APP_DOMAIN`, `APP_URL`, `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS`: your subdomain.
- `ACME_EMAIL`: where Let's Encrypt can reach you.
- `APP_IMAGE`: the image published in the previous step.
- `DB_PASSWORD` and `DB_ROOT_PASSWORD`: long random values (`openssl rand -hex 24`).
- `APP_KEY`: `docker run --rm "$(grep ^APP_IMAGE= .env | cut -d= -f2)" php artisan key:generate --show`

This `.env` exists only on the server and is never committed.

## 7. Start

```bash
docker compose pull
docker compose up -d
docker compose logs -f app
```

On the first start the app runs the migrations and loads the fictional data (about 15 seconds). Open `https://gedocs.yourdomain.com`: the login page shows the one-click buttons.

Check the scheduler: `docker compose exec scheduler php artisan schedule:list` should list `demo:reset` at 03:00 and `pqrs:auto-archive-expired` every ten minutes.

## Operate

| Task | Command |
|---|---|
| Update to the latest image | `docker compose pull && docker compose up -d` |
| Restore the demo now | `docker compose exec app php artisan demo:reset` |
| Logs | `docker compose logs -f app` and `docker compose exec app tail -f storage/logs/laravel.log` |
| Stop everything | `docker compose down` (add `-v` to also delete the database and uploads) |

The database is disposable by design (it resets every night), so no backups are configured.

## If you only get the 1 GB AMD Micro VM

- Add swap before anything else:
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
- Set `DB_BUFFER_POOL=48M` in `.env`.
- Do not build the image there; always `docker compose pull` the one built by CI. Note that the Micro shape is `amd64`, which the workflow also publishes.
- Expect slower first loads and about 700 MB of used memory.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| The browser says the connection timed out | Port 80 or 443 is blocked in the security list **or** in the VM firewall (step 2). |
| Certificate error or the site only works on `http://` | DNS does not point to the VM yet, or port 80 is blocked so Let's Encrypt cannot validate. Check `docker compose logs app`. |
| `no matching manifest for linux/arm64` on pull | The image was not built for arm64. Re-run the Docker workflow. |
| "No application encryption key has been specified" | `APP_KEY` is empty in `.env`; generate it (step 6) and run `docker compose up -d` again. |
| Login works but you are logged out immediately | `SESSION_SECURE_COOKIE=true` while visiting over plain HTTP, or `SANCTUM_STATEFUL_DOMAINS` does not match your domain. |
| The demo data did not load | `APP_DEMO` is not `true`, or the database was not empty. Run `docker compose exec app php artisan demo:reset`. |

## Free-tier checklist

- [ ] The instance and its boot volume show "Always Free-eligible".
- [ ] Only the resources listed above exist in the tenancy (no load balancer, NAT gateway or extra volumes).
- [ ] A 1 USD budget alert is set.
- [ ] A free uptime monitor pings the site (also reduces the idle-reclamation risk).
