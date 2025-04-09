#!/bin/bash

# This script handles slot swapping for zero-downtime deployments
# It should be run from the pipeline with appropriate service connection

# Usage: ./slot-swap.sh <app-service-name> <resource-group> <source-slot> <target-slot>
# Example: ./slot-swap.sh taskify-prod taskify-rg staging production

# Check if required arguments are provided
if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <app-service-name> <resource-group> <source-slot> <target-slot>"
    exit 1
fi

APP_SERVICE_NAME=$1
RESOURCE_GROUP=$2
SOURCE_SLOT=$3
TARGET_SLOT=$4

echo "Preparing to swap slots for $APP_SERVICE_NAME..."

# Check if the app service exists
az webapp show --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: App Service $APP_SERVICE_NAME not found in resource group $RESOURCE_GROUP!"
    exit 1
fi

# Check if the source slot exists
az webapp deployment slot show --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --slot $SOURCE_SLOT > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Source slot $SOURCE_SLOT not found for App Service $APP_SERVICE_NAME!"
    exit 1
fi

# If target slot is not 'production', check if it exists
if [ "$TARGET_SLOT" != "production" ]; then
    az webapp deployment slot show --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --slot $TARGET_SLOT > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "Error: Target slot $TARGET_SLOT not found for App Service $APP_SERVICE_NAME!"
        exit 1
    fi
fi

# Perform the slot swap
echo "Swapping slots: $SOURCE_SLOT -> $TARGET_SLOT..."

if [ "$TARGET_SLOT" = "production" ]; then
    # Swap with production slot
    az webapp deployment slot swap --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --slot $SOURCE_SLOT --target-slot production
else
    # Swap between non-production slots
    az webapp deployment slot swap --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --slot $SOURCE_SLOT --target-slot $TARGET_SLOT
fi

# Check if swap was successful
if [ $? -eq 0 ]; then
    echo "Slot swap completed successfully!"
else
    echo "Error: Slot swap failed!"
    exit 1
fi

# Verify the swap by checking the app status
echo "Verifying application status after swap..."
HEALTH_CHECK_URL="https://$APP_SERVICE_NAME.azurewebsites.net/api/health"

if [ "$TARGET_SLOT" != "production" ]; then
    HEALTH_CHECK_URL="https://$APP_SERVICE_NAME-$TARGET_SLOT.azurewebsites.net/api/health"
fi

# Wait for the app to be fully available
MAX_RETRIES=10
RETRY_COUNT=0
SLEEP_TIME=15

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "Application is healthy and responding with status 200!"
        break
    else
        echo "Application is not ready yet. Status: $HTTP_STATUS. Retrying in $SLEEP_TIME seconds..."
        RETRY_COUNT=$((RETRY_COUNT+1))
        sleep $SLEEP_TIME
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "Warning: Application health check did not return 200 after $MAX_RETRIES attempts."
    echo "Please check the application logs and status manually."
    # Not failing the deployment, but alerting
fi

echo "Slot swap process completed for $APP_SERVICE_NAME." 