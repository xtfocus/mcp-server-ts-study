# Production Deployment Considerations

This document outlines the requirements and considerations for deploying the MCP server to Vercel for production use.

## Current State Analysis

### **Development vs Production Differences**

| Aspect | Development | Production |
|--------|-------------|------------|
| **Storage** | File-based (`.oauth-storage.json`) | Database required |
| **Environment** | Local development server | Vercel serverless functions |
| **HTTPS** | HTTP (localhost) | HTTPS required |
| **Domain** | `localhost:3000` | Custom domain |
| **Scaling** | Single instance | Multiple serverless functions |
| **Monitoring** | Console logs | Application monitoring |

## Required Changes for Production

### 1. **Database Storage Implementation**

#### **Current File-based Storage**
```typescript
// lib/oauth-storage.ts (Current)
const STORAGE_FILE = join(process.cwd(), '.oauth-storage.json');
```

#### **Production Database Requirements**
- **Database Type**: PostgreSQL, MongoDB, or similar
- **Connection Pooling**: Handle serverless function limits
- **Encryption**: Encrypt sensitive data at rest
- **Backup Strategy**: Regular automated backups

#### **Recommended Implementation**
```typescript
// lib/oauth-storage.ts (Production)
import { Pool } from 'pg'; // PostgreSQL example

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Limit connections for serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function storeClient(clientId: string, clientData: any) {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO oauth_clients (client_id, client_data, created_at) VALUES ($1, $2, $3)',
      [clientId, JSON.stringify(clientData), new Date()]
    );
  } finally {
    client.release();
  }
}
```

### 2. **Environment Variables**

#### **Required Environment Variables**
```bash
# OAuth Configuration
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# Security
JWT_SECRET=your_jwt_secret_for_token_signing
ENCRYPTION_KEY=your_encryption_key_for_sensitive_data

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn_for_error_tracking
```

#### **Vercel Environment Setup**
```bash
# Set environment variables in Vercel dashboard
vercel env add GITHUB_CLIENT_ID
vercel env add GITHUB_CLIENT_SECRET
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add ENCRYPTION_KEY
```

### 3. **GitHub OAuth App Configuration**

#### **Production OAuth App Settings**
```
Application name: Your MCP Server
Homepage URL: https://your-domain.com
Authorization callback URL: https://your-domain.com/api/oauth/callback
```

#### **Required Changes**
- Update callback URL from `localhost:3000` to production domain
- Ensure HTTPS is used for all URLs
- Consider creating a separate OAuth App for production

### 4. **HTTPS and Security**

#### **SSL/TLS Requirements**
- **Vercel**: Automatically provides SSL certificates
- **Custom Domain**: Configure SSL in Vercel dashboard
- **HSTS**: Enable HTTP Strict Transport Security

#### **Security Headers**
```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  }
};
```

### 5. **Database Schema**

#### **Required Tables**
```sql
-- OAuth Clients
CREATE TABLE oauth_clients (
  client_id VARCHAR(255) PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  client_secret VARCHAR(255) NOT NULL,
  redirect_uris JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Authorization Codes
CREATE TABLE oauth_auth_codes (
  code VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  scope TEXT NOT NULL,
  state TEXT,
  code_challenge VARCHAR(255),
  code_challenge_method VARCHAR(10),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id)
);

-- Access Tokens
CREATE TABLE oauth_access_tokens (
  token VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  scope TEXT NOT NULL,
  user_data JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id)
);

-- Indexes for Performance
CREATE INDEX idx_auth_codes_client_id ON oauth_auth_codes(client_id);
CREATE INDEX idx_auth_codes_expires_at ON oauth_auth_codes(expires_at);
CREATE INDEX idx_access_tokens_client_id ON oauth_access_tokens(client_id);
CREATE INDEX idx_access_tokens_expires_at ON oauth_access_tokens(expires_at);
```

### 6. **Error Handling and Monitoring**

#### **Sentry Integration**
```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

export function captureOAuthError(error: Error, context: any) {
  Sentry.captureException(error, {
    tags: { component: 'oauth' },
    extra: context
  });
}
```

#### **Structured Logging**
```typescript
// lib/logger.ts
export function logOAuthEvent(event: string, data: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    data,
    environment: process.env.NODE_ENV
  }));
}
```

### 7. **Performance Optimization**

#### **Database Connection Pooling**
```typescript
// lib/database.ts
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDatabasePool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // Limit for serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}
```

#### **Caching Strategy**
```typescript
// lib/cache.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cacheToken(token: string, data: any, ttl: number) {
  await redis.setex(`token:${token}`, ttl, JSON.stringify(data));
}

export async function getCachedToken(token: string) {
  const data = await redis.get(`token:${token}`);
  return data ? JSON.parse(data) : null;
}
```

