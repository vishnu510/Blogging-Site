// Server-Sent Events (SSE) manager for real-time live synchronization

let clients = [];

function sseHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const clientId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  const newClient = { id: clientId, res };
  clients.push(newClient);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  // Heartbeat every 25 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter(c => c.id !== clientId);
  });
}

function broadcast(eventType, data = {}) {
  const payload = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
  clients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch {
      // client connection might be closed
    }
  });
}

module.exports = {
  sseHandler,
  broadcast
};
