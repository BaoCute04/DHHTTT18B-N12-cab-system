import { useEffect, useState } from "react";

const gatewayUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export function App() {
  const [gatewayHealth, setGatewayHealth] = useState(null);
  const [architecture, setArchitecture] = useState(null);

  useEffect(() => {
    fetch(`${gatewayUrl}/health`).then((response) => response.json()).then(setGatewayHealth);
    fetch(`${gatewayUrl}/architecture`).then((response) => response.json()).then(setArchitecture);
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>Admin Dashboard</h1>
      <p>Connection type: {"HTTPS -> API Gateway"}</p>
      <p>Gateway URL: {gatewayUrl}</p>
      <pre>{JSON.stringify(gatewayHealth, null, 2)}</pre>
      <pre>{JSON.stringify(architecture?.gateway, null, 2)}</pre>
    </main>
  );
}
