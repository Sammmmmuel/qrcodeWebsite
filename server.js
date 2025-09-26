require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Checkout route
app.post("/checkout", async (req, res) => {
  const { link, email } = req.body;
  if (!link || !email) return res.status(400).send("Missing link or email.");

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: "Custom QR Code" },
          unit_amount: 100,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${req.protocol}://${req.get("host")}/success?link=${encodeURIComponent(link)}&email=${encodeURIComponent(email)}`,
      cancel_url: `${req.protocol}://${req.get("host")}/cancel`,
    });
    res.redirect(session.url);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating checkout session.");
  }
});

// Success page
app.get("/success", async (req, res) => {
  const { link, email } = req.query;
  if (!link || !email) return res.send("Missing link or email.");

  const qrDir = path.join(__dirname, "public", "qrcodes");
  if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

  const fileName = `qr-${Date.now()}.png`;
  const filePath = path.join(qrDir, fileName);
  await QRCode.toFile(filePath, link);

  const qrUrl = `${req.protocol}://${req.get("host")}/qrcodes/${fileName}`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; text-align:center; background:#111827; padding:20px;">
      <div style="background:#1f2937; border-radius:12px; padding:30px; max-width:500px; margin:auto; box-shadow:0 6px 18px rgba(0,0,0,0.4);">
        <h2 style="color:#10b981;">Thank you for your purchase!</h2>
        <p style="color:#d1d5db;">Here is your QR code for:</p>
        <p style="font-weight:bold; color:#f3f4f6; word-wrap:break-word;">${link}</p>
        <img src="${qrUrl}" alt="QR Code" style="margin:20px auto; width:200px; height:200px; border-radius:8px;"/>
        <a href="${qrUrl}" download="qrcode.png" style="display:inline-block; margin-top:20px; padding:12px 24px; background:#10b981; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold;">Download QR Code</a>
        <p style="color:#9ca3af; font-size:14px; margin-top:20px;">EasyQRCode appreciates your support!</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"EasyQRCode" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your QR Code - EasyQRCode",
    html: emailHtml
  });

  res.send(`
    <div style="display:flex;flex-direction:column;align-items:center;font-family:sans-serif;min-height:100vh;justify-content:center;background:#111827;">
      <div style="background:#1f2937;padding:40px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.4);text-align:center;max-width:400px;">
        <h2 style="color:#10b981;">✅ Payment Successful!</h2>
        <p style="color:#d1d5db;margin:15px 0;">Your QR code has been sent to <strong>${email}</strong>.</p>
        <a href="/" style="margin-top:20px;display:inline-block;padding:10px 20px;background:#10b981;color:white;border-radius:8px;text-decoration:none;font-weight:500;">Create Another</a>
      </div>
    </div>
  `);
});

// Cancel page
app.get("/cancel", (req, res) => {
  res.send(`
    <div style="display:flex;flex-direction:column;align-items:center;font-family:sans-serif;min-height:100vh;justify-content:center;background:#111827;">
      <div style="background:#1f2937;padding:40px;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.4);text-align:center;max-width:400px;">
        <h2 style="color:#ef4444;">❌ Payment Cancelled</h2>
        <p style="color:#d1d5db;margin:15px 0;">Your purchase was not completed.</p>
        <a href="/" style="margin-top:20px;display:inline-block;padding:10px 20px;background:#10b981;color:white;border-radius:8px;text-decoration:none;font-weight:500;">Try Again</a>
      </div>
    </div>
  `);
});

app.listen(PORT, () => console.log(`✅ EasyQRCode server running on port ${PORT}`));
