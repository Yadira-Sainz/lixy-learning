#!/bin/bash
set -e

# Apply DDL scripts
for f in /docker-entrypoint-initdb.d/*.sql; do
    echo "Applying $f"
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done

