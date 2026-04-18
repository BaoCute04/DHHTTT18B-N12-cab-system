/**
 * WebSocket Handler
 * Manages real-time GPS tracking and ride updates
 */

const WebSocket = require('ws');
const rideService = require('../services/ride.service');
const locationService = require('../services/location.service');

/**
 * Set up WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  // Track driver connections
  const driverConnections = new Map();
  // Track ride subscriptions
  const rideSubscriptions = new Map();

  wss.on('connection', (ws) => {
    console.log('[WebSocket] New client connected');
    let driverId = null;
    let subscribedRides = new Set();

    /**
     * Send message to specific client
     */
    function sendToClient(message) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }

    /**
     * Broadcast message to all clients
     */
    function broadcastMessage(message) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }

    /**
     * Broadcast to ride subscribers
     */
    function broadcastToRideSubscribers(rideId, message) {
      if (rideSubscriptions.has(rideId)) {
        rideSubscriptions.get(rideId).forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      }
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'driver_register':
            handleDriverRegister(data);
            break;

          case 'driver_location':
            handleDriverLocation(data).catch((error) => {
              console.error('[WebSocket] Error updating location:', error);
              sendToClient({
                type: 'error',
                error: error.message,
              });
            });
            break;

          case 'ride_subscribe':
            handleRideSubscribe(data).catch((error) => {
              console.error('[WebSocket] Error subscribing to ride:', error);
              sendToClient({
                type: 'error',
                error: error.message,
              });
            });
            break;

          case 'ride_unsubscribe':
            handleRideUnsubscribe(data);
            break;

          default:
            console.warn('[WebSocket] Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
        sendToClient({
          type: 'error',
          error: 'Failed to process message',
        });
      }
    });

    /**
     * Handle driver registration
     */
    function handleDriverRegister(data) {
      const { driverId: newDriverId } = data;

      if (!newDriverId) {
        sendToClient({
          type: 'error',
          error: 'driverId is required',
        });
        return;
      }

      driverId = newDriverId;
      driverConnections.set(driverId, ws);
      ws.driverId = driverId;

      console.log(`[WebSocket] Driver ${driverId} registered`);

      sendToClient({
        type: 'driver_registered',
        driverId,
        timestamp: new Date().toISOString(),
      });
    }

    /**
     * Handle driver location update
     */
    async function handleDriverLocation(data) {
      const { rideId, currentLocation } = data;

      if (!driverId) {
        sendToClient({
          type: 'error',
          error: 'Driver not registered. Send driver_register first.',
        });
        return;
      }

      if (!rideId || !currentLocation) {
        sendToClient({
          type: 'error',
          error: 'rideId and currentLocation are required',
        });
        return;
      }

      try {
        // Get the ride
        const ride = await rideService.getRideById(rideId);
        if (!ride) {
          sendToClient({
            type: 'error',
            error: 'Ride not found',
          });
          return;
        }

        // Verify driver
        if (ride.driverId !== driverId) {
          sendToClient({
            type: 'error',
            error: 'Unauthorized: Driver does not match ride',
          });
          return;
        }

        // Update location
        const updatedRide = await rideService.updateRideLocation(
          rideId,
          driverId,
          currentLocation
        );

        // Broadcast update to all subscribed clients
        broadcastToRideSubscribers(rideId, {
          type: 'ride_update',
          rideId,
          data: updatedRide.toJSON(),
        });

        console.log(
          `[WebSocket] Location updated for ride ${rideId}: ${currentLocation.lat}, ${currentLocation.lng}`
        );
      } catch (error) {
        console.error('[WebSocket] Error updating location:', error);
        sendToClient({
          type: 'error',
          error: error.message,
        });
      }
    }

    /**
     * Handle ride subscription
     */
    async function handleRideSubscribe(data) {
      const { rideId } = data;

      if (!rideId) {
        sendToClient({
          type: 'error',
          error: 'rideId is required',
        });
        return;
      }

      // Check ride exists
      const ride = await rideService.getRideById(rideId);
      if (!ride) {
        sendToClient({
          type: 'error',
          error: 'Ride not found',
        });
        return;
      }

      // Add to subscriptions
      if (!rideSubscriptions.has(rideId)) {
        rideSubscriptions.set(rideId, new Set());
      }
      rideSubscriptions.get(rideId).add(ws);
      subscribedRides.add(rideId);

      console.log(`[WebSocket] Client subscribed to ride ${rideId}`);

      // Send current ride state
      sendToClient({
        type: 'ride_subscribed',
        rideId,
        data: ride.toJSON(),
      });
    }

    /**
     * Handle ride unsubscription
     */
    function handleRideUnsubscribe(data) {
      const { rideId } = data;

      if (rideSubscriptions.has(rideId)) {
        rideSubscriptions.get(rideId).delete(ws);
      }
      subscribedRides.delete(rideId);

      console.log(`[WebSocket] Client unsubscribed from ride ${rideId}`);

      sendToClient({
        type: 'ride_unsubscribed',
        rideId,
      });
    }

    ws.on('close', () => {
      // Clean up driver connection
      if (driverId) {
        driverConnections.delete(driverId);
        locationService.clearDriverLocation(driverId);
        console.log(`[WebSocket] Driver ${driverId} disconnected`);
      }

      // Clean up ride subscriptions
      subscribedRides.forEach((rideId) => {
        if (rideSubscriptions.has(rideId)) {
          rideSubscriptions.get(rideId).delete(ws);
        }
      });

      console.log('[WebSocket] Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error.message);
    });
  });

  return {
    wss,
    driverConnections,
    rideSubscriptions,
  };
}

/**
 * Broadcast ride update to subscribed clients
 */
function broadcastRideUpdate(wss, rideId, rideData) {
  const message = JSON.stringify({
    type: 'ride_update',
    rideId,
    data: rideData,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

module.exports = {
  setupWebSocket,
  broadcastRideUpdate,
};
