# Taskify

A subscription-based task manager web application that helps teams organize and track their work efficiently.

## Features

- User authentication and authorization
- Task creation, assignment, and tracking
- Project management with team collaboration
- Subscription management with Stripe integration
- Real-time notifications
- Reporting and analytics

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Payment Processing**: Stripe
- **Testing**: Jest, Supertest
- **CI/CD**: Azure DevOps Pipelines
- **Deployment**: Azure App Service

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (copy `.env.example` to `.env` and fill in the values)
4. Set up the database:
   ```
   npm run migrate
   npm run seed
   ```
5. Start the development server:
   ```
   npm run dev
   ```

## Testing

- Run all tests:
  ```
  npm test
  ```
- Run unit tests:
  ```
  npm run test:unit
  ```
- Run integration tests:
  ```
  npm run test:integration
  ```
- Run end-to-end tests:
  ```
  npm run test:e2e
  ```

## CI/CD Pipeline

This project uses Azure DevOps Pipelines for continuous integration and deployment:

1. **Build Stage**: Builds the application, runs linting and tests
2. **Test Stage**: Runs unit, integration, and end-to-end tests
3. **Deploy Stage**: Deploys to different environments (dev, staging, production)

The pipeline supports:
- Automatic deployments to development environment on commits to develop branch
- Manual approval for staging and production deployments
- Slot swapping for zero-downtime deployments
- Environment-specific configurations

## Environments

- **Development**: For ongoing development work
- **Staging**: For pre-production testing
- **Production**: Live environment for end users
