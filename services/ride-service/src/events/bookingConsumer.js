const { Kafka } = require('kafkajs');
const rideService = require('../services/ride.service');

let consumer;

async function startBookingConsumer(env) {
  if (!env.kafkaEnabled || env.kafkaBrokers.length === 0) {
    console.log('[ride-service] Kafka disabled for booking consumer');
    return;
  }

  const kafka = new Kafka({ clientId: `${env.kafkaClientId}-booking`, brokers: env.kafkaBrokers });
  consumer = kafka.consumer({ groupId: `${env.kafkaGroupId}-booking` });
  
  await consumer.connect();
  await consumer.subscribe({ topic: 'ride.created', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString());
        
        console.log(`[ride-service] Received RideCreated event for Booking: ${payload.bookingId}`);
        
        // Create the Ride aggregate from the event data
        await rideService.createRide({
          rideId: payload.rideId,
          bookingId: payload.bookingId,
          userId: payload.userId,
          pickup: payload.pickup,
          destination: payload.drop || payload.destination,
          priceSnapshot: payload.priceSnapshot,
          quoteId: payload.quoteId,
          paymentMethod: payload.paymentMethod,
          status: 'SEARCHING' // Initial state after booking
        });
        
        console.log(`[ride-service] Successfully bootstrapped Ride for Booking: ${payload.bookingId}`);
      } catch (error) {
        console.error('[ride-service] Error processing RideCreated event:', error.message);
      }
    }
  });
}

async function stopBookingConsumer() {
  if (consumer) {
    await consumer.disconnect();
  }
}

module.exports = {
  startBookingConsumer,
  stopBookingConsumer
};
