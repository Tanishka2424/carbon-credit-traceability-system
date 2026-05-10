"""
Email sending utilities using Gmail SMTP via fastapi-mail.
Config is built lazily so .env values are guaranteed to be loaded first.
"""
import os
import logging
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

logger = logging.getLogger("cct.email")


def _get_mail_config() -> ConnectionConfig:
    """Build ConnectionConfig at call-time so .env is always loaded first."""
    return ConnectionConfig(
        MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
        MAIL_FROM=os.getenv("MAIL_FROM", "noreply@cct.com"),
        MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "Carbon Credit Tracer"),
        MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
        MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=False,   # Fixes Windows SSL cert-chain issues
    )


def _is_email_configured() -> bool:
    """Return True only when real SMTP credentials are present."""
    username = os.getenv("MAIL_USERNAME", "").strip()
    password = os.getenv("MAIL_PASSWORD", "").strip()
    return bool(
        username
        and username != "your_gmail@gmail.com"
        and password
    )


async def send_otp_email(email: str, company_name: str, otp: str):
    """Send OTP verification email to newly registered company."""
    # Always log OTP to console – useful when email is not configured
    logger.info(f"[OTP] {email} => {otp}  (use this if email is not configured)")
    print(f"\n{'='*50}")
    print(f"[DEV OTP] Email: {email} | OTP: {otp}")
    print(f"{'='*50}\n")

    if not _is_email_configured():
        logger.warning("Email not configured — OTP printed to console above only")
        raise Exception("Email not configured")  # caller catches and returns dev_otp

    body = f"""
    <html>
    <body style="font-family: sans-serif; background: #0d1a0f; color: #e8f0e9; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #1a2318; border-radius: 12px; padding: 32px; border: 1px solid #2a3a2c;">
        <div style="font-size: 28px; font-weight: 700; color: #4ac864; margin-bottom: 8px;">Carbon Credit Tracer</div>
        <div style="color: #8fa892; margin-bottom: 24px;">Email Verification</div>
        <p>Hello <strong>{company_name}</strong>,</p>
        <p>Your one-time verification code is:</p>
        <div style="font-size: 40px; font-weight: 800; letter-spacing: 12px; text-align: center;
                    background: #0d1a0f; border-radius: 8px; padding: 20px; margin: 24px 0;
                    color: #4ac864; font-family: monospace;">
          {otp}
        </div>
        <p style="color: #8fa892; font-size: 13px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #5a6e5c; font-size: 12px;">Carbon Credit Tracer — AI + Blockchain emission verification platform</p>
      </div>
    </body>
    </html>
    """
    message = MessageSchema(
        subject="Your CCT Verification Code",
        recipients=[email],
        body=body,
        subtype=MessageType.html,
    )
    try:
        fm = FastMail(_get_mail_config())
        await fm.send_message(message)
        logger.info(f"OTP email sent to {email}")
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        raise


async def send_correction_email(
    company_email: str,
    company_name: str,
    submission_id: str,
    material: str,
    reported_co2: float,
    baseline_co2: float,
    anomaly_score: float,
    custom_message: str = "",
):
    """Admin sends a correction suggestion to a company whose report was rejected."""
    if not _is_email_configured():
        raise Exception("Email service not configured. Add MAIL_USERNAME and MAIL_PASSWORD to backend/.env")

    ratio = round(reported_co2 / baseline_co2 * 100, 1) if baseline_co2 > 0 else 0
    default_tip = (
        f"Your reported CO2 ({reported_co2:.2f}t) is {ratio}% of the expected baseline "
        f"({baseline_co2:.2f}t). Our AI model flagged this as a potential anomaly "
        f"(score: {anomaly_score:.4f}). Please review your measurement methodology and "
        f"ensure all emission sources are accounted for before resubmitting."
    )
    tip = custom_message.strip() if custom_message.strip() else default_tip

    body = f"""
    <html>
    <body style="font-family: sans-serif; background: #0d1a0f; color: #e8f0e9; padding: 32px;">
      <div style="max-width: 560px; margin: auto; background: #1a2318; border-radius: 12px; padding: 32px; border: 1px solid #2a3a2c;">
        <div style="font-size: 24px; font-weight: 700; color: #4ac864; margin-bottom: 4px;">Carbon Credit Tracer</div>
        <div style="color: #f0a500; font-weight: 600; margin-bottom: 24px;">Report Review Required</div>
        <p>Hello <strong>{company_name}</strong>,</p>
        <p>One of your emission reports was reviewed and flagged for corrections.</p>
        <div style="background: #0d1a0f; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 3px solid #f0a500;">
          <div style="font-size: 12px; color: #8fa892; margin-bottom: 4px;">Submission ID</div>
          <div style="font-family: monospace; color: #e8f0e9;">{submission_id}</div>
          <div style="font-size: 12px; color: #8fa892; margin-top: 12px; margin-bottom: 4px;">Material</div>
          <div style="text-transform: capitalize;">{material}</div>
        </div>
        <div style="background: #0d1a0f; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 3px solid #4ac864;">
          <div style="font-size: 12px; color: #8fa892; margin-bottom: 8px;">Suggested corrections:</div>
          <div style="color: #e8f0e9; line-height: 1.6;">{tip}</div>
        </div>
        <p>Please correct your data and resubmit through the portal.</p>
        <p style="color: #5a6e5c; font-size: 12px;">Carbon Credit Tracer Admin</p>
      </div>
    </body>
    </html>
    """
    message = MessageSchema(
        subject=f"CCT Report Correction Required - {submission_id[:8].upper()}",
        recipients=[company_email],
        body=body,
        subtype=MessageType.html,
    )
    try:
        fm = FastMail(_get_mail_config())
        await fm.send_message(message)
    except Exception as e:
        logger.error(f"Correction email failed: {e}")
        raise
