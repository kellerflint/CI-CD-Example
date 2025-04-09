@description('The environment name (development, staging, production)')
param environmentName string = 'development'

@description('The location for all resources')
param location string = resourceGroup().location

@description('The name of the app service')
param appServiceName string = 'taskify-${environmentName}'

@description('The name of the app service plan')
param appServicePlanName string = 'taskify-plan-${environmentName}'

@description('The name of the PostgreSQL server')
param postgresServerName string = 'taskify-db-${environmentName}'

@description('The administrator username for PostgreSQL')
param postgresAdminUsername string = 'taskify_admin'

@description('The administrator password for PostgreSQL')
@secure()
param postgresAdminPassword string

@description('The name of the database')
param databaseName string = 'taskify'

@description('The SKU name for the app service plan')
param appServicePlanSku object = {
  name: environmentName == 'production' ? 'P1v2' : 'B1'
  tier: environmentName == 'production' ? 'PremiumV2' : 'Basic'
  size: environmentName == 'production' ? 'P1v2' : 'B1'
  family: environmentName == 'production' ? 'Pv2' : 'B'
  capacity: 1
}

@description('The SKU name for PostgreSQL')
param postgresSku object = {
  name: environmentName == 'production' ? 'GP_Gen5_2' : 'B_Gen5_1'
  tier: environmentName == 'production' ? 'GeneralPurpose' : 'Basic'
  family: 'Gen5'
  capacity: environmentName == 'production' ? 2 : 1
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: appServicePlanSku
  location: location
  sku: {
    name: appServicePlanSku.name
    tier: appServicePlanSku.tier
    size: appServicePlanSku.size
    family: appServicePlanSku.family
    capacity: appServicePlanSku.capacity
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// App Service
resource appService 'Microsoft.Web/sites@2021-02-01' = {
  name: appServiceName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
      alwaysOn: environmentName == 'production' ? true : false
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'NODE_ENV'
          value: environmentName
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'DB_HOST'
          value: '${postgresServer.name}.postgres.database.azure.com'
        }
        {
          name: 'DB_PORT'
          value: '5432'
        }
        {
          name: 'DB_NAME'
          value: databaseName
        }
        {
          name: 'DB_USER'
          value: '${postgresAdminUsername}@${postgresServer.name}'
        }
        {
          name: 'DB_PASSWORD'
          value: postgresAdminPassword
        }
      ]
    }
    httpsOnly: true
  }
}

// Production slot for staging/production environments
resource stagingSlot 'Microsoft.Web/sites/slots@2021-02-01' = if (environmentName == 'staging' || environmentName == 'production') {
  parent: appService
  name: 'staging'
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts'
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'NODE_ENV'
          value: environmentName
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'DB_HOST'
          value: '${postgresServer.name}.postgres.database.azure.com'
        }
        {
          name: 'DB_PORT'
          value: '5432'
        }
        {
          name: 'DB_NAME'
          value: databaseName
        }
        {
          name: 'DB_USER'
          value: '${postgresAdminUsername}@${postgresServer.name}'
        }
        {
          name: 'DB_PASSWORD'
          value: postgresAdminPassword
        }
      ]
    }
    httpsOnly: true
  }
}

// PostgreSQL Server
resource postgresServer 'Microsoft.DBforPostgreSQL/servers@2017-12-01' = {
  name: postgresServerName
  location: location
  sku: {
    name: postgresSku.name
    tier: postgresSku.tier
    family: postgresSku.family
    capacity: postgresSku.capacity
  }
  properties: {
    version: '11'
    administratorLogin: postgresAdminUsername
    administratorLoginPassword: postgresAdminPassword
    sslEnforcement: 'Enabled'
    minimalTlsVersion: 'TLS1_2'
    storageProfile: {
      storageMB: environmentName == 'production' ? 51200 : 5120
      backupRetentionDays: environmentName == 'production' ? 35 : 7
      geoRedundantBackup: environmentName == 'production' ? 'Enabled' : 'Disabled'
    }
  }
}

// PostgreSQL Database
resource database 'Microsoft.DBforPostgreSQL/servers/databases@2017-12-01' = {
  parent: postgresServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.UTF8'
  }
}

// Allow Azure services to access PostgreSQL
resource allowAzureServices 'Microsoft.DBforPostgreSQL/servers/firewallRules@2017-12-01' = {
  parent: postgresServer
  name: 'AllowAllAzureIPs'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Outputs
output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output databaseServer string = postgresServer.name
output databaseName string = database.name 