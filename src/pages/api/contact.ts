/**
 * API Endpoint: POST /api/contact
 * 
 * Receives form data from both Sidebar and Contact Us page,
 * sends a professional HTML email via Resend API.
 */

import type { APIRoute } from "astro";
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

    // Get env variables - direct values for testing
    const RESEND_API_KEY = "re_2KjaQo1X_KKw1FqvPuoGjaHvKLYzbLLf9";
    const EMAIL_TO = "mansi.pinjani@insomniacs.in";
    const EMAIL_CC_1 = "kinal@insomniacs.in";
    const EMAIL_CC_2 = "rutik@insomniacs.in";
    const EMAIL_FROM = "onboarding@resend.dev";

    if (!RESEND_API_KEY || !EMAIL_TO || !EMAIL_FROM) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error",
          debug: {
            hasKey: !!RESEND_API_KEY,
            hasKey: !!RESEND_API_KEY,
            hasTo: !!EMAIL_TO,
            hasFrom: !!EMAIL_FROM,
          }
        }),
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
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send email", detail: errorData }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error", detail: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
