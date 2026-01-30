import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// Health check
app.get("/", (_, res) => {
  res.send("EECM Mailer is running");
});

// Send account-created email
app.post("/send-account-created", async (req, res) => {
  try {
    const { toEmail, roleName, branchName, memberName } = req.body;

    if (!toEmail) {
      return res.status(400).json({ ok: false, error: "Missing toEmail" });
    }

    const html = `
      <div style="font-family:Arial,sans-serif">
        <h2>Account Access Created</h2>
        <p>Hi ${memberName || "there"},</p>

        <p>
          Your account access has been created in the Church Management System.
        </p>

        <table border="1" cellpadding="6" cellspacing="0">
          <tr><td><b>Role</b></td><td>${roleName}</td></tr>
          <tr><td><b>Branch</b></td><td>${branchName}</td></tr>
        </table>

        <p>
          You may now log in using your existing account credentials.
        </p>

        <p style="font-size:12px;color:#666">
          If you did not expect this email, you may ignore it.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `EECM <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: "Your Church System Access is Ready",
      html,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("MAIL ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📧 EECM Mailer running on http://localhost:${PORT}`);
});
