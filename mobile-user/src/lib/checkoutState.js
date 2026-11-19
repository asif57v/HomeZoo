// In-memory hand-off for web's react-router `navigate(path, { state })` (property details -> checkout, etc.)
let state = null;
export const setCheckoutState = (s) => { state = s; };
export const getCheckoutState = () => state;
export const clearCheckoutState = () => { state = null; };

let bookingConfirmation = null;
export const setConfirmationState = (s) => { bookingConfirmation = s; };
export const getConfirmationState = () => bookingConfirmation;
