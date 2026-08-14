/**
 * API Endpoint: POST /api/contact
 * 
 * Receives form data from both Sidebar and Contact Us page,
 * sends a professional HTML email via Resend API.
 * 
 * Environment variables required:
 *   RESEND_API_KEY, EMAIL_TO, EMAIL_CC_1, EMAIL_CC_2, EMAIL_FROM
 */

import type { APIRoute } from "astro";
import { buildEmailHtml, buildEmailSubject } from "../../lib/email-template";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();

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

    // Get env variables - try Cloudflare runtime first, then import.meta.env
    const runtime = (locals as any)?.runtime;
    const env = runtime?.env || {};
    
    const RESEND_API_KEY = env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
    const EMAIL_TO = env.EMAIL_TO || import.meta.env.EMAIL_TO;
    const EMAIL_CC_1 = env.EMAIL_CC_1 || import.meta.env.EMAIL_CC_1;
    const EMAIL_CC_2 = env.EMAIL_CC_2 || import.meta.env.EMAIL_CC_2;
    const EMAIL_FROM = env.EMAIL_FROM || import.meta.env.EMAIL_FROM;

    if (!RESEND_API_KEY || !EMAIL_TO || !EMAIL_FROM) {
      console.error("Missing email configuration environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build email
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

    // Send via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [EMAIL_TO],
        cc: cc.length > 0 ? cc : undefined,
        subject: subject,
        html: htmlContent,
        reply_to: email.trim(),
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Contact API error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
