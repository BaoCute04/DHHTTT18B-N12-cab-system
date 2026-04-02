import { useEffect, useState } from "react";

const gatewayUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const socketUrl = (import.meta.env.VITE_WS_BASE_URL || "ws://localhost:3000").replace(/^http/, "ws");

export function App() {
  const [gatewayHealth, setGatewayHealth] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetch(`${gatewayUrl}/health`).then((response) => response.json()).then(setGatewayHealth);
  }, []);

  useEffect(() => {
    const socket = new WebSocket(`${socketUrl}/realtime?client=customer-app`);
    socket.onmessage = (event) => {
      setMessages((current) => [event.data, ...current].slice(0, 5));
    };

    return () => socket.close();
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Customer App</h1>
      <p>Connection type: {"HTTPS / WebSocket -> API Gateway"}</p>
      <p>Gateway URL: {gatewayUrl}</p>
      <pre>{JSON.stringify(gatewayHealth, null, 2)}</pre>
      <pre>{messages.join("\n")}</pre>
    </main>
  );
}
