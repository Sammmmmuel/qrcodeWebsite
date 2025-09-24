require("dotenv").config();
const nodemailer = require("nodemailer");

async function sendTestEmail() {
  try {
    // 1. Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Set up email options
    const mailOptions = {
      from: `"QR Generator Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // send to yourself for testing
      subject: "Test Email from Nodemailer",
      html: `
        <div style="font-family: Arial, sans-serif; text-align:center;">
          <h2 style="color:#1f2937;">Hello!</h2>
          <p style="color:#4b5563;">This is a test email to confirm your Nodemailer setup works.</p>
        </div>
      `,
    };

    // 3. Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Test email sent:", info.response);

  } catch (error) {
    console.error("❌ Error sending test email:", error);
  }
}

// Run the test
sendTestEmail();
