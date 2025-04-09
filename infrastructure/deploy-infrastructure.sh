#!/bin/bash

# This script deploys the Azure infrastructure using Bicep templates
# It should be run from the pipeline with appropriate service connection

# Usage: ./deploy-infrastructure.sh <environment> <resource-group> <location>
# Example: ./deploy-infrastructure.sh development taskify-rg eastus

# Check if required arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <environment> <resource-group> <location>"
    exit 1
fi

ENVIRONMENT=$1
RESOURCE_GROUP=$2
LOCATION=$3

# Generate a random password for PostgreSQL
POSTGRES_PASSWORD=$(openssl rand -base64 16)

echo "Deploying infrastructure for $ENVIRONMENT environment..."

# Create resource group if it doesn't exist
az group create --name $RESOURCE_GROUP --location $LOCATION

# Deploy the Bicep template
az deployment group create \
  --name "taskify-$ENVIRONMENT-$(date +%Y%m%d%H%M%S)" \
  --resource-group $RESOURCE_GROUP \
  --template-file azure-resources.bicep \
  --parameters environmentName=$ENVIRONMENT \
               location=$LOCATION \
               postgresAdminPassword=$POSTGRES_PASSWORD

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo "Infrastructure deployment completed successfully!"
    
    # Get the PostgreSQL server name
    DB_SERVER=$(az deployment group show \
      --name "taskify-$ENVIRONMENT-$(date +%Y%m%d%H%M%S)" \
      --resource-group $RESOURCE_GROUP \
      --query "properties.outputs.databaseServer.value" \
      --output tsv)
    
    # Get the App Service URL
    APP_URL=$(az deployment group show \
      --name "taskify-$ENVIRONMENT-$(date +%Y%m%d%H%M%S)" \
      --resource-group $RESOURCE_GROUP \
      --query "properties.outputs.appServiceUrl.value" \
      --output tsv)
    
    echo "PostgreSQL Server: $DB_SERVER"
    echo "App Service URL: $APP_URL"
    echo "PostgreSQL Password: $POSTGRES_PASSWORD"
    echo "Please save these values securely for future reference."
else
    echo "Error: Infrastructure deployment failed!"
    exit 1
fi

echo "Infrastructure deployment completed for $ENVIRONMENT environment." 