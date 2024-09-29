# Use the official PostgreSQL image from the Docker Hub
FROM postgres:latest

# Copy initialization scripts into the Docker image
COPY init-db.sh /docker-entrypoint-initdb.d/
COPY ddl-scripts/* /docker-entrypoint-initdb.d/

# Expose the PostgreSQL port
EXPOSE 5432
