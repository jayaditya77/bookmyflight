const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// CREATE ORDER
router.post('/create-order', async (req, res) => {

  try {

    const { amount } = req.body;

    const order = await razorpay.orders.create({

      amount: amount * 100,

      currency: 'INR',

      receipt: 'receipt_' + Date.now()

    });

    res.json(order);

  } catch (err) {

    res.status(500).json({
      message: 'Order creation failed'
    });

  }

});

// VERIFY PAYMENT
router.post('/verify', async (req, res) => {

  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const sign =
      razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac(
        'sha256',
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(sign.toString())
      .digest('hex');

    if (expectedSign === razorpay_signature) {

      return res.json({
        success: true
      });

    }

    res.status(400).json({
      success: false
    });

  } catch (err) {

    res.status(500).json({
      message: 'Verification failed'
    });

  }

});

module.exports = router;