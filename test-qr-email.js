require("dotenv").config();
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

async function sendQrTestEmail() {
  try {
    // 1. Generate sample QR code
    const sampleLink = "https://example.com";
    const qrData = await QRCode.toDataURL(sampleLink);
    const qrBuffer = Buffer.from(qrData.split(",")[1], "base64");

    // 2. Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 3. Build email with QR inline + attachment
    const mailOptions = {
      from: `"QR Generator Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // send to yourself
      subject: "Test QR Code Email",
      html: `
        <div style="font-family: Arial, sans-serif; text-align:center; background:#f9fafb; padding:20px;">
          <div style="background:#ffffff; border-radius:12px; padding:30px; max-width:500px; margin:auto; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
            <h2 style="color:#1f2937;">QR Code Test</h2>
            <p style="color:#4b5563;">This is a test email with a QR code.</p>
            <img src="${qrData}" alt="QR Code" style="margin:20px auto; width:200px; height:200px; border-radius:8px;"/>
            <p style="color:#6b7280; font-size:14px; margin-top:10px;">You can also download the attached QR code.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: "sample-qrcode.png",
          content: qrBuffer,
          encoding: "base64",
          cid: "qrcode.png", // for inline use
        },
      ],
    };

    // 4. Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Test QR email sent:", info.response);

  } catch (error) {
    console.error("❌ Error sending QR test email:", error);
  }
}

// Run test
sendQrTestEmail();
