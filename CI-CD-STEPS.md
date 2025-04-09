# CI/CD Process for Taskify Application

This document outlines the step-by-step CI/CD process for the Taskify application, explaining how the pipeline is triggered, what happens at each stage, and how deployments are managed across different environments.

## Pipeline Trigger

The CI/CD pipeline is automatically triggered by the following events:

- **Code Push**: When code is pushed to specific branches:
  - `develop` branch: Triggers build, test, and deployment to the Development environment
  - `main` branch: Triggers build, test, and deployment to the Staging environment
  - `feature/*`, `release/*`, `hotfix/*` branches: Triggers build and test stages only

- **Pull Request**: When a pull request is created or updated, the build and test stages are triggered to validate the changes before merging.

## CI/CD Stages

### 1. Build Stage

**Purpose**: Compile the application and prepare it for deployment.

**Steps**:
1. **Environment Setup**: Install Node.js (version 18.x)
2. **Dependency Installation**: Run `npm install` to install all required packages
3. **Code Quality Check**: Run `npm run lint` to ensure code meets quality standards
4. **Build Application**: Run `npm run build` to create a production-ready build
5. **Package Creation**: Create a ZIP archive of the application, excluding development files
6. **Artifact Publishing**: Publish the ZIP file as a build artifact for use in later stages

**Output**: A deployable ZIP package containing the application code.

### 2. Test Stage

**Purpose**: Verify the application's functionality through automated tests.

**Steps**:
1. **Unit Tests**:
   - Set up test environment
   - Run `npm run test:unit` to execute unit tests
   - Publish test results to Azure DevOps

2. **Integration Tests**:
   - Set up test database (PostgreSQL)
   - Configure test environment variables
   - Run database migrations
   - Execute integration tests with `npm run test:integration`
   - Publish test results to Azure DevOps

**Output**: Test reports indicating whether the application meets functional requirements.

### 3. Deployment Stages

#### 3.1 Development Environment Deployment

**Trigger**: Automatic when changes are pushed to the `develop` branch and tests pass.

**Steps**:
1. **Artifact Download**: Retrieve the build artifact from the Build stage
2. **Environment Variables**: Deploy environment-specific variables using `deploy-env-variables.sh`
3. **Database Migration**: Run database migrations using `db-migrate.sh`
4. **Application Deployment**: Deploy the application to the Development App Service
5. **Health Check**: Verify the application is running correctly

**Output**: Application deployed to the Development environment (https://taskify-dev.azurewebsites.net).

#### 3.2 Staging Environment Deployment

**Trigger**: Automatic when changes are pushed to the `main` branch and tests pass.

**Steps**:
1. **Artifact Download**: Retrieve the build artifact from the Build stage
2. **Environment Variables**: Deploy environment-specific variables using `deploy-env-variables.sh`
3. **Database Migration**: Run database migrations using `db-migrate.sh`
4. **Slot Deployment**: Deploy the application to the Staging slot of the Staging App Service
5. **Health Check**: Verify the application is running correctly in the Staging slot

**Output**: Application deployed to the Staging environment (https://taskify-staging.azurewebsites.net).

#### 3.3 Production Environment Deployment

**Trigger**: Manual approval after successful deployment to Staging.

**Steps**:
1. **Approval Gate**: Wait for manual approval from authorized team members
2. **Artifact Download**: Retrieve the build artifact from the Build stage
3. **Environment Variables**: Deploy environment-specific variables using `deploy-env-variables.sh`
4. **Database Migration**: Run database migrations using `db-migrate.sh`
5. **Slot Deployment**: Deploy the application to the Staging slot of the Production App Service
6. **Pre-Swap Validation**: Run automated tests against the Staging slot
7. **Slot Swap**: Execute `slot-swap.sh` to swap the Staging slot with Production
8. **Post-Swap Validation**: Verify the application is running correctly in Production

**Output**: Application deployed to the Production environment (https://taskify.com).

## Zero-Downtime Deployment Process

For Staging and Production environments, we use Azure App Service deployment slots to achieve zero-downtime deployments:

1. **Pre-Deployment**:
   - The application is running in the Production slot
   - Users are accessing the current version without interruption

2. **Deployment to Staging Slot**:
   - New version is deployed to the Staging slot
   - Database migrations are run (designed to be backward compatible)
   - Automated tests verify the new version works correctly

3. **Slot Swap**:
   - Traffic is gradually routed from Production to Staging slot
   - Once complete, the slots are swapped (Staging becomes Production)
   - The swap is atomic and happens without downtime

4. **Post-Deployment**:
   - Users are now accessing the new version
   - The old version is now in the Staging slot (enabling quick rollback if needed)

## Infrastructure Deployment

Infrastructure changes are managed separately using Bicep templates:

1. **Template Definition**: Infrastructure is defined as code in `azure-resources.bicep`
2. **Deployment Script**: The `deploy-infrastructure.sh` script is used to deploy infrastructure changes
3. **Environment-Specific Parameters**: Different parameters are used for each environment
4. **Resource Provisioning**: Azure resources (App Service, PostgreSQL, etc.) are created or updated
5. **Output Capture**: Resource information (URLs, connection strings) is captured for use in the application

## Monitoring and Rollback

### Monitoring:
- **Health Checks**: Automated health checks verify the application is functioning correctly
- **Application Insights**: Runtime performance and errors are monitored
- **Alert Rules**: Alerts are triggered when issues are detected

### Rollback Process:
1. **Slot Swap**: For immediate rollback, swap back to the previous version
2. **Redeployment**: For more complex issues, redeploy a previous successful build
3. **Database Rollback**: If necessary, run database rollback scripts

## Security Considerations

- **Secrets Management**: Sensitive information is stored in Azure Key Vault
- **Environment Isolation**: Each environment has its own resources and configuration
- **Access Control**: Production deployments require approval from authorized team members
- **Secure Connections**: All communications use HTTPS with TLS 1.2+ 