# Deploy on Oracle Cloud (Always Free)

> **The recommended way to run the demo is [AWS Lightsail](deploy-aws-lightsail.md)**, with a fixed monthly price and no dependence on free capacity. This guide is the zero-cost alternative: it works only if Oracle has free capacity in your account's home region, and it can stop working without notice (see the two risks below).

The demo runs on **one** Always Free virtual machine with Docker. Nothing here needs a paid Oracle service: no load balancer, no managed database, no extra block volumes. TLS comes from Caddy (inside the app container) with a free Let's Encrypt certificate.

Check Oracle's current [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm) page before you start; limits and availability by region change.

## What fits in the free tier

| Option | Shape | Resources | Verdict |
|---|---|---|---|
| Recommended | Ampere A1 (`VM.Standard.A1.Flex`) | 1 OCPU, 6 GB RAM | Comfortable: app, scheduler and database run with room to spare. |
| Fallback | AMD Micro (`VM.Standard.E2.1.Micro`) | 1/8 OCPU, 1 GB RAM | Works with a swap file and the tweaks in [the Micro section](#if-you-only-get-the-1-gb-amd-micro-vm). Never build the image on it. |

Limits that matter, as published by Oracle in October 2026:

- **Ampere A1:** since 15 June 2026 an account gets **2 OCPU and 12 GB of RAM in total** (it used to be 4 OCPU and 24 GB), split across at most four instances.
- **AMD Micro:** up to two instances, but this shape is **not available in every region**. Check that it is listed when you create the instance.
- 200 GB of block storage in total (a 50 GB boot volume is plenty), 10 TB of outbound traffic per month, and up to two VCNs on accounts that only use free resources.
- Public IPv4 addresses: the Always Free page does not list reserved public IPs, so check the price of a reserved IP in the console before creating one (see step 1).

Avoid, because they can cost money: a load balancer, NAT gateway, managed MySQL/HeatWave, extra block or object storage beyond the free allowance, and any shape without the "Always Free-eligible" label.

**The cost estimator does not subtract free resources.** The console shows list prices while you configure an instance (for example about 2.12 USD per month for a 50 GB boot volume) even when the resource is free. What counts is the "Always Free-eligible" label next to the shape and the volume.

**Two risks to know about**

- *Capacity.* Free instances are often reported as "Out of capacity for shape ... in availability domain ...". Some regions have a single availability domain and may have no free capacity at all, and the home region of an account cannot be changed. Try another availability domain, try again later, or use [the AWS Lightsail guide](deploy-aws-lightsail.md). Upgrading to Pay As You Go keeps free resources free and is often reported to help with capacity, but it is not guaranteed.
- *Idle reclamation.* Oracle may reclaim an Always Free instance when, during 7 days, **all three** of these hold: CPU use at the 95th percentile is below 20 %, network use is below 20 %, and (Ampere A1 only) memory use is below 20 %. A demo that few people visit can fall under that. **An uptime monitor does not prevent it**: a ping uses almost no CPU, network or memory. A Pay As You Go account is the mitigation most often reported, but it is not guaranteed. Create a **budget alert of 1 USD** so any unexpected charge reaches you by email.

## SSH key

Create a key pair on your own machine and paste the **public** half into the console when you create the VM:

```bash
ssh-keygen -t ed25519 -C "gedocs-demo" -f ~/.ssh/gedocs_demo
cat ~/.ssh/gedocs_demo.pub
```

The default user of the Ubuntu image is `ubuntu`. You will connect with `ssh -i ~/.ssh/gedocs_demo ubuntu@<public-ip>`.

## 1. Create the VM

1. Compute > Instances > Create instance. Pick the **shape first** (`VM.Standard.A1.Flex`, 1 OCPU, 6 GB), then **change the image** to **Canonical Ubuntu 24.04** (not the "Minimal" variant). On Ampere the console picks the aarch64 build for you. After connecting, confirm it with `uname -m` (`aarch64` on Ampere, `x86_64` on Micro). Boot volume: 50 GB.
2. Paste the public key. Keep "Assign a public IPv4 address" on.
3. Optional: reserve the address so it survives a rebuild (Networking > IP management > Reserved public IPs). Check its price in the console first, because the Always Free page does not mention reserved IPs. Without it, the address of a running instance stays the same, but a rebuilt instance gets a new one.

## 2. Open the network

Oracle blocks traffic twice: in the cloud network and again inside the Ubuntu image.

**Cloud network.** Networking > Virtual cloud networks > your VCN > Security lists > Default. Add ingress rules (source `0.0.0.0/0` unless stated):

| Protocol | Port | Why |
|---|---|---|
| TCP | 22 | SSH (restrict the source to your own IP if you can) |
| TCP | 80 | Let's Encrypt validation and redirect to HTTPS |
| TCP | 443 | HTTPS |
| UDP | 443 | HTTP/3 (optional) |

**Inside the VM.** The Oracle Ubuntu image ships firewall rules that reject new connections. The new rules must go **in the position of the `REJECT` rule**, so they land above it. Find that position, then insert the rules there:

```bash
sudo iptables -L INPUT -n --line-numbers
N=$(sudo iptables -L INPUT -n --line-numbers | awk '/REJECT/ {print $1; exit}'); echo "REJECT is rule $N"
sudo iptables -I INPUT "$N" -p tcp --dport 80  -m state --state NEW -j ACCEPT
sudo iptables -I INPUT "$N" -p tcp --dport 443 -m state --state NEW -j ACCEPT
sudo iptables -I INPUT "$N" -p udp --dport 443 -j ACCEPT
sudo apt-get install -y iptables-persistent   # answer yes to save the current rules
sudo netfilter-persistent save
```

Inserting at the same position pushes `REJECT` down each time, so the final order is correct. Check it with `sudo iptables -L INPUT -n --line-numbers`: the three new rules must appear before `REJECT`.

## 3. DNS

Create an `A` record for the subdomain (for example `gedocs.yourdomain.com`) pointing to the VM's public IP. Wait until `dig +short gedocs.yourdomain.com` returns that address; Caddy cannot get a certificate before that.

If the domain is on **Cloudflare**, set the record to **DNS only** (grey cloud). With the proxy on, Cloudflare terminates TLS in front of Caddy and the certificate request can fail or end in 525/526 errors or redirect loops. If the domain has `CAA` records, they must allow `letsencrypt.org`.

## 4. Install Docker

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER    # log out and back in afterwards
```

## 5. Get the image

The GitHub Actions workflow [`docker.yml`](../.github/workflows/docker.yml) publishes the image to `ghcr.io/<your-user>/gedocs-demo`. A normal push to `main` builds only `linux/amd64`, which is enough for the AMD Micro shape. **For Ampere (arm64) start the workflow by hand** (Actions > Docker image > Run workflow) and choose `linux/amd64,linux/arm64`; that build is slow because the PHP extensions are compiled under emulation (allow up to two hours). The next push to `main` replaces `latest` with the amd64-only image again, so pull the arm64 image right after that run finishes.

GHCR packages are private by default:

- **Public repository:** make the package public (*Package settings* > *Change visibility* > *Public*). The server then pulls it without logging in.
- **Private repository:** keep the package private and run `docker login ghcr.io -u <your-user>` on the server with a personal access token that has only `read:packages`. Do not make the package public: the image contains the code.

## 6. Configure

With a public repository, clone it:

```bash
git clone https://github.com/<your-user>/gedocs-demo.git && cd gedocs-demo
cp .env.production.example .env
```

With a private repository, copy only the two files the server needs, from your machine:

```bash
ssh -i ~/.ssh/gedocs_demo ubuntu@<public-ip> 'mkdir -p ~/gedocs-demo'
scp -i ~/.ssh/gedocs_demo docker-compose.yml .env.production.example ubuntu@<public-ip>:~/gedocs-demo/
ssh -i ~/.ssh/gedocs_demo ubuntu@<public-ip> 'cd ~/gedocs-demo && cp .env.production.example .env'
```

Edit `.env` on the server. The template ships with the placeholder `gedocs.example.com` and with `APP_IMAGE` commented out:

- `APP_DOMAIN`, `APP_URL`, `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS`: your subdomain.
- `ACME_EMAIL`: where Let's Encrypt can reach you. It must not be empty, or Caddy fails to parse its configuration.
- `APP_IMAGE`: uncomment it and set the image published in the previous step.
- `DB_PASSWORD` and `DB_ROOT_PASSWORD`: long random values (`openssl rand -hex 24`).
- `APP_KEY`: `docker run --rm "$(grep ^APP_IMAGE= .env | cut -d= -f2)" php artisan key:generate --show`, then paste the result.

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
| Stop the containers | `docker compose down` |

- `docker compose down -v` also deletes the `caddy_data` volume, which holds the TLS certificates, besides the database and uploads. Let's Encrypt limits how many certificates it issues per domain, so use `-v` only when you really want to start from zero.
- The configuration is cached when the container starts: after editing `.env`, run `docker compose up -d` so the containers are recreated.
- The database is disposable by design (it resets every night), so no backups are configured.

## If you only get the 1 GB AMD Micro VM

- Add swap before anything else:
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
- Set `DB_BUFFER_POOL=48M` in `.env` (the variable is not in the template: add the line).
- Do not build the image there; always `docker compose pull` the one built by CI. The Micro shape is `amd64`, which every push to `main` publishes.
- Expect slower first loads and about 700 MB of used memory.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Permission denied (publickey)` | Wrong user (it is `ubuntu`), wrong private key, or the public key pasted in the console was incomplete. |
| The browser says the connection timed out | Port 80 or 443 is blocked in the security list **or** in the VM firewall (step 2). |
| Certificate error or the site only works on `http://` | DNS does not point to the VM yet, or port 80 is blocked so Let's Encrypt cannot validate. Check `docker compose logs app`. |
| Cloudflare 525/526 errors or a redirect loop | The Cloudflare proxy (orange cloud) is on. Set the record to DNS only. |
| `Out of capacity for shape ...` when creating the VM | Oracle has no free capacity there. Try another availability domain, try again later, or use [the AWS Lightsail guide](deploy-aws-lightsail.md). |
| `no matching manifest for linux/arm64` on pull | `latest` is the amd64-only image of the last push. Run the Docker workflow by hand with `linux/amd64,linux/arm64` and pull again when it finishes. |
| `denied` or `unauthorized` when pulling | The GHCR package is private: make it public (public repositories only) or run `docker login ghcr.io`. |
| "No application encryption key has been specified" | `APP_KEY` is empty in `.env`; generate it (step 6) and run `docker compose up -d` again. |
| Login works but you are logged out immediately | `SESSION_SECURE_COOKIE=true` while visiting over plain HTTP, or `SANCTUM_STATEFUL_DOMAINS` does not match your domain. |
| The demo data did not load | `APP_DEMO` is not `true`, or the database was not empty. Run `docker compose exec app php artisan demo:reset`. |

## Free-tier checklist

- [ ] The instance and its boot volume show "Always Free-eligible" (ignore the list price in the cost estimator).
- [ ] Only the resources listed above exist in the tenancy (no load balancer, NAT gateway or extra volumes).
- [ ] A 1 USD budget alert is set.
- [ ] You know the idle-reclamation rule and have decided whether to move to Pay As You Go.
