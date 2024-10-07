#!/bin/bash

# Import CSV data
psql -U $POSTGRES_USER -d $POSTGRES_DB -c "\copy vocabulary FROM '/docker-entrypoint-initdb.d/vocabulary.csv' DELIMITER ',' CSV HEADER;"
