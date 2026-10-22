# syntax=docker/dockerfile:1
#
# Multi-stage image for the public demo. Production runs on amd64 (AWS Lightsail); arm64 (Oracle Ampere
# alternative) is built only on demand. Build it in CI and pull it on the server: compiling on a small
# instance is slow and memory hungry.

# ---- 1. Frontend assets (Vite) ----------------------------------------------------------------------
# The compiled JS and CSS are identical for every architecture, so this stage always runs on the build
# machine's own architecture. Under QEMU emulation the native tools of Vite are very slow and can hang.
FROM --platform=$BUILDPLATFORM node:22-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY vite.config.js postcss.config.js jsconfig.json ./
COPY resources ./resources
COPY public ./public
RUN npm run build

# ---- 2. PHP dependencies (production only) ----------------------------------------------------------
# vendor/ is plain PHP and does not depend on the architecture either, so it also runs natively.
FROM --platform=$BUILDPLATFORM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
# Platform extensions (gd, intl, zip...) exist in the runtime image, not in this stage.
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --no-autoloader --ignore-platform-reqs

# ---- 3. Runtime: FrankenPHP (Caddy + PHP) -----------------------------------------------------------
# Base image pinned to PHP 8.4.27 (security release of 21 October 2026). To update, change the tag and rebuild.
FROM dunglas/frankenphp:1-php8.4.27-bookworm AS runtime

RUN install-php-extensions pdo_mysql gd zip intl bcmath opcache pcntl exif

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /usr/local/bin/app-entrypoint
RUN chmod +x /usr/local/bin/app-entrypoint

WORKDIR /app
# Files are copied already owned by the runtime user. A recursive chown afterwards would rewrite every
# file of vendor/ into a new layer: a bigger image and a much slower build.
COPY --from=vendor --chown=www-data:www-data /app/vendor ./vendor
COPY --chown=www-data:www-data . .
COPY --from=assets --chown=www-data:www-data /app/public/build ./public/build

# The autoloader is built here (the vendor stage had no PHP extensions); Composer's post-autoload-dump
# script also runs package discovery. The image runs as www-data, so FrankenPHP only gets the
# capability to bind ports 80 and 443. Only the directories the app writes to need a new owner.
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/public bootstrap/cache \
    && rm -f .env \
    && setcap CAP_NET_BIND_SERVICE=+eip /usr/local/bin/frankenphp \
    && chown -R www-data:www-data storage bootstrap/cache /data/caddy /config/caddy

USER www-data
EXPOSE 80 443 443/udp

ENTRYPOINT ["app-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
