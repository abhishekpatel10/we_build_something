#!/bin/sh
set -e

echo "Waiting for postgres..."
while ! nc -z $POSTGRES_HOST $POSTGRES_PORT; do
  sleep 0.5
done
echo "PostgreSQL started"

python manage.py migrate --noinput
python manage.py seed_data

exec "$@"
