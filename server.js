require("dotenv").config();
const express = require("express");
const Stripe = require("stripe");
const QRCode = require("qrcode");
const nodemailer = require("nodemailer");

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Homepage
app.get("/", (req, res) => {
  res.render("index");
});

// Stripe Checkout session
app.post("/create-checkout-session", async (req, res) => {
  const { link, email } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Custom QR Code" },
          unit_amount: 100, // $1 in cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${req.headers.origin}/success?link=${encodeURIComponent(link)}&email=${encodeURIComponent(email)}`,
    cancel_url: `${req.headers.origin}/`,
  });

  res.redirect(303, session.url);
});

// Success page -> generate QR + send email
app.get("/success", async (req, res) => {
  const { link, email } = req.query;

  // Generate QR code image as base64
  const qrData = await QRCode.toDataURL(link);
  const qrImageBuffer = Buffer.from(qrData.split(",")[1], "base64");

  // Email transport config
  let transporter = nodemailer.createTransport({
    service: "gmail", // Or any SMTP provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Styled email HTML
  const emailHtml = `
  <div style="font-family: Arial, sans-serif; text-align: center; background:#f9fafb; padding:20px;">
    <div style="background:#ffffff; border-radius:12px; padding:30px; max-width:500px; margin:auto; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
      <h2 style="color:#1f2937;">Thank you for your purchase!</h2>
      <p style="color:#4b5563;">Here is your custom QR code for:</p>
      <p style="font-weight:bold; color:#2563eb; word-wrap:break-word;">${link}</p>
      <img src="${qrData}" alt="QR Code" style="margin:20px auto; width:200px; height:200px; border-radius:8px;"/>
      <a href="cid:qrcode.png" download="qrcode.png" style="display:inline-block; margin-top:20px; padding:12px 24px; background:#2563eb; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold;">Download QR Code</a>
      <p style="color:#6b7280; font-size:14px; margin-top:20px;">We appreciate your support!</p>
    </div>
  </div>
  `;

  // Send email
  await transporter.sendMail({
    from: `"QR Generator" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your QR Code - Thank You!",
    html: emailHtml,
    attachments: [
      {
        filename: "qrcode.png",
        content: qrImageBuffer,
        encoding: "base64",
        cid: "qrcode.png", // inline display
      },
    ],
  });

  // Show confirmation page
  res.send(`
    <div style="display:flex;flex-direction:column;align-items:center;font-family:sans-serif;min-height:100vh;justify-content:center;background:#f9fafb;">
      <div style="background:white;padding:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.05);text-align:center;max-width:400px;">
        <h2 style="color:#1f2937;">✅ Payment Successful!</h2>
        <p style="color:#374151;margin:15px 0;">We've sent your QR code to <strong>${email}</strong>.</p>
        <a href="/" style="margin-top:20px;display:inline-block;padding:10px 20px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:500;">Generate Another</a>
      </div>
    </div>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on http://localhost:${PORT}`));
