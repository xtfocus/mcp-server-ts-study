import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// File-based storage for development (in production, use a database)
const STORAGE_FILE = join(process.cwd(), '.oauth-storage.json');

// In-memory storage for OAuth data (in production, use a database)
export const clients = new Map<string, any>();
const authCodes = new Map<string, any>();
const accessTokens = new Map<string, any>();

// Load data from file on startup
function loadStorage() {
  try {
    if (existsSync(STORAGE_FILE)) {
      const data = JSON.parse(readFileSync(STORAGE_FILE, 'utf8'));
      
      // Load clients
      if (data.clients) {
        Object.entries(data.clients).forEach(([clientId, clientData]) => {
          clients.set(clientId, clientData);
        });
      }
      
      // Load authorization codes
      if (data.authCodes) {
        Object.entries(data.authCodes).forEach(([code, authCodeData]) => {
          authCodes.set(code, authCodeData);
        });
      }
      
      // Load access tokens
      if (data.accessTokens) {
        Object.entries(data.accessTokens).forEach(([token, tokenData]) => {
          accessTokens.set(token, tokenData);
        });
      }
      
      console.log(`Loaded ${clients.size} clients, ${authCodes.size} auth codes, ${accessTokens.size} access tokens from storage`);
    }
  } catch (error) {
    console.warn('Failed to load OAuth storage:', error);
  }
}

// Save data to file
function saveStorage() {
  try {
    const data = {
      clients: Object.fromEntries(clients),
      authCodes: Object.fromEntries(authCodes),
      accessTokens: Object.fromEntries(accessTokens),
      timestamp: Date.now()
    };
    writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('Failed to save OAuth storage:', error);
  }
}

// Load storage on module initialization
loadStorage();

export function storeAuthCode(code: string, data: any) {
  authCodes.set(code, data);
  saveStorage();
}

export function getAuthCode(code: string): any {
  return authCodes.get(code);
}

export function deleteAuthCode(code: string) {
  authCodes.delete(code);
  saveStorage();
}

export function storeAccessToken(token: string, data: any) {
  accessTokens.set(token, data);
  saveStorage();
}

export function getAccessToken(token: string): any {
  return accessTokens.get(token);
}

export function deleteAccessToken(token: string) {
  accessTokens.delete(token);
  saveStorage();
}

// Client management functions
export function storeClient(clientId: string, clientData: any) {
  console.log('Storing client:', clientId, clientData.client_name);
  clients.set(clientId, clientData);
  saveStorage();
}

export function getClient(clientId: string): any {
  const client = clients.get(clientId);
  console.log('Getting client:', clientId, client ? 'found' : 'not found');
  return client;
}

export function validateClient(clientId: string, clientSecret?: string): any {
  console.log('Validating client:', clientId, 'with secret:', clientSecret ? 'provided' : 'not provided');
  const client = clients.get(clientId);
  console.log('Client lookup result:', client ? 'found' : 'not found');
  if (!client) return null;
  if (clientSecret && client.client_secret !== clientSecret) {
    console.log('Client secret mismatch');
    return null;
  }
  console.log('Client validation successful');
  return client;
}
