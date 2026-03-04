FROM postgres:latest

# Copy initialization scripts into the Docker image
# Order: db_ddl.sql (schema) runs first, then load-data.sh (vocabulary CSV)
# Note: init-db.sh was removed to avoid duplicate execution of scripts
COPY load-data.sh /docker-entrypoint-initdb.d/
COPY sql_scripts/* /docker-entrypoint-initdb.d/
COPY vocabulary.csv /docker-entrypoint-initdb.d/

# Give executable permissions to the script
RUN chmod +x /docker-entrypoint-initdb.d/load-data.sh

# Expose the PostgreSQL port
EXPOSE 5432
