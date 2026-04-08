import express from "express";
import {
  getAvailableDrivers,
  getDriverById,
  patchDriver,
  goOnline,
  goOffline,
  updateLocation
} from "../controllers/driverController.js";

const router = express.Router();

router.get("/available", getAvailableDrivers);
router.get("/:driverId", getDriverById);
router.patch("/:driverId", patchDriver);
router.patch("/:driverId/location", updateLocation);
router.post("/:driverId/go-online", goOnline);
router.post("/:driverId/go-offline", goOffline);

export default router;
