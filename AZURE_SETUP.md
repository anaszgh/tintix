# Azure PostgreSQL & Azure Deployment Setup

## Overview
This guide will help you set up your TINTIX Film System with Azure PostgreSQL database and deploy it to Azure.

## 1. Azure PostgreSQL Database Setup

### Step 1: Create Azure PostgreSQL Database
1. Go to Azure Portal: https://portal.azure.com
2. Click "Create a resource"
3. Search for "Azure Database for PostgreSQL"
4. Select "Azure Database for PostgreSQL - Flexible Server"
5. Click "Create"

### Step 2: Configure Database
- **Server name**: `tintix-film-db` (or your preferred name)
- **Admin username**: `postgres` (or your preferred username)
- **Password**: Create a strong password
- **Region**: Choose the same region as your app deployment
- **Compute + storage**: Start with Basic tier (B_Standard_B1ms)
- **High availability**: Disabled (for cost savings)

### Step 3: Network Configuration
- **Connectivity method**: Public access
- **Firewall rules**: Add your IP address for development
- **SSL mode**: Require SSL connection

### Step 4: Get Connection String
After creation, go to your database resource:
1. Click "Connection strings"
2. Copy the connection string
3. Replace `<password>` with your actual password

## 2. Environment Configuration

### Local Development (.env file)
```env
# Database Configuration (Azure PostgreSQL)
DATABASE_URL=postgresql://postgres:your_password@tintix-film-db.postgres.database.azure.com:5432/tintix_film_system?sslmode=require

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Environment
NODE_ENV=development
```

### Azure App Service Configuration
In Azure App Service, add these Application Settings:
- `DATABASE_URL`: Your Azure PostgreSQL connection string
- `SESSION_SECRET`: A strong random string
- `NODE_ENV`: `production`

## 3. Database Migration

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Migration
```bash
# Generate migration files
npx drizzle-kit generate

# Apply migrations to Azure PostgreSQL
npx drizzle-kit push
```

### Step 3: Verify Migration
The following tables should be created:
- `users`
- `films`
- `film_inventory`
- `inventory_transactions`
- `job_entries`
- `job_dimensions`
- `job_installers`
- `redo_entries`
- `installer_time_entries`
- `sessions`

## 4. Azure App Service Deployment

### Step 1: Create Azure App Service
1. Go to Azure Portal
2. Click "Create a resource"
3. Search for "App Service"
4. Click "Create"

### Step 2: Configure App Service
- **App name**: `tintix-film-app` (or your preferred name)
- **Publish**: Code
- **Runtime stack**: Node.js 18 LTS
- **Operating System**: Linux
- **Region**: Same as your database
- **App Service Plan**: Basic B1 (or higher for production)

### Step 3: Configure Application Settings
In your App Service, go to Configuration > Application settings and add:
```
DATABASE_URL = postgresql://postgres:your_password@tintix-film-db.postgres.database.azure.com:5432/tintix_film_system?sslmode=require
SESSION_SECRET = your-production-session-secret
NODE_ENV = production
```

### Step 4: Configure Build Settings
In your App Service, go to Configuration > General settings:
- **Startup Command**: `npm start`

### Step 5: Configure Networking
1. Go to Networking in your App Service
2. Add your Azure PostgreSQL database to the VNet integration
3. Configure firewall rules to allow App Service to connect to PostgreSQL

## 5. Deployment Methods

### Option A: Azure CLI Deployment
```bash
# Install Azure CLI
# Login to Azure
az login

# Deploy to App Service
az webapp up --name tintix-film-app --resource-group your-resource-group --runtime "NODE|18-lts"
```

### Option B: GitHub Actions (Recommended)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Azure
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build application
      run: npm run build
      
    - name: Deploy to Azure
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'tintix-film-app'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

### Option C: VS Code Extension
1. Install "Azure App Service" extension
2. Right-click on your project
3. Select "Deploy to Web App"

## 6. Security Considerations

### Database Security
- Use Azure Key Vault to store database credentials
- Enable Azure AD authentication for PostgreSQL
- Configure firewall rules properly
- Use SSL connections

### Application Security
- Use strong session secrets
- Enable HTTPS only
- Configure CORS properly
- Use environment variables for sensitive data

## 7. Monitoring & Scaling

### Application Insights
1. Enable Application Insights in your App Service
2. Monitor performance and errors
3. Set up alerts for critical issues

### Scaling
- **Vertical scaling**: Increase App Service Plan tier
- **Horizontal scaling**: Enable auto-scaling rules
- **Database scaling**: Upgrade PostgreSQL tier as needed

## 8. Troubleshooting

### Common Issues
1. **Connection refused**: Check firewall rules and SSL settings
2. **Migration errors**: Verify database permissions
3. **Build failures**: Check Node.js version compatibility
4. **Runtime errors**: Check application logs in Azure Portal

### Useful Commands
```bash
# Check database connection
npx drizzle-kit studio

# View application logs
az webapp log tail --name tintix-film-app --resource-group your-resource-group

# Restart application
az webapp restart --name tintix-film-app --resource-group your-resource-group
```

## 9. Cost Optimization

### Development
- Use Basic tier for PostgreSQL (B_Standard_B1ms)
- Use Basic tier for App Service (B1)
- Stop resources when not in use

### Production
- Use Standard or Premium tiers for better performance
- Enable auto-scaling for cost efficiency
- Monitor usage and optimize accordingly

## 10. Next Steps

1. Set up your Azure PostgreSQL database
2. Update your `.env` file with the connection string
3. Run the database migrations
4. Deploy to Azure App Service
5. Configure monitoring and alerts
6. Set up CI/CD pipeline for automated deployments 