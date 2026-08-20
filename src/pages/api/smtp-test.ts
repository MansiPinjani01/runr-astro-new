/**
 * TEMPORARY: Test SMTP connection only. Remove after debugging.
 */
import type { APIRoute } from "astro";
import { createTransport } from "nodemailer";

export const prerender = false;

export const GET: APIRoute = async () => {
  const SMTP_HOST = import.meta.env.SMTP_HOST;
  const SMTP_PORT = parseInt(import.meta.env.SMTP_PORT || "587", 10);
  const SMTP_USER = import.meta.env.SMTP_USER;
  const SMTP_PASS = import.meta.env.SMTP_PASS;

  const debug = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER,
    passLength: SMTP_PASS ? SMTP_PASS.length : 0,
    passFirst3: SMTP_PASS ? SMTP_PASS.substring(0, 3) + "***" : "missing",
  };

  try {
    const transporter = createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
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

    // Just verify connection - does not send email
    await transporter.verify();

    return new Response(
      JSON.stringify({ success: true, message: "SMTP connection OK", debug }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || String(err),
        debug,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
