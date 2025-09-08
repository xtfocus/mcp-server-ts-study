import { NextRequest } from 'next/server';

// Store active SSE connections
const connections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[SSE] New client connection: ${clientId}`);
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this client
      connections.set(clientId, controller);
      console.log(`[SSE] Client ${clientId} connected. Total connections: ${connections.size}`);
      
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connection',
        clientId,
        timestamp: new Date().toISOString(),
        message: 'Connected to notification stream'
      });
      
      controller.enqueue(`data: ${data}\n\n`);
      console.log(`[SSE] Sent connection message to client ${clientId}`);
      
      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          });
          controller.enqueue(`data: ${heartbeatData}\n\n`);
          console.log(`[SSE] Sent heartbeat to client ${clientId}`);
        } catch (error) {
          console.log(`[SSE] Heartbeat failed for client ${clientId}, cleaning up:`, error);
          clearInterval(heartbeat);
          connections.delete(clientId);
        }
      }, 30000);
      
      // Clean up on close
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client ${clientId} disconnected (abort signal)`);
        clearInterval(heartbeat);
        connections.delete(clientId);
        console.log(`[SSE] Removed client ${clientId}. Remaining connections: ${connections.size}`);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
          console.log(`[SSE] Controller already closed for client ${clientId}`);
        }
      });
    },
    
    cancel() {
      console.log(`[SSE] Client ${clientId} disconnected (cancel)`);
      connections.delete(clientId);
      console.log(`[SSE] Removed client ${clientId}. Remaining connections: ${connections.size}`);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Function to broadcast notifications to all connected clients
export function broadcastNotification(notification: any) {
  console.log(`[SSE] Broadcasting notification to ${connections.size} clients:`, notification);
  
  const data = JSON.stringify({
    type: 'notification',
    data: notification,
    timestamp: new Date().toISOString()
  });
  
  const message = `data: ${data}\n\n`;
  
  // Send to all connected clients
  let successCount = 0;
  let errorCount = 0;
  
  for (const [clientId, controller] of connections) {
    try {
      controller.enqueue(message);
      successCount++;
    } catch (error) {
      // Remove dead connections
      console.log(`[SSE] Failed to send to client ${clientId}, removing:`, error);
      connections.delete(clientId);
      errorCount++;
    }
  }
  
  console.log(`[SSE] Broadcast complete: ${successCount} successful, ${errorCount} failed`);
}

// Function to send notification to specific client
export function sendToClient(clientId: string, notification: any) {
  console.log(`[SSE] Sending notification to client ${clientId}:`, notification);
  
  const controller = connections.get(clientId);
  if (controller) {
    try {
      const data = JSON.stringify({
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);
      console.log(`[SSE] Notification sent successfully to client ${clientId}`);
    } catch (error) {
      // Remove dead connection
      console.log(`[SSE] Failed to send to client ${clientId}, removing:`, error);
      connections.delete(clientId);
    }
  } else {
    console.log(`[SSE] Client ${clientId} not found`);
  }
}

// Function to get connection count
export function getConnectionCount(): number {
  return connections.size;
}

// Function to get all client IDs
export function getConnectedClients(): string[] {
  return Array.from(connections.keys());
}
