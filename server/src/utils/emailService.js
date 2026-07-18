import dotenv from "dotenv";

dotenv.config();

export async function sendVerificationEmail(email, token, name = "User") {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

  const verificationLink = `${backendUrl}/api/auth/verify?token=${token}`;

  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "CV Management System";

  if (!brevoApiKey || !senderEmail) {
    console.warn(
      "WARNING: Brevo credentials are missing. Check your .env file!",
    );
    console.log("-----------------------------------------");
    console.log(`Fallback Verification Link: ${verificationLink}`);
    console.log("-----------------------------------------");
    return;
  }

  setTimeout(async () => {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [
            {
              email: email,
              name: name,
            },
          ],

          subject: `Verify Your Email Address for ${senderName}`,

          htmlContent: `
            <html>
              <head>
                <style>
                  .button {
                    background-color: #2563eb;
                    color: white !important;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 6px;
                    display: inline-block;
                    font-weight: bold;
                  }
                </style>
              </head>
              <body>
                <h2>Email Verification</h2>
                <p>Hello ${name},</p>
                <p>Thank you for registering. Please click the button below to verify your email address:</p>
                <p style="margin: 20px 0;">
                  <a href="${verificationLink}" class="button">Verify Email</a>
                </p>
                <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
                <p><a href="${verificationLink}">${verificationLink}</a></p>
                <br>
                <p>Best regards,<br>${senderName} Team</p>
              </body>
            </html>
          `,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Brevo API Error Response:", data);
        console.log("-----------------------------------------");
        console.log(`Fallback Verification Link (due to Brevo error): ${verificationLink}`);
        console.log("-----------------------------------------");
      } else {
        console.log(
          `Email sent successfully to ${email}. Message ID:`,
          data.messageId,
        );
      }
    } catch (error) {
      console.error("Network Error sending email via Brevo:", error);
      console.log("-----------------------------------------");
      console.log(`Fallback Verification Link (due to network error): ${verificationLink}`);
      console.log("-----------------------------------------");
    }
  }, 100);
}
