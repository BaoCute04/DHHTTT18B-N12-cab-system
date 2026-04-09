import { z } from "zod";

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().datetime({ offset: true });
const moneyIntegerSchema = z.number().int().nonnegative();
const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(3).max(250).optional()
});

export const httpSchemas = {
  login: z
    .object({
      identifier: z.string().min(3).max(255),
      password: z.string().min(8).max(255),
      clientType: z.enum(["customer-app", "driver-app", "admin-dashboard"]).optional()
    })
    .strict(),
  refresh: z
    .object({
      refreshToken: z.string().min(10).max(2048)
    })
    .strict(),
  bookingCreate: z
    .object({
      customerId: uuidSchema,
      pickup: coordinatesSchema,
      dropoff: coordinatesSchema,
      requestedAt: isoDateSchema,
      estimatedFare: moneyIntegerSchema
    })
    .strict(),
  paymentCreate: z
    .object({
      bookingId: uuidSchema,
      amount: moneyIntegerSchema,
      currency: z.string().regex(/^[A-Z]{3}$/),
      paymentMethod: z.enum(["cash", "card", "wallet"])
    })
    .strict()
};

export const websocketSchemas = {
  driverLocationUpdate: z
    .object({
      type: z.literal("driver.location.update"),
      payload: z
        .object({
          rideId: uuidSchema,
          driverId: uuidSchema,
          rideStatus: z.string().min(1),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          recordedAt: isoDateSchema
        })
        .strict()
    })
    .strict()
};
