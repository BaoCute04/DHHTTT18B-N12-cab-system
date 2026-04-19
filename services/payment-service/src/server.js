export function startServer(app, env) {
  return app.listen(env.port, () => {
    console.log(`[payment-service] listening on port ${env.port}`);
  });
}
