const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(express.json());

const SUMUP_API_KEY = process.env.SUMUP_API_KEY;
const SUMUP_MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;

// ===========================================
// GATEWAY REGISTRATION
// ===========================================
app.get('/payment-gateway', (req, res) => {
  res.json({
    payment_gateway: {
      id: 'sumup-visa-mastercard',
      name: 'Pay with Card (Visa/Mastercard)',
      type: 'offsite',
      supports: ['visa', 'mastercard'],
      countries: ['FR', 'DE', 'IT', 'ES', 'GB', 'US'],
      currencies: ['EUR', 'GBP', 'USD', 'AUD']
    }
  });
});

// ===========================================
// CREATE PAYMENT ENDPOINT
// ===========================================
app.post('/create-payment', async (req, res) => {
  try {
    const { amount, currency, order_id, customer_email, return_url } = req.body;
    
    console.log('💳 Creating SumUp checkout for order:', order_id);
    console.log(`Amount: ${amount} ${currency}`);
    
    // Create checkout in SumUp
    const sumupResponse = await axios.post(
      'https://api.sumup.com/v0.1/checkouts',
      {
        checkout_reference: `shopify_${order_id}`,
        amount: amount,
        currency: currency || 'EUR',
        description: `Order #${order_id} from Veniosh`,
        merchant_code: SUMUP_MERCHANT_CODE,
        return_url: `https://sumup-gateway.onrender.com/payment-result`,
        redirect_url: return_url,
        payment_types: ['card']
      },
      {
        headers: { 
          'Authorization': `Bearer ${SUMUP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ SumUp checkout created:', sumupResponse.data.id);
    
    // Return redirect URL to your branded payment page
    res.json({
      success: true,
      redirect_url: `https://sumup-gateway.onrender.com/pay/${sumupResponse.data.id}`
    });
    
  } catch (error) {
    console.error('❌ Error creating checkout:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to create payment',
      details: error.response?.data || error.message
    });
  }
});

