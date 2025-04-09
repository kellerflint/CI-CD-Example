#!/bin/bash

# This script runs database migrations during deployment
# It should be run from the pipeline with appropriate environment variables set

# Usage: ./db-migrate.sh <environment>
# Example: ./db-migrate.sh development

# Check if required arguments are provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <environment>"
    exit 1
fi

ENVIRONMENT=$1

# Load environment variables from the appropriate .env file
ENV_FILE=".env.${ENVIRONMENT}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Environment file $ENV_FILE not found!"
    exit 1
fi

echo "Running database migrations for $ENVIRONMENT environment..."

# Export environment variables from the .env file
export $(grep -v '^#' $ENV_FILE | xargs)

# Run migrations
echo "Running knex migrations..."
npx knex migrate:latest --env $ENVIRONMENT

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo "Database migrations completed successfully!"
else
    echo "Error: Database migrations failed!"
    exit 1
fi

# Run seeds if in development environment
if [ "$ENVIRONMENT" = "development" ]; then
    echo "Running seeds for development environment..."
    npx knex seed:run --env $ENVIRONMENT
    
    if [ $? -eq 0 ]; then
        echo "Seed data loaded successfully!"
    else
        echo "Warning: Seed data loading failed, but continuing deployment."
    fi
fi

echo "Database setup completed for $ENVIRONMENT environment." 