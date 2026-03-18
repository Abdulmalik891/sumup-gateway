// Branded payment page
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
        <title>Veniosh - Secure Payment</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .payment-card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo h1 {
            color: #333;
            font-size: 28px;
          }
          .amount {
            background: #f7f7f7;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
          }
          .amount-label {
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .amount-value {
            color: #333;
            font-size: 48px;
            font-weight: bold;
            margin-top: 10px;
          }
          .card-icons {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 20px 0;
            padding: 10px;
            background: #f0f0f0;
            border-radius: 8px;
          }
          .card-icon {
            font-size: 24px;
            opacity: 0.7;
          }
          .card-icon.active {
            opacity: 1;
            font-weight: bold;
          }
          #sumup-card-container {
            margin: 30px 0;
            min-height: 300px;
          }
          .footer {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 30px;
          }
          .secure-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #4CAF50;
            margin-bottom: 20px;
          }
        </style>
        <script src="https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"></script>
      </head>
      <body>
        <div class="payment-card">
          <div class="logo">
            <h1>✨ Veniosh</h1>
          </div>
          
          <div class="amount">
            <div class="amount-label">Total Amount</div>
            <div class="amount-value">${checkout.currency} ${checkout.amount}</div>
          </div>
          
          <div class="secure-badge">
            <span>🔒</span>
            <span>Secure 256-bit SSL encryption</span>
          </div>
          
          <div class="card-icons">
            <span class="card-icon active">💳 Visa</span>
            <span class="card-icon active">💳 Mastercard</span>
          </div>
          
          <div id="sumup-card-container"></div>
          
          <div class="footer">
            <p>Payments processed securely by SumUp</p>
            <p>© ${new Date().getFullYear()} Veniosh. All rights reserved.</p>
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
                  alert('Payment failed. Please try again.');
                }
              },
              showEmail: true,
              locale: 'en-US'
            });
          });
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    res.status(500).send('Error loading payment page');
  }
});

// Success page
app.get('/payment-success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful - Veniosh</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .success-card {
          background: white;
          border-radius: 20px;
          padding: 50px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .checkmark {
          color: #4CAF50;
          font-size: 80px;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 20px;
        }
        p {
          color: #666;
          margin-bottom: 30px;
          line-height: 1.6;
        }
        .button {
          background: #667eea;
          color: white;
          border: none;
          padding: 15px 40px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }
        .button:hover {
          background: #5a67d8;
        }
      </style>
    </head>
    <body>
      <div class="success-card">
        <div class="checkmark">✅</div>
        <h1>Payment Successful!</h1>
        <p>Thank you for your purchase. You will receive a confirmation email shortly.</p>
        <a href="https://veniosh.com" class="button">Return to Store</a>
      </div>
    </body>
    </html>
  `);
});

// In your create-payment endpoint, after getting sumupResponse
res.json({
  success: true,
  redirect_url: `https://sumup-gateway.onrender.com/pay/${sumupResponse.data.id}`
});

// ===========================================
// CREATE PAYMENT ENDPOINT - ADD THIS
// ===========================================
app.post('/create-payment', async (req, res) => {
  try {
    const { amount, currency, order_id, customer_email, return_url } = req.body;
    
    console.log('💳 Creating SumUp checkout for order:', order_id);
    
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
      details: error.message 
    });
  }
});