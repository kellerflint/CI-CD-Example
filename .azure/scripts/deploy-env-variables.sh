#!/bin/bash

# This script deploys environment variables to Azure App Service
# It should be run from the pipeline with appropriate service connection

# Usage: ./deploy-env-variables.sh <environment> <app-service-name> <resource-group>
# Example: ./deploy-env-variables.sh development taskify-dev taskify-rg

# Check if required arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <environment> <app-service-name> <resource-group>"
    exit 1
fi

ENVIRONMENT=$1
APP_SERVICE_NAME=$2
RESOURCE_GROUP=$3

# Load environment variables from the appropriate .env file
ENV_FILE=".env.${ENVIRONMENT}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Environment file $ENV_FILE not found!"
    exit 1
fi

echo "Deploying environment variables from $ENV_FILE to $APP_SERVICE_NAME..."

# Create a temporary file for app settings
TEMP_SETTINGS=$(mktemp)

# Start with an empty JSON object
echo "{" > $TEMP_SETTINGS

# Read each line from the .env file
while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty lines and comments
    if [[ -z "$line" || "$line" =~ ^# ]]; then
        continue
    fi
    
    # Extract key and value
    key=$(echo "$line" | cut -d '=' -f 1)
    value=$(echo "$line" | cut -d '=' -f 2-)
    
    # Add to JSON (with comma for all but the first entry)
    if [ $(grep -c ":" $TEMP_SETTINGS) -gt 0 ]; then
        echo "," >> $TEMP_SETTINGS
    fi
    
    # Escape double quotes in the value
    value=$(echo "$value" | sed 's/"/\\"/g')
    
    # Add the key-value pair
    echo "  \"$key\": \"$value\"" >> $TEMP_SETTINGS
done < "$ENV_FILE"

# Close the JSON object
echo "}" >> $TEMP_SETTINGS

# Deploy app settings to Azure App Service
echo "Updating app settings for $APP_SERVICE_NAME..."
az webapp config appsettings set --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --settings @$TEMP_SETTINGS

# Clean up
rm $TEMP_SETTINGS

echo "Environment variables deployed successfully!" 