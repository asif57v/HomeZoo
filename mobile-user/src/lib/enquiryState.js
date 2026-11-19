// In-memory hand-off: the enquiry tapped in the list is shown immediately on the detail screen
// while the full record loads, and stays visible if that request fails.
let current = null;

export const setCurrentEnquiry = (booking) => { current = booking || null; };
export const getCurrentEnquiry = (id) => (current && String(current._id) === String(id) ? current : null);
