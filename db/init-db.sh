#!/bin/bash
set -e

echo "Starting init-db.sh script..."

# Debug: check for environment variables
echo "POSTGRES_USER: $POSTGRES_USER"
echo "POSTGRES_DB: $POSTGRES_DB"

echo "Applying SQL scripts in /docker-entrypoint-initdb.d/"

# Apply all SQL scripts
for f in /docker-entrypoint-initdb.d/*.sql; do
    echo "Applying $f"
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done

# Load CSV data
/docker-entrypoint-initdb.d/load-data.sh

echo "Finished running init-db.sh script."
