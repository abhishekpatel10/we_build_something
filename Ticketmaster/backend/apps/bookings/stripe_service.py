import logging
import uuid
from django.conf import settings
import stripe

logger = logging.getLogger(__name__)

stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', 'sk_test_mock')

def process_ticket_payment(amount_dollars: float, currency: str = 'usd', payment_method_id: str = None, idempotency_key: str = None) -> dict:
    """
    Simulates or communicates with Stripe API for charging ticket purchase.
    Uses idempotency keys to prevent duplicate billing during network retries.
    """
    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())

    amount_cents = int(round(amount_dollars * 100))

    # If test mock key is configured, simulate high-fidelity Stripe response
    if stripe.api_key.startswith('sk_test_sample') or not stripe.api_key:
        logger.info("Processing simulated Stripe charge: $%.2f (Idempotency: %s)", amount_dollars, idempotency_key)
        return {
            'success': True,
            'charge_id': f"ch_sim_{uuid.uuid4().hex[:16]}",
            'idempotency_key': idempotency_key,
            'amount': amount_dollars,
            'currency': currency,
            'status': 'succeeded',
            'simulated': True
        }

    try:
        charge = stripe.Charge.create(
            amount=amount_cents,
            currency=currency,
            source=payment_method_id or 'tok_visa',
            description="Ticketmaster Booking Payment",
            idempotency_key=idempotency_key
        )
        return {
            'success': True,
            'charge_id': charge.id,
            'idempotency_key': idempotency_key,
            'amount': amount_dollars,
            'currency': currency,
            'status': charge.status,
            'simulated': False
        }
    except stripe.error.CardError as e:
        logger.warning("Stripe Card Error: %s", e)
        return {'success': False, 'error': e.user_message or str(e)}
    except Exception as e:
        logger.error("Stripe Charge Exception: %s", e)
        return {'success': False, 'error': str(e)}
