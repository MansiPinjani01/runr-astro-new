/**
 * API Endpoint: POST /api/contact
 * 
 * Receives form data from both Sidebar and Contact Us page,
 * sends a professional HTML email via Nodemailer (SMTP).
 */

import type { APIRoute } from "astro";
import nodemailer from "nodemailer";
import { buildEmailHtml, buildEmailSubject } from "../../lib/email-template";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();

    // Validate required fields
    const { name, email, phone, service, message, source } = body;

    if (!name || !email || !phone || !service) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate phone (10-digit Indian mobile)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid phone number" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // SMTP Credentials & Env variables
    const SMTP_HOST = process.env.SMTP_HOST || import.meta.env.SMTP_HOST || "send.smtp.com";
    const SMTP_PORT = Number(process.env.SMTP_PORT || import.meta.env.SMTP_PORT) || 587;
    const SMTP_USER = process.env.SMTP_USER || import.meta.env.SMTP_USER || "noreply@micrositeidpl.in";
    const SMTP_PASS = process.env.SMTP_PASS || import.meta.env.SMTP_PASS || "634'=DTmWW80";

    const EMAIL_TO = process.env.EMAIL_TO || "sagar@runr.in";
    const EMAIL_CC_1 = process.env.EMAIL_CC_1 || "suhas@runr.in";
    const EMAIL_CC_2 = process.env.EMAIL_CC_2 || "gurmeetsingh@runr.in";
    const EMAIL_FROM = process.env.EMAIL_FROM || `RUNR <${SMTP_USER}>`;

    // Build email template content
    const emailData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      service: service.trim(),
      message: (message || "").trim(),
      source: source || "Website",
    };

    const htmlContent = buildEmailHtml(emailData);
    const subject = buildEmailSubject(emailData);

    // Build CC list
    const ccList: string[] = [];
    if (EMAIL_CC_1) ccList.push(EMAIL_CC_1);
    if (EMAIL_CC_2) ccList.push(EMAIL_CC_2);

    // Create Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // false for 587 (TLS/STARTTLS)
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Send email via Nodemailer
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      cc: ccList.length > 0 ? ccList : undefined,
      replyTo: email.trim(),
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", info.messageId);

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Nodemailer error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to send email", detail: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
