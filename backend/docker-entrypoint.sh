#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready on db:5432..."

# Wait for postgres to be reachable
while ! nc -z db 5432; do
  echo "Database is not ready yet... waiting"
  sleep 2
done

echo "Database is up - running migrations"
npx prisma migrate deploy

echo "Starting the application..."
npm run start:prod
