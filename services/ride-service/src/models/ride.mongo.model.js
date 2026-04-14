const { Schema, model } = require('mongoose');

const RideStatus = {
  SEARCHING: 'SEARCHING',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  DRIVER_ARRIVING: 'DRIVER_ARRIVING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const coordinateSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: '' },
  },
  { _id: false }
);

const rideSchema = new Schema(
  {
    rideId: { type: String, required: true, unique: true, index: true },
    bookingId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    driverId: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: Object.values(RideStatus),
      default: RideStatus.SEARCHING,
      index: true,
    },
    pickup: { type: coordinateSchema, required: true },
    destination: { type: coordinateSchema, required: true },
    currentLocation: { type: coordinateSchema, default: null },
    etaMinutes: { type: Number, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    versionKey: false,
  }
);

rideSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

const RideMongoModel = model('Ride', rideSchema);

module.exports = {
  RideMongoModel,
  RideStatus,
  rideSchema,
};