import axios from 'axios';

class SMSIndiaHubService {
  constructor() {
    this.baseUrl = 'https://cloud.smsindiahub.in/vendorsms/pushsms.aspx';
  }

  // Read at call time: this module can be imported before dotenv has loaded.
  get config() {
    return {
      username: process.env.SMSINDIAHUB_USERNAME,
      apiKey: process.env.SMSINDIAHUB_API_KEY,
      senderId: process.env.SMSINDIAHUB_SENDER_ID,
      peId: process.env.SMSINDIAHUB_PE_ID,
      otpTemplateId: process.env.SMSINDIAHUB_OTP_TEMPLATE_ID
    };
  }

  normalizePhoneNumber(phone) {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('91') && digits.length === 12) return digits;
    if (digits.length === 10) return '91' + digits;
    if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.substring(1);
    return '91' + digits.slice(-10);
  }

  async sendOTP(phone, otp, purpose = 'registration') {
    // Must match the approved DLT template character for character:
    // "Welcome to the ##var## powered by Appzeto.Your OTP for registration is ##var##.BGADEC"
    const message = `Welcome to the Hoomzo powered by Appzeto.Your OTP for registration is ${otp}.BGADEC`;
    return this.sendSMS(phone, message, { templateId: this.config.otpTemplateId });
  }

  async sendSMS(phone, message, { templateId } = {}) {
    try {
      const { apiKey, senderId, peId } = this.config;

      if (!apiKey || !senderId) {
        console.warn('⚠️ [SMSIndiaHub] Missing SMSINDIAHUB_API_KEY or SMSINDIAHUB_SENDER_ID. SMS NOT SENT.');
        return { success: false, error: 'SMS gateway not configured' };
      }

      const normalizedPhone = this.normalizePhoneNumber(phone);

      const params = new URLSearchParams({
        APIKey: apiKey,
        msisdn: normalizedPhone,
        sid: senderId,
        msg: message,
        fl: '0',
        dc: '0',
        gwid: '2'
      });
      // DLT template id (from the SMSIndiaHub template list) and optional DLT entity id
      if (templateId) params.set('DLTTemplateId', templateId);
      if (peId) params.set('PEId', peId);

      const apiUrl = `${this.baseUrl}?${params.toString()}`;
      console.log(`📨 Sending SMS to ${normalizedPhone}...`);

      const response = await axios.get(apiUrl, {
        headers: { 'User-Agent': 'Rukkooin/1.0' },
        timeout: 10000
      });

      const responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

      if (responseData.ErrorCode === '000') {
        console.log('✅ SMS Sent Successfully');
        return { success: true, response: responseData };
      } else {
        console.error('❌ SMS Failed:', responseData);
        return { success: false, error: responseData.ErrorMessage };
      }

    } catch (error) {
      console.error('❌ SMS Service Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default new SMSIndiaHubService();
