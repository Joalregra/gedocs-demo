#!/bin/sh
# Container entrypoint. Only the web process prepares the application; the scheduler container
# reuses the same image and skips this setup.
set -e
cd /app

if [ "$1" = "frankenphp" ]; then
    # Public uploads are served through public/storage -> storage/app/public.
    php artisan storage:link --force

    php artisan migrate --force

    # First boot of the public demo: load the fictional data. Later boots keep what is there
    # (the scheduler resets it every night).
    if [ "$APP_DEMO" = "true" ]; then
        php artisan demo:reset --if-empty
    fi

    # Cache configuration, routes, views and events. Needs the final environment variables.
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache
fi

exec docker-php-entrypoint "$@"
