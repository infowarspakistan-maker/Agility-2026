import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from 'resend';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

dotenv.config();

let dbInstance: any = null;
function getFirestoreDb() {
  if (!dbInstance) {
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        const firebaseApp = initializeApp(firebaseConfig);
        dbInstance = firebaseConfig.firestoreDatabaseId
          ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
          : getFirestore(firebaseApp);
      } else {
        console.warn("firebase-applet-config.json not found for backend.");
      }
    } catch (err) {
      console.error("Failed to initialize Firebase in server:", err);
    }
  }
  return dbInstance;
}

let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (key) {
      resendClient = new Resend(key);
    }
  }
  return resendClient;
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/notify", async (req, res) => {
    const { email, subject, message } = req.body;
    
    const resendInstance = getResend();
    if (!resendInstance) {
      console.warn("RESEND_API_KEY is not set. Email notification skipped.");
      return res.status(200).json({ success: true, warning: "API key missing" });
    }

    try {
      await resendInstance.emails.send({
        from: 'Agility Travels <info@resend.dev>', // Replace with verified domain if available
        to: email,
        subject: subject,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #f97316;">Agility Travels Update</h2>
            <p>${message}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">This is an automated notification from Agility Travels Management Platform.</p>
          </div>
        `
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to send email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  app.post("/api/booking-confirmation", async (req, res) => {
    const { email, booking } = req.body;

    const resendInstance = getResend();
    if (!resendInstance) {
      console.warn("RESEND_API_KEY is not set. Booking confirmation email skipped.");
      return res.status(200).json({ success: true, warning: "API key missing" });
    }

    try {
      const { packageName, totalAmount, passengers, preferredStartDate, preferredEndDate, paymentMethod, contactName, packageType } = booking;

      const dateSection = (preferredStartDate && preferredEndDate) 
        ? `<div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px; margin: 15px 0; border-radius: 4px;">
            <strong style="color: #ea580c; font-size: 14px;">Preferred Travel Dates:</strong><br/>
            <span style="font-size: 15px; font-weight: bold; color: #1e293b;">${preferredStartDate} to ${preferredEndDate}</span>
           </div>`
        : '';

      const passengersHtml = passengers.map((p: any, idx: number) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; font-size: 14px; color: #334155;">${idx + 1}</td>
          <td style="padding: 8px; font-size: 14px; color: #334155; font-weight: bold;">${p.name}</td>
          <td style="padding: 8px; font-size: 14px; color: #334155; font-family: monospace;">${p.passportNumber || 'N/A'}</td>
          <td style="padding: 8px; font-size: 14px; color: #334155;">${p.nationality || 'N/A'}</td>
        </tr>
      `).join('');

      let spiritualMsg = '';
      if (packageType === 'umrah' || packageType === 'haj') {
        spiritualMsg = `
          <div style="text-align: center; margin-bottom: 25px; padding: 15px; background: #fafaf9; border-radius: 12px; border: 1px dashed #e7e5e4;">
            <p style="font-style: italic; color: #78716c; font-size: 15px; margin: 0;">
              "May Allah accept your intention, make your journey easy, and bless your spiritual pilgrimage."
            </p>
          </div>
        `;
      }

      const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Agility Travels</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 5px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold;">Booking Confirmation</p>
          </div>

          ${spiritualMsg}

          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Hello ${contactName || 'Valued Customer'},</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Thank you for booking with Agility Travels. We are delighted to assist you in planning your travel experience. Below are your booking details:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 35%;">Package Selected:</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 15px; font-weight: bold;">${packageName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Total Amount:</td>
              <td style="padding: 8px 0; color: #ea580c; font-size: 16px; font-weight: bold;">${totalAmount.toLocaleString()} PKR</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Payment Method:</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; font-weight: 500;">${paymentMethod}</td>
            </tr>
          </table>

          ${dateSection}

          <h3 style="font-size: 15px; color: #0f172a; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Passenger Manifest</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: left;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 8px; font-size: 12px; color: #475569; font-weight: bold;">#</th>
                <th style="padding: 8px; font-size: 12px; color: #475569; font-weight: bold;">Name</th>
                <th style="padding: 8px; font-size: 12px; color: #475569; font-weight: bold;">Passport</th>
                <th style="padding: 8px; font-size: 12px; color: #475569; font-weight: bold;">Nationality</th>
              </tr>
            </thead>
            <tbody>
              ${passengersHtml}
            </tbody>
          </table>

          <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #f1f5f9; margin-top: 25px;">
            <p style="font-size: 14px; color: #475569; margin: 0 0 10px 0;">Our agent will contact you shortly to complete the onboarding process.</p>
            <p style="font-size: 14px; font-weight: bold; color: #0f172a; margin: 0;">Have questions? Contact us at support@agilitytravels.com</p>
          </div>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0 20px 0;" />
          <p style="font-size: 11px; text-align: center; color: #94a3b8; line-height: 1.5; margin: 0;">
            This is an automated confirmation email. Please do not reply directly to this email.<br/>
            &copy; ${new Date().getFullYear()} Agility Travels. All rights reserved.
          </p>
        </div>
      `;

      await resendInstance.emails.send({
        from: 'Agility Travels <info@resend.dev>', // Replace with verified domain if available
        to: email,
        subject: `Booking Confirmed: ${packageName} - Agility Travels`,
        html: htmlContent
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to send booking confirmation email:", error);
      res.status(500).json({ error: "Failed to send booking confirmation email" });
    }
  });

  app.get("/sitemap.xml", async (req, res) => {
    res.header("Content-Type", "application/xml");
    
    // Fallback static URL list in case Firebase connection fails
    const staticUrls = [
      "",
      "/faq",
      "/contact",
      "/about",
      "/login",
      "/packages/umrah",
      "/packages/haj",
      "/packages/expo",
      "/packages/adventure",
      "/packages/all",
    ];
    
    const domain = "https://agilitytravels.com";
    
    let dynamicUrls: string[] = [];
    try {
      const db = getFirestoreDb();
      if (db) {
        const querySnapshot = await getDocs(collection(db, "packages"));
        querySnapshot.forEach((doc) => {
          dynamicUrls.push(`/package/${doc.id}`);
        });
      }
    } catch (err) {
      console.error("Failed to fetch packages for sitemap.xml:", err);
    }
    
    const allUrls = [...staticUrls, ...dynamicUrls];
    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(urlPath => `  <url>
    <loc>${domain}${urlPath}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${urlPath === "" ? "daily" : "weekly"}</changefreq>
    <priority>${urlPath === "" ? "1.0" : urlPath.startsWith("/package/") ? "0.8" : "0.5"}</priority>
  </url>`).join("\n")}
</urlset>`;

    res.send(sitemapContent);
  });

  app.get("/robots.txt", (req, res) => {
    res.header("Content-Type", "text/plain");
    res.send(`User-agent: *
Allow: /

Sitemap: https://agilitytravels.com/sitemap.xml
`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
