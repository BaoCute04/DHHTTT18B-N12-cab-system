import { isStandaloneMode } from "@/config/runtime.js";
import { env } from "@/config/env.js";

const realtimeBaseUrl = env.wsBaseUrl;

export function createRealtimeConnection({ client, token, onOpen, onMessage, onError, onClose }) {
  if (isStandaloneMode) {
    const mockSocket = {
      readyState: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    queueMicrotask(() => {
      onOpen?.({ mock: true, type: "open" });
    });

    return {
      send(data) {
        onMessage?.(
          {
            data: typeof data === "string" ? data : JSON.stringify(data),
          },
          { mock: true, type: "message" }
        );
      },
      close() {
        onClose?.({ mock: true, type: "close" });
      },
      socket: {
        ...mockSocket,
        addEventListener: (type, listener) => {
          if (type === "message") {
            setTimeout(() => {
              listener({
                data: JSON.stringify({
                  type: "ride.assigned",
                  payload: {
                    rideId: "ride-mock-999",
                    bookingId: "ride-mock-999",
                    driverId: "driver-123",
                    userId: "customer-456",
                    status: "WAITING_FOR_ACCEPTANCE",
                    pickup: { lat: 10.7769, lng: 106.7009, address: "123 Le Loi, Quan 1" },
                    destination: { lat: 10.7821, lng: 106.6953, address: "Vincom Dong Khoi, Quan 1" },
                    priceSnapshot: { amount: 45000 },
                    etaMinutes: 8,
                    eventType: "RideAssigned",
                  },
                }),
              });
            }, 5000);
          }
        },
      },
    };
  }

  const url = new URL("/realtime", realtimeBaseUrl);
  url.searchParams.set("client", client);

  if (token) {
    url.searchParams.set("token", token);
  }

  const socket = new WebSocket(url.toString());

  socket.onopen = onOpen || null;
  socket.onerror = onError || null;
  socket.onclose = onClose || null;
  socket.onmessage = (event) => {
    onMessage?.(event.data, event);
  };

  return {
    send(data) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(typeof data === "string" ? data : JSON.stringify(data));
      }
    },
    close() {
      socket.close();
    },
    socket,
  };
}
