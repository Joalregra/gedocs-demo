# syntax=docker/dockerfile:1
#
# Multi-stage image for the public demo. Works on amd64 (AWS Lightsail) and arm64 (Oracle Ampere alternative).
# Build it in CI and pull it on the server: compiling on a small instance is slow and memory hungry.

# ---- 1. Frontend assets (Vite) ----------------------------------------------------------------------
FROM node:22-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY vite.config.js postcss.config.js jsconfig.json ./
COPY resources ./resources
COPY public ./public
RUN npm run build

# ---- 2. PHP dependencies (production only) ----------------------------------------------------------
FROM composer:2 AS vendor
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
COPY --from=vendor /app/vendor ./vendor
COPY . .
COPY --from=assets /app/public/build ./public/build

# The autoloader is built here (the vendor stage had no PHP extensions); Composer's post-autoload-dump
# script also runs package discovery. The image runs as www-data, so FrankenPHP only gets the
# capability to bind ports 80 and 443.
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/public bootstrap/cache \
    && rm -f .env \
    && setcap CAP_NET_BIND_SERVICE=+eip /usr/local/bin/frankenphp \
    && chown -R www-data:www-data /app /data/caddy /config/caddy

USER www-data
EXPOSE 80 443 443/udp

ENTRYPOINT ["app-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
