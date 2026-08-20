/**
 * API Endpoint: POST /api/contact
 *
 * Receives form data from both Sidebar and Contact Us page,
 * sends a professional HTML email via SMTP (Nodemailer).
 */

import type { APIRoute } from "astro";
import { createTransport } from "nodemailer";
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

    // Read SMTP config from environment variables
    const SMTP_HOST = import.meta.env.SMTP_HOST;
    const SMTP_PORT = parseInt(import.meta.env.SMTP_PORT || "587", 10);
    const SMTP_USER = import.meta.env.SMTP_USER;
    const SMTP_PASS = import.meta.env.SMTP_PASS;
    const EMAIL_TO = import.meta.env.EMAIL_TO;
    const EMAIL_CC_1 = import.meta.env.EMAIL_CC_1 || "";
    const EMAIL_CC_2 = import.meta.env.EMAIL_CC_2 || "";
    const EMAIL_FROM = import.meta.env.EMAIL_FROM;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_TO || !EMAIL_FROM) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error: missing SMTP env variables",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build email content
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
    const cc: string[] = [];
    if (EMAIL_CC_1) cc.push(EMAIL_CC_1);
    if (EMAIL_CC_2) cc.push(EMAIL_CC_2);

    // Create Nodemailer SMTP transporter
    const transporter = createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      name: "micrositeidpl.in",
      auth: {
        type: "login",
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Send email
    await transporter.sendMail({
      from: `"RUNR" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      cc: cc.length > 0 ? cc.join(", ") : undefined,
      replyTo: email.trim(),
      subject: subject,
      html: htmlContent,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to send email",
        detail: err?.message || String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