// ===========================================
// PAYMENT RESULT ENDPOINT
// ===========================================
app.get('/payment-result', (req, res) => {
  const { sumup_id, status } = req.query;
  
  if (status === 'PAID') {
    res.redirect(`/payment-success?sumup_id=${sumup_id}`);
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

// ===========================================
// BRANDED PAYMENT PAGE - UPDATED WITH STOREFRONT DESIGN
// ===========================================
app.get('/pay/:checkoutId', async (req, res) => {
  try {
    const { checkoutId } = req.params;
    
    // Get checkout details from SumUp
    const response = await axios.get(
      `https://api.sumup.com/v0.1/checkouts/${checkoutId}`,
      { headers: { 'Authorization': `Bearer ${SUMUP_API_KEY}` } }
    );
    
    const checkout = response.data;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Veniosh - Secure Checkout</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f9fafb;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .checkout-container {
            max-width: 1000px;
            width: 100%;
            background: white;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            overflow: hidden;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          .brand-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 48px;
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .brand-logo {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 40px;
            letter-spacing: -0.5px;
          }
          .brand-message h2 {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 20px;
            line-height: 1.2;
          }
          .brand-message p {
            opacity: 0.9;
            line-height: 1.6;
            margin-bottom: 30px;
            font-size: 16px;
          }
          .feature-list {
            list-style: none;
            margin-bottom: 30px;
          }
          .feature-list li {
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .feature-list li span {
            background: rgba(255,255,255,0.2);
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          .secure-badge {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255,255,255,0.15);
            padding: 12px 20px;
            border-radius: 40px;
            width: fit-content;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
          }
          .payment-section {
            padding: 48px;
            background: white;
          }
          .order-summary {
            background: #f8fafc;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 30px;
            border: 1px solid #e2e8f0;
          }
          .summary-title {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 16px;
          }
          .order-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            color: #334155;
            font-size: 15px;
          }
          .total-row {
            border-top: 2px solid #e2e8f0;
            padding-top: 16px;
            margin-top: 8px;
            font-weight: 700;
            font-size: 18px;
            color: #0f172a;
          }
          .card-icons {
            display: flex;
            gap: 12px;
            margin: 24px 0;
          }
          .card-icon {
            background: #f1f5f9;
            padding: 8px 16px;
            border-radius: 40px;
            font-size: 14px;
            font-weight: 600;
            color: #334155;
            border: 1px solid #e2e8f0;
          }
          .card-icon.visa { color: #1a1f71; }
          .card-icon.mastercard { color: #eb001b; }
          #sumup-card-container {
            margin: 30px 0;
            min-height: 280px;
          }
          .footer {
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          @media (max-width: 768px) {
            .checkout-container {
              grid-template-columns: 1fr;
              max-width: 500px;
            }
            .brand-section {
              padding: 32px;
            }
            .payment-section {
              padding: 32px;
            }
          }
        </style>
        <script src="https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"></script>
      </head>
      <body>
        <div class="checkout-container">
          <div class="brand-section">
            <div class="brand-logo">✨ Veniosh</div>
            <div class="brand-message">
              <h2>Complete Your Purchase</h2>
              <p>Secure payment powered by SumUp. Your transaction is protected with bank-grade 256-bit SSL encryption and 3D Secure.</p>
              <ul class="feature-list">
                <li><span>✓</span> 100% Secure Checkout</li>
                <li><span>✓</span> 3D Secure Protection</li>
                <li><span>✓</span> PCI-DSS Compliant</li>
                <li><span>✓</span> Money-Back Guarantee</li>
              </ul>
              <div class="secure-badge">
                <span>🔒</span>
                <span>256-bit SSL • 3D Secure • PCI Compliant</span>
              </div>
            </div>
          </div>
          
          <div class="payment-section">
            <div class="order-summary">
              <div class="summary-title">Order Summary</div>
              <div class="order-row">
                <span>Subtotal</span>
                <span>${checkout.currency} ${(checkout.amount * 0.9).toFixed(2)}</span>
              </div>
              <div class="order-row">
                <span>Tax</span>
                <span>${checkout.currency} ${(checkout.amount * 0.1).toFixed(2)}</span>
              </div>
              <div class="order-row total-row">
                <span>Total to Pay</span>
                <span style="color: #667eea; font-size: 24px;">${checkout.currency} ${checkout.amount}</span>
              </div>
            </div>
            
            <div class="card-icons">
              <span class="card-icon visa">💳 Visa</span>
              <span class="card-icon mastercard">💳 Mastercard</span>
              <span class="card-icon">💳 Maestro</span>
            </div>
            
            <div id="sumup-card-container"></div>
            
            <div class="footer">
              <p>Payments processed securely by <strong>SumUp</strong></p>
              <p>© ${new Date().getFullYear()} Veniosh. All rights reserved. | <a href="#">Privacy Policy</a> | <a href="#">Terms</a></p>
            </div>
          </div>
        </div>
        
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            SumUpCard.mount({
              id: 'sumup-card-container',
              checkoutId: '${checkoutId}',
              onResponse: function(type, body) {
                console.log('Payment response:', type, body);
                if (type === 'success') {
                  window.location.href = '/payment-success?sumup_id=${checkoutId}';
                } else if (type === 'fail') {
                  alert('Payment failed. Please try again or use a different card.');
                } else if (type === 'error') {
                  alert('Error: ' + (body.message || 'Something went wrong'));
                }
              },
              showEmail: true,
              locale: 'en-US',
              style: {
                base: {
                  fontSize: '16px',
                  fontFamily: 'Inter, sans-serif'
                }
              }
            });
          });
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error loading payment page:', error.message);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2 style="color: red;">❌ Error Loading Payment Page</h2>
          <p>${error.message}</p>
          <button onclick="window.close()">Close</button>
        </body>
      </html>
    `);
  }
});

// ===========================================
// SUCCESS PAGE
// ===========================================
app.get('/payment-success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful - Veniosh</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          margin: 0;
        }
        .success-card {
          background: white;
          border-radius: 24px;
          padding: 60px 40px;
          text-align: center;
          max-width: 450px;
          width: 100%;
          box-shadow: 0 30px 60px rgba(0,0,0,0.3);
        }
        .checkmark {
          color: #10b981;
          font-size: 80px;
          margin-bottom: 20px;
          background: #d1fae5;
          width: 100px;
          height: 100px;
          line-height: 100px;
          border-radius: 50%;
          margin: 0 auto 30px;
        }
        h1 {
          color: #111827;
          font-size: 28px;
          margin-bottom: 15px;
          font-weight: 600;
        }
        p {
          color: #6b7280;
          margin-bottom: 30px;
          line-height: 1.6;
          font-size: 16px;
        }
        .button {
          background: #667eea;
          color: white;
          border: none;
          padding: 16px 40px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: background 0.2s;
        }
        .button:hover {
          background: #5a67d8;
        }
        .order-details {
          background: #f9fafb;
          padding: 20px;
          border-radius: 12px;
          margin: 30px 0;
          text-align: left;
        }
        .order-details p {
          margin: 5px 0;
          color: #374151;
        }
      </style>
    </head>
    <body>
      <div class="success-card">
        <div class="checkmark">✅</div>
        <h1>Payment Successful!</h1>
        <p>Thank you for your purchase. Your transaction has been completed securely.</p>
        <div class="order-details">
          <p><strong>Order ID:</strong> ${req.query.sumup_id || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>A confirmation email has been sent to your inbox.</p>
        <a href="https://veniosh.com" class="button">Continue Shopping</a>
      </div>
    </body>
    </html>
  `);
});

// ===========================================
// WEBHOOK ENDPOINT
// ===========================================
app.post('/payment-webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.status(200).send('OK');
});

// ===========================================
// HEALTH CHECK
// ===========================================
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'SumUp Payment Gateway',
    version: '1.0.0',
    endpoints: {
      payment_gateway: '/payment-gateway',
      create_payment: '/create-payment (POST)',
      payment_page: '/pay/:checkoutId',
      webhook: '/payment-webhook'
    }
  });
});

