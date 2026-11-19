import apiService from './apiService';
import { openRazorpay } from '../components/RazorpayHost';

// Native port of web paymentService: same endpoints; checkout opens through the Razorpay WebView host
class PaymentService {
  async createOrder(bookingId) {
    const response = await apiService.post('/payments/create-order', { bookingId });
    return response.data;
  }
  async verifyPayment(verificationData) {
    const response = await apiService.post('/payments/verify', verificationData);
    return response.data;
  }
  async processRefund(bookingId, amount, reason) {
    const response = await apiService.post(`/payments/refund/${bookingId}`, { amount, reason });
    return response.data;
  }
  async getPaymentDetails(paymentId) {
    const response = await apiService.get(`/payments/${paymentId}`);
    return response.data;
  }
  openCheckout(options) {
    return openRazorpay(options);
  }
}

export default new PaymentService();
