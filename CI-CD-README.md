# CI/CD Pipeline for Taskify

This document explains the CI/CD pipeline setup for the Taskify application, which is deployed to Azure App Service.

## Pipeline Overview

The CI/CD pipeline is implemented using Azure DevOps Pipelines and consists of the following stages:

1. **Build Stage**: Builds the application, runs linting, and prepares the deployment package
2. **Test Stage**: Runs unit and integration tests
3. **Deploy Stages**: Deploys to different environments (development, staging, production)

## Pipeline Configuration

The main pipeline configuration is defined in `azure-pipelines.yml` at the root of the repository. This file defines the stages, jobs, and tasks that make up the pipeline.

### Environment-Specific Deployments

The pipeline supports deployments to three environments:

- **Development**: Automatically deployed when changes are pushed to the `develop` branch
- **Staging**: Automatically deployed when changes are pushed to the `main` branch
- **Production**: Deployed after manual approval from the staging environment

### Deployment Templates

The pipeline uses a reusable template for deployments, located at `.azure/templates/deploy-environment.yml`. This template standardizes the deployment process across environments.

## Deployment Scripts

Several scripts are used to facilitate the deployment process:

- **deploy-env-variables.sh**: Deploys environment variables to Azure App Service
- **db-migrate.sh**: Runs database migrations during deployment
- **slot-swap.sh**: Handles slot swapping for zero-downtime deployments

## Zero-Downtime Deployments

For staging and production environments, the pipeline uses Azure App Service deployment slots to achieve zero-downtime deployments:

1. The application is first deployed to a staging slot
2. Database migrations are run against the production database
3. After successful deployment and verification, the staging slot is swapped with the production slot

## Environment Configuration

Environment-specific configuration is managed through `.env` files:

- `.env.development`: Development environment configuration
- `.env.staging`: Staging environment configuration
- `.env.production`: Production environment configuration

These files are not stored in the repository for security reasons. Instead, they are securely stored in Azure DevOps variable groups and deployed during the pipeline execution.

## Setting Up the Pipeline

To set up the pipeline in Azure DevOps:

1. Create a new pipeline in Azure DevOps
2. Select the repository containing the code
3. Configure the pipeline to use the existing `azure-pipelines.yml` file
4. Create the necessary service connections to Azure resources
5. Create variable groups for storing sensitive information
6. Set up environments with appropriate approvals and checks

## Required Azure Resources

The following Azure resources are required for the pipeline:

- **Azure App Service**: For hosting the application
- **Azure Database for PostgreSQL**: For the application database
- **Azure Key Vault**: For storing secrets
- **Azure DevOps Service Connections**: For connecting to Azure resources

## Security Considerations

- Sensitive information is stored in Azure Key Vault and accessed via Azure DevOps variable groups
- Production deployments require manual approval
- Database credentials and other secrets are never stored in the repository

## Monitoring and Logging

The pipeline includes steps to verify the deployment by checking the application's health endpoint. Additional monitoring can be set up using Azure Monitor and Application Insights. 