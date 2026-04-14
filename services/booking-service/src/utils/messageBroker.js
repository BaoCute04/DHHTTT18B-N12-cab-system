class MessageBroker {
  async connect() { console.log('[Message Broker] Đã kết nối ảo (Mock)'); }
  async publish(topic, message) { console.log(`[Message Broker] Phát sự kiện tới [${topic}]:`, JSON.stringify(message)); }
}
export default new MessageBroker();