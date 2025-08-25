import { NextRequest, NextResponse } from 'next/server';
import { clients } from '@/lib/oauth-storage';

export async function GET(request: NextRequest) {
  const clientList = Array.from(clients.entries()).map(([clientId, client]) => ({
    clientId,
    clientName: client.client_name,
    redirectUris: client.redirect_uris,
    createdAt: client.client_id_issued_at
  }));

  return NextResponse.json({
    totalClients: clients.size,
    clients: clientList
  });
}
