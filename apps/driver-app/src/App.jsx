import { useEffect, useState } from "react";

const gatewayUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const socketUrl = (import.meta.env.VITE_WS_BASE_URL || "ws://localhost:3000").replace(/^http/, "ws");

export function App() {
  const [serviceArchitecture, setServiceArchitecture] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetch(`${gatewayUrl}/api/v1/drivers`)
      .then((response) => response.json())
      .then(setServiceArchitecture);
  }, []);

  useEffect(() => {
    const socket = new WebSocket(`${socketUrl}/realtime?client=driver-app`);
    socket.onmessage = (event) => {
      setMessages((current) => [event.data, ...current].slice(0, 5));
    };

    return () => socket.close();
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Driver App</h1>
      <p>Connection type: {"HTTPS / WebSocket -> API Gateway"}</p>
      <pre>{JSON.stringify(serviceArchitecture, null, 2)}</pre>
      <pre>{messages.join("\n")}</pre>
    </main>
  );
}
