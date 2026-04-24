import { createContext, useContext, useMemo, useState, useCallback } from "react";

export const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [selectedRideOption, setSelectedRideOption] = useState(null);
  const [quote, setQuote] = useState(null);
  const [booking, setBooking] = useState(null);
  const [ride, setRide] = useState(null);
  const [payment, setPayment] = useState(null);

  const resetBooking = useCallback(() => {
    setPickup(null);
    setDestination(null);
    setSelectedRideOption(null);
    setQuote(null);
    setBooking(null);
    setRide(null);
    setPayment(null);
  }, []);

  const value = useMemo(
    () => ({
      pickup,
      setPickup,
      destination,
      setDestination,
      selectedRideOption,
      setSelectedRideOption,
      quote,
      setQuote,
      booking,
      setBooking,
      ride,
      setRide,
      payment,
      setPayment,
      resetBooking
    }),
    [pickup, destination, selectedRideOption, quote, booking, ride, payment, resetBooking]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