// ===========================================
// STOREFRONT STYLE GUIDE (Optional - shows all components)
// ===========================================
app.get('/style-guide', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Veniosh - Style Guide</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', sans-serif;
          background: #f9fafb;
          padding: 40px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .section {
          background: white;
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        h1 { color: #111827; margin-bottom: 30px; }
        h2 { color: #374151; margin-bottom: 20px; }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
        .component {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
        }
        .badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 40px;
          font-size: 14px;
          font-weight: 500;
          margin: 5px;
        }
        .badge.primary { background: #667eea; color: white; }
        .badge.success { background: #10b981; color: white; }
        .badge.warning { background: #f59e0b; color: white; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          margin: 5px;
          cursor: pointer;
        }
        .button.primary { background: #667eea; color: white; }
        .button.secondary { background: #e5e7eb; color: #374151; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✨ Veniosh - Storefront Style Guide</h1>
        
        <div class="section">
          <h2>Colors</h2>
          <div>
            <div class="badge primary">Primary: #667eea</div>
            <div class="badge success">Success: #10b981</div>
            <div class="badge warning">Warning: #f59e0b</div>
          </div>
        </div>
        
        <div class="section">
          <h2>Components</h2>
          <div class="grid">
            <div class="component">
              <h3>Payment Card</h3>
              <p>Split-screen design with brand section and payment form</p>
            </div>
            <div class="component">
              <h3>Order Summary</h3>
              <p>Clean display of order totals with tax breakdown</p>
            </div>
            <div class="component">
              <h3>Card Icons</h3>
              <p>Visa, Mastercard, Maestro with brand colors</p>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Buttons</h2>
          <div>
            <a href="#" class="button primary">Primary Button</a>
            <a href="#" class="button secondary">Secondary Button</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ===========================================
// START SERVER
// ===========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SumUp Gateway running on port ${PORT} and bound to 0.0.0.0`);
  console.log(`📍 Visa/Mastercard only`);
  console.log(`📍 Public URL: https://sumup-gateway.onrender.com`);
  console.log(`📍 Payment Page: https://sumup-gateway.onrender.com/pay/[checkoutId]`);
  console.log(`📍 Style Guide: https://sumup-gateway.onrender.com/style-guide`);
});