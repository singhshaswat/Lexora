import logging
from pathlib import Path
import resend
from app.settings.get_env import RESEND_API_KEY, RESEND_FROM_EMAIL

logger = logging.getLogger(__name__)

# Initialize Resend API key
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

def load_email_template() -> str:
    """Load the HTML email template"""
    template_path = Path(__file__).parent.parent / "templates" / "email" / "verification.html"
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Failed to load email template: {e}")
        raise

def load_password_reset_template() -> str:
    """Load the password reset HTML email template"""
    template_path = Path(__file__).parent.parent / "templates" / "email" / "password_reset.html"
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Failed to load password reset email template: {e}")
        raise

def load_email_change_template() -> str:
    """Load the email change HTML email template"""
    template_path = Path(__file__).parent.parent / "templates" / "email" / "email_change.html"
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Failed to load email change email template: {e}")
        raise

def send_verification_email(user_email: str, user_name: str, otp: str) -> None:
    """
    Send verification email with OTP to user
    
    Args:
        user_email: User's email address
        user_name: User's first name
        otp: 6-digit OTP code
    """
    if not RESEND_API_KEY:
        logger.error("Resend API key not configured")
        raise ValueError("RESEND_API_KEY must be configured")
    
    # Use default from email if not configured (onboarding@resend.dev works for testing)
    from_email = RESEND_FROM_EMAIL if RESEND_FROM_EMAIL else "onboarding@resend.dev"
    
    try:
        # Load template
        template = load_email_template()
        
        # Replace placeholders
        html_content = template.replace("{{user_name}}", user_name)
        html_content = html_content.replace("{{otp}}", otp)
        
        # Send email using Resend
        params = {
            "from": from_email,
            "to": [user_email],
            "subject": "Verify Your Email - Reverba",
            "html": html_content
        }
        resend.Emails.send(params)
        
        logger.info(f"Verification email sent to {user_email}")
        
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        raise

def send_password_reset_email(user_email: str, user_name: str, otp: str) -> None:
    """
    Send password reset email with OTP to user
    
    Args:
        user_email: User's email address
        user_name: User's first name
        otp: 6-digit OTP code
    """
    if not RESEND_API_KEY:
        logger.error("Resend API key not configured")
        raise ValueError("RESEND_API_KEY must be configured")
    
    # Use default from email if not configured (onboarding@resend.dev works for testing)
    from_email = RESEND_FROM_EMAIL if RESEND_FROM_EMAIL else "onboarding@resend.dev"
    
    try:
        # Load template
        template = load_password_reset_template()
        
        # Replace placeholders
        html_content = template.replace("{{user_name}}", user_name)
        html_content = html_content.replace("{{otp}}", otp)
        
        # Send email using Resend
        params = {
            "from": from_email,
            "to": [user_email],
            "subject": "Reset Your Password - Reverba",
            "html": html_content
        }
        resend.Emails.send(params)
        
        logger.info(f"Password reset email sent to {user_email}")
        
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        raise

def send_email_change_otp(user_email: str, user_name: str, otp: str) -> None:
    """
    Send email change OTP email to user
    
    Args:
        user_email: User's email address
        user_name: User's first name
        otp: 6-digit OTP code
    """
    if not RESEND_API_KEY:
        logger.error("Resend API key not configured")
        raise ValueError("RESEND_API_KEY must be configured")
    
    # Use default from email if not configured (onboarding@resend.dev works for testing)
    from_email = RESEND_FROM_EMAIL if RESEND_FROM_EMAIL else "onboarding@resend.dev"
    
    try:
        # Load template
        template = load_email_change_template()
        
        # Replace placeholders
        html_content = template.replace("{{user_name}}", user_name)
        html_content = html_content.replace("{{otp}}", otp)
        
        # Send email using Resend
        params = {
            "from": from_email,
            "to": [user_email],
            "subject": "Change Your Email - Reverba",
            "html": html_content
        }
        resend.Emails.send(params)
        
        logger.info(f"Email change OTP email sent to {user_email}")
        
    except Exception as e:
        logger.error(f"Failed to send email change OTP email: {e}")
        raise
