const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const SUMUP_API_KEY = process.env.SUMUP_API_KEY;
const SUMUP_MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;

// Health check
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'SumUp Gateway is running',
    endpoints: {
      payment_gateway: '/payment-gateway',
      create_payment: '/create-payment (POST)'
    }
  });
});

// Gateway registration - VISA & MASTERCARD ONLY
app.get('/payment-gateway', (req, res) => {
  res.json({
    payment_gateway: {
      id: 'sumup-visa-mastercard',
      name: 'Pay with Card (Visa/Mastercard)',
      type: 'offsite',
      supports: ['visa', 'mastercard'],  // Only Visa and Mastercard
      countries: ['FR', 'DE', 'IT', 'ES', 'GB', 'US'],
      currencies: ['EUR', 'GBP', 'USD', 'AUD']
    }
  });
});

// Create payment
app.post('/create-payment', async (req, res) => {
  try {
    const { amount, currency, order_id, return_url } = req.body;
    
    console.log('💳 Processing payment for order:', order_id);
    console.log(`Amount: ${amount} ${currency}`);
    
    // Create checkout in SumUp
    const sumupResponse = await axios.post(
      'https://api.sumup.com/v0.1/checkouts',
      {
        checkout_reference: `shopify_${order_id}`,
        amount: amount,
        currency: currency || 'EUR',
        description: `Order #${order_id}`,
        merchant_code: SUMUP_MERCHANT_CODE,
        return_url: `http://localhost:3000/payment-result`,
        redirect_url: return_url,
        payment_types: ['card']  // Only card payments
      },
      {
        headers: { 
          'Authorization': `Bearer ${SUMUP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      success: true,
      redirect_url: sumupResponse.data.checkout_url
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to create payment',
      details: error.message 
    });
  }
});

// Payment result
app.get('/payment-result', async (req, res) => {
  const { sumup_id, status } = req.query;
  
  if (status === 'PAID') {
    res.send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2 style="color: green;">✅ Payment Successful!</h2>
          <p>Your payment was processed successfully.</p>
          <p>You will be redirected shortly...</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2 style="color: red;">❌ Payment Failed</h2>
          <p>Please try again or use a different card.</p>
          <button onclick="window.close()">Close</button>
        </body>
      </html>
    `);
  }
});

// Webhook for real-time notifications
app.post('/payment-webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ SumUp Gateway running on port ${PORT}`);
  console.log(`📍 Visa/Mastercard only`);
  console.log(`📍 Test: http://localhost:${PORT}`);
  console.log(`📍 Gateway: http://localhost:${PORT}/payment-gateway`);
});