### 8. **Rate Limiting**

#### **API Rate Limiting**
```typescript
// lib/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const oauthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many OAuth requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 9. **Backup and Recovery**

#### **Database Backup Strategy**
- **Automated Backups**: Daily automated backups
- **Point-in-time Recovery**: Enable WAL archiving
- **Cross-region Replication**: For disaster recovery
- **Backup Testing**: Regular restore testing

#### **OAuth State Recovery**
```typescript
// lib/backup.ts
export async function exportOAuthState() {
  const clients = await getAllClients();
  const tokens = await getAllAccessTokens();
  
  return {
    timestamp: new Date().toISOString(),
    clients,
    tokens: tokens.map(t => ({ 
      token: t.token.substring(0, 8) + '...', // Mask full token
      clientId: t.clientId,
      expiresAt: t.expiresAt 
    }))
  };
}
```

## Deployment Checklist

### **Pre-deployment Tasks**
- [ ] Set up production database
- [ ] Configure environment variables in Vercel
- [ ] Update GitHub OAuth App callback URL
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure custom domain and SSL
- [ ] Set up database backups
- [ ] Test OAuth flow in staging environment

### **Deployment Steps**
```bash
# 1. Build and deploy to Vercel
vercel --prod

# 2. Verify environment variables
vercel env ls

# 3. Test OAuth flow
curl -X POST https://your-domain.com/api/oauth/register

# 4. Test MCP connection
npx @modelcontextprotocol/inspector@latest
# Connect to: https://your-domain.com/mcp
```

### **Post-deployment Verification**
- [ ] OAuth client registration works
- [ ] GitHub OAuth flow completes successfully
- [ ] MCP tools are accessible
- [ ] Token validation works correctly
- [ ] Error monitoring is active
- [ ] Database connections are stable
- [ ] Performance metrics are acceptable

## Scaling Considerations

### **Serverless Function Limits**
- **Execution Time**: 10 seconds (Hobby), 60 seconds (Pro)
- **Memory**: 1024 MB (Hobby), 3008 MB (Pro)
- **Concurrent Executions**: 1000 (Hobby), 10000 (Pro)

### **Database Scaling**
- **Connection Pooling**: Essential for serverless
- **Read Replicas**: For high read loads
- **Sharding**: For very high traffic
- **Caching**: Redis for frequently accessed data

### **CDN and Edge Functions**
- **Static Assets**: Serve via CDN
- **Edge Functions**: For global performance
- **Caching**: Cache OAuth metadata endpoints

## Security Considerations

### **Data Protection**
- **Encryption at Rest**: Encrypt sensitive database fields
- **Encryption in Transit**: HTTPS for all communications
- **Token Security**: Secure token generation and storage
- **Access Control**: Limit database access

### **OAuth Security**
- **Client Validation**: Strict client credential validation
- **Scope Enforcement**: Always use minimal scopes
- **Token Expiration**: Short-lived tokens with refresh
- **CSRF Protection**: State parameter validation

### **Monitoring and Alerting**
- **Security Events**: Monitor for suspicious activity
- **Rate Limiting**: Alert on abuse attempts
- **Error Tracking**: Monitor OAuth errors
- **Performance**: Track response times

## Cost Considerations

### **Vercel Pricing**
- **Hobby**: $0/month (limited features)
- **Pro**: $20/month (production features)
- **Enterprise**: Custom pricing

### **Database Costs**
- **PostgreSQL**: $5-50/month depending on size
- **MongoDB Atlas**: $9-57/month depending on tier
- **Backup Storage**: Additional cost for backups

### **Monitoring Costs**
- **Sentry**: $26/month for team plan
- **Vercel Analytics**: Included with Pro plan
- **Custom Monitoring**: Additional costs

## Maintenance and Updates

### **Regular Maintenance**
- **Security Updates**: Keep dependencies updated
- **Database Maintenance**: Regular vacuum and analyze
- **Token Cleanup**: Remove expired tokens
- **Log Rotation**: Manage log storage

### **Monitoring and Alerts**
- **Uptime Monitoring**: Track service availability
- **Error Rate Monitoring**: Alert on high error rates
- **Performance Monitoring**: Track response times
- **Security Monitoring**: Monitor for security events

## Conclusion

Deploying the MCP server to production requires careful consideration of storage, security, monitoring, and scaling requirements. The key is to replace the development file-based storage with a production-ready database while maintaining the same OAuth proxy pattern and security features.

The modular design of the current implementation makes it relatively straightforward to swap out the storage layer and add production monitoring, while the OAuth proxy pattern provides the flexibility needed for production deployment.
