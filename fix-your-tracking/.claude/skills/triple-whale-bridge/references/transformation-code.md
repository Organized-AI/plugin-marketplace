# Transformation Code Reference

Complete, production-ready code for transforming GoHighLevel webhooks to Triple Whale format.

## Python Implementation

### Complete Transformer Class

```python
"""
GHL to Triple Whale Transformer
Production-ready implementation with comprehensive edge case handling.
"""

from datetime import datetime, timezone
from typing import Any, Optional, Dict, List
import re


class GHLToTripleWhaleTransformer:
    """Transform GoHighLevel webhooks to Triple Whale events and orders."""

    # Comprehensive pipeline stage to event type mapping
    STAGE_MAPPING: Dict[str, str] = {
        # Lead stages (early funnel)
        "new lead": "lead",
        "new": "lead",
        "inbound": "lead",
        "inquiry": "lead",
        "cold lead": "lead",
        "contacted": "lead",
        "reached out": "lead",
        "first touch": "lead",

        # MQL stages (marketing qualified)
        "qualified": "mql",
        "mql": "mql",
        "marketing qualified": "mql",
        "engaged": "mql",
        "warm lead": "mql",
        "hot lead": "mql",
        "stakeholder identified": "mql",
        "champion engaged": "mql",

        # SQL stages (sales qualified)
        "sales qualified": "sql",
        "sql": "sql",
        "discovery complete": "sql",
        "demo complete": "sql",
        "needs assessed": "sql",
        "technical evaluation": "sql",
        "poc": "sql",
        "trial": "sql",

        # Demo/meeting stages
        "demo scheduled": "book_demo",
        "demo booked": "book_demo",
        "discovery call": "book_demo",
        "discovery call scheduled": "book_demo",
        "meeting set": "book_demo",
        "meeting scheduled": "book_demo",
        "consultation booked": "book_demo",
        "showing scheduled": "book_demo",
        "call scheduled": "book_demo",

        # Opportunity stages (active deal)
        "proposal": "opportunity",
        "proposal sent": "opportunity",
        "quote sent": "opportunity",
        "negotiation": "opportunity",
        "contract sent": "opportunity",
        "contract review": "opportunity",
        "legal review": "opportunity",
        "procurement": "opportunity",
        "final approval": "opportunity",
        "under contract": "opportunity",

        # Closed stages
        "closed won": "custom",
        "won": "custom",
        "customer": "custom",
        "completed": "custom",
        "closed lost": "custom",
        "lost": "custom",
        "disqualified": "custom",
    }

    # Value multipliers for weighted attribution
    VALUE_MULTIPLIERS: Dict[str, float] = {
        "lead": 0.0,
        "mql": 0.10,
        "sql": 0.25,
        "book_demo": 0.20,
        "opportunity": 0.50,
        "custom": 1.0,
    }

    def __init__(self, default_currency: str = "USD"):
        """
        Initialize transformer.

        Args:
            default_currency: Default currency code for values
        """
        self.default_currency = default_currency

    def transform_to_event(self, ghl_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Transform GHL webhook to Triple Whale event.

        Args:
            ghl_payload: Raw GHL webhook payload

        Returns:
            Triple Whale event dict ready for /data-in/event, or None if invalid
        """
        # Extract and normalize identifiers
        email = self._normalize_email(ghl_payload.get("email"))
        phone = self._normalize_phone(ghl_payload.get("phone"))

        # Must have at least one identifier for attribution
        if not email and not phone:
            return None

        # Determine event type from pipeline stage
        stage = (ghl_payload.get("pipelineStage") or "").lower().strip()
        event_type = self.STAGE_MAPPING.get(stage, "custom")

        # Get deal value and calculate attribution
        deal_value = self._get_monetary_value(ghl_payload)
        multiplier = self.VALUE_MULTIPLIERS.get(event_type, 1.0)
        attributed_value = (deal_value * multiplier) if deal_value else None

        # Calculate days in pipeline
        days_in_pipeline = self._calculate_days_in_pipeline(
            ghl_payload.get("dateAdded")
        )

        # Build properties
        properties = self._build_event_properties(
            ghl_payload=ghl_payload,
            stage=stage,
            deal_value=deal_value,
            attributed_value=attributed_value,
            days_in_pipeline=days_in_pipeline,
        )

        # Build event
        event: Dict[str, Any] = {
            "type": event_type,
            "timestamp": self._get_timestamp(ghl_payload),
            "properties": properties,
        }

        # Add identifiers (only non-None)
        if email:
            event["email"] = email
        if phone:
            event["phone"] = phone

        return event

    def transform_to_order(
        self,
        ghl_payload: Dict[str, Any],
        shop_domain: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Transform GHL closed-won deal to Triple Whale order.

        Use this for closed deals when you want revenue tracked as orders.

        Args:
            ghl_payload: Raw GHL webhook payload
            shop_domain: Your store/company domain (e.g., "yourcompany.com")

        Returns:
            Triple Whale order dict ready for /data-in/orders, or None if invalid
        """
        email = self._normalize_email(ghl_payload.get("email"))
        phone = self._normalize_phone(ghl_payload.get("phone"))

        if not email and not phone:
            return None

        deal_value = self._get_monetary_value(ghl_payload) or 0
        opportunity_name = ghl_payload.get("opportunityName") or "Service"

        # Generate unique order ID
        order_id = ghl_payload.get("opportunityId")
        if not order_id:
            contact_id = ghl_payload.get("contactId") or "unknown"
            timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            order_id = f"GHL-{contact_id}-{timestamp}"

        # Build customer object
        customer: Dict[str, Any] = {}
        if email:
            customer["email"] = email
        if phone:
            customer["phone"] = phone
        if ghl_payload.get("firstName"):
            customer["first_name"] = ghl_payload["firstName"]
        if ghl_payload.get("lastName"):
            customer["last_name"] = ghl_payload["lastName"]

        # Build order
        order = {
            "shop": shop_domain,
            "order_id": order_id,
            "created_at": ghl_payload.get("dateAdded") or datetime.utcnow().isoformat() + "Z",
            "updated_at": ghl_payload.get("dateUpdated"),
            "platform": "CUSTOM",
            "platform_account_id": ghl_payload.get("locationId"),
            "customer": customer,
            "line_items": [
                {
                    "product_id": ghl_payload.get("pipelineId") or "ghl_deal",
                    "variant_id": ghl_payload.get("opportunityId") or "default",
                    "title": opportunity_name,
                    "quantity": 1,
                    "price": deal_value,
                }
            ],
            "total_price": deal_value,
            "subtotal_price": deal_value,
            "total_tax": 0,
            "total_discounts": 0,
            "currency": self.default_currency,
            "source_name": "gohighlevel",
        }

        # Add optional fields
        if ghl_payload.get("tags"):
            order["tags"] = ghl_payload["tags"]

        # Remove None values
        order = {k: v for k, v in order.items() if v is not None}

        return order

    def _build_event_properties(
        self,
        ghl_payload: Dict[str, Any],
        stage: str,
        deal_value: Optional[float],
        attributed_value: Optional[float],
        days_in_pipeline: Optional[int],
    ) -> Dict[str, Any]:
        """Build event properties from payload."""
        props: Dict[str, Any] = {
            "pipeline_name": ghl_payload.get("pipelineName"),
            "pipeline_stage": ghl_payload.get("pipelineStage"),
            "opportunity_name": ghl_payload.get("opportunityName"),
            "opportunity_id": ghl_payload.get("opportunityId"),
            "lead_value": deal_value,
            "value": attributed_value,
            "currency": self.default_currency,
            "source": (
                ghl_payload.get("attributionSource") or
                ghl_payload.get("opportunitySource") or
                ghl_payload.get("source")
            ),
            "ghl_contact_id": ghl_payload.get("contactId"),
            "ghl_opportunity_id": ghl_payload.get("opportunityId"),
            "company_name": ghl_payload.get("companyName"),
            "assigned_to": ghl_payload.get("assignedTo"),
            "days_in_pipeline": days_in_pipeline,
        }

        # Handle closed stages - use full deal value
        if "won" in stage or stage == "customer" or stage == "completed":
            props["event_name"] = "closed_won"
            props["value"] = deal_value  # Full value for won deals
        elif "lost" in stage or stage == "disqualified":
            props["event_name"] = "closed_lost"
            props["value"] = 0

        # Extract UTM parameters from custom fields
        custom_fields = ghl_payload.get("customFields") or []
        utm_mapping = {
            "utm_source": "source",
            "utm_medium": "medium",
            "utm_campaign": "campaign",
        }
        for field in custom_fields:
            key = (field.get("key") or "").lower()
            value = field.get("value") or field.get("fieldValue")
            if key in utm_mapping and value:
                props[utm_mapping[key]] = value

        # Remove None values
        return {k: v for k, v in props.items() if v is not None}

    def _get_monetary_value(self, ghl_payload: Dict[str, Any]) -> Optional[float]:
        """Extract and parse monetary value from payload."""
        # Prefer monetaryValue over leadValue
        value = ghl_payload.get("monetaryValue")
        if value is None:
            value = ghl_payload.get("leadValue")

        if value is None:
            return None

        # Already a number
        if isinstance(value, (int, float)):
            return float(value)

        # Parse string value
        if isinstance(value, str):
            # Remove currency symbols, commas, spaces
            cleaned = re.sub(r"[^\d.]", "", value)
            if cleaned:
                try:
                    return float(cleaned)
                except ValueError:
                    pass

        return None

    def _get_timestamp(self, ghl_payload: Dict[str, Any]) -> str:
        """Get ISO 8601 timestamp from payload or generate current."""
        ts = ghl_payload.get("dateUpdated") or ghl_payload.get("timestamp")

        if ts:
            # If it's already a proper ISO string, return it
            if isinstance(ts, str):
                # Check if it already has timezone info
                if ts.endswith("Z") or "+" in ts or ts.endswith(")"):
                    return ts
                # Add Z for UTC if no timezone
                return f"{ts}Z"

        # Generate current timestamp
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    def _calculate_days_in_pipeline(self, date_added: Optional[str]) -> Optional[int]:
        """Calculate days since opportunity/contact creation."""
        if not date_added:
            return None

        try:
            # Parse ISO 8601 timestamp
            if date_added.endswith("Z"):
                date_added = date_added[:-1] + "+00:00"
            added = datetime.fromisoformat(date_added)

            # Ensure timezone-aware comparison
            now = datetime.now(timezone.utc)
            if added.tzinfo is None:
                added = added.replace(tzinfo=timezone.utc)

            return (now - added).days
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _normalize_email(email: Optional[str]) -> Optional[str]:
        """Normalize email address for consistent matching."""
        if not email or not isinstance(email, str):
            return None
        normalized = email.lower().strip()
        # Basic validation
        if "@" not in normalized or "." not in normalized:
            return None
        return normalized

    @staticmethod
    def _normalize_phone(phone: Optional[str]) -> Optional[str]:
        """
        Normalize phone number to E.164 format.

        E.164 format: +[country code][number]
        Example: +15551234567
        """
        if not phone or not isinstance(phone, str):
            return None

        # Remove all non-digit characters except leading +
        cleaned = phone.strip()
        if cleaned.startswith("+"):
            digits = "+" + re.sub(r"\D", "", cleaned[1:])
        else:
            digits = re.sub(r"\D", "", cleaned)

        # Handle various formats
        if digits.startswith("+"):
            # Already has country code
            return digits if len(digits) >= 10 else None
        elif len(digits) == 10:
            # US number without country code
            return f"+1{digits}"
        elif len(digits) == 11 and digits.startswith("1"):
            # US number with leading 1
            return f"+{digits}"
        elif len(digits) > 10:
            # International number, assume has country code
            return f"+{digits}"

        # Too short to be valid
        return None
```

---

## TypeScript Implementation

### Complete Transformer Class

```typescript
/**
 * GHL to Triple Whale Transformer
 * Production-ready TypeScript implementation
 */

// =============================================================================
// Type Definitions
// =============================================================================

interface GHLCustomField {
  id?: string;
  key?: string;
  value?: unknown;
  fieldValue?: unknown;
}

interface GHLPayload {
  // Contact fields
  contactId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  companyName?: string;
  tags?: string[];
  source?: string;
  attributionSource?: string;

  // Opportunity fields
  opportunityId?: string;
  opportunityName?: string;
  opportunitySource?: string;
  pipelineId?: string;
  pipelineName?: string;
  pipelineStage?: string;
  pipelineStageId?: string;
  status?: string;
  leadValue?: number | string;
  monetaryValue?: number | string;
  assignedTo?: string;

  // Metadata
  locationId?: string;
  dateAdded?: string;
  dateUpdated?: string;
  timestamp?: string;
  customFields?: GHLCustomField[];
}

interface TripleWhaleEventProperties {
  pipeline_name?: string;
  pipeline_stage?: string;
  opportunity_name?: string;
  opportunity_id?: string;
  lead_value?: number;
  value?: number;
  currency?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  ghl_contact_id?: string;
  ghl_opportunity_id?: string;
  company_name?: string;
  assigned_to?: string;
  days_in_pipeline?: number;
  event_name?: string;
}

interface TripleWhaleEvent {
  type: string;
  email?: string;
  phone?: string;
  timestamp: string;
  properties: TripleWhaleEventProperties;
}

interface TripleWhaleOrderCustomer {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}

interface TripleWhaleOrderLineItem {
  product_id: string;
  variant_id: string;
  title: string;
  quantity: number;
  price: number;
}

interface TripleWhaleOrder {
  shop: string;
  order_id: string;
  created_at: string;
  updated_at?: string;
  platform: string;
  platform_account_id?: string;
  customer: TripleWhaleOrderCustomer;
  line_items: TripleWhaleOrderLineItem[];
  total_price: number;
  subtotal_price: number;
  total_tax: number;
  total_discounts: number;
  currency: string;
  tags?: string[];
  source_name: string;
}

// =============================================================================
// Transformer Class
// =============================================================================

class GHLToTripleWhaleTransformer {
  // Comprehensive stage mapping (matches Python implementation exactly)
  private static readonly STAGE_MAPPING: Record<string, string> = {
    // Lead stages (early funnel)
    "new lead": "lead",
    new: "lead",
    inbound: "lead",
    inquiry: "lead",
    "cold lead": "lead",
    contacted: "lead",
    "reached out": "lead",
    "first touch": "lead",

    // MQL stages (marketing qualified)
    qualified: "mql",
    mql: "mql",
    "marketing qualified": "mql",
    engaged: "mql",
    "warm lead": "mql",
    "hot lead": "mql",
    "stakeholder identified": "mql",
    "champion engaged": "mql",

    // SQL stages (sales qualified)
    "sales qualified": "sql",
    sql: "sql",
    "discovery complete": "sql",
    "demo complete": "sql",
    "needs assessed": "sql",
    "technical evaluation": "sql",
    poc: "sql",
    trial: "sql",

    // Demo/meeting stages
    "demo scheduled": "book_demo",
    "demo booked": "book_demo",
    "discovery call": "book_demo",
    "discovery call scheduled": "book_demo",
    "meeting set": "book_demo",
    "meeting scheduled": "book_demo",
    "consultation booked": "book_demo",
    "showing scheduled": "book_demo",
    "call scheduled": "book_demo",

    // Opportunity stages (active deal)
    proposal: "opportunity",
    "proposal sent": "opportunity",
    "quote sent": "opportunity",
    negotiation: "opportunity",
    "contract sent": "opportunity",
    "contract review": "opportunity",
    "legal review": "opportunity",
    procurement: "opportunity",
    "final approval": "opportunity",
    "under contract": "opportunity",

    // Closed stages
    "closed won": "custom",
    won: "custom",
    customer: "custom",
    completed: "custom",
    "closed lost": "custom",
    lost: "custom",
    disqualified: "custom",
  };

  // Value multipliers for weighted attribution
  private static readonly VALUE_MULTIPLIERS: Record<string, number> = {
    lead: 0.0,
    mql: 0.1,
    sql: 0.25,
    book_demo: 0.2,
    opportunity: 0.5,
    custom: 1.0,
  };

  private defaultCurrency: string;

  constructor(defaultCurrency = "USD") {
    this.defaultCurrency = defaultCurrency;
  }

  /**
   * Transform GHL webhook to Triple Whale event
   */
  transformToEvent(payload: GHLPayload): TripleWhaleEvent | null {
    const email = this.normalizeEmail(payload.email);
    const phone = this.normalizePhone(payload.phone);

    if (!email && !phone) {
      return null;
    }

    const stage = (payload.pipelineStage || "").toLowerCase().trim();
    const eventType =
      GHLToTripleWhaleTransformer.STAGE_MAPPING[stage] || "custom";

    const dealValue = this.getMonetaryValue(payload);
    const multiplier =
      GHLToTripleWhaleTransformer.VALUE_MULTIPLIERS[eventType] ?? 1.0;
    const attributedValue = dealValue !== null ? dealValue * multiplier : undefined;

    const daysInPipeline = this.calculateDaysInPipeline(payload.dateAdded);

    const properties = this.buildEventProperties(
      payload,
      stage,
      dealValue,
      attributedValue,
      daysInPipeline
    );

    const event: TripleWhaleEvent = {
      type: eventType,
      timestamp: this.getTimestamp(payload),
      properties,
    };

    if (email) event.email = email;
    if (phone) event.phone = phone;

    return event;
  }

  /**
   * Transform GHL closed-won deal to Triple Whale order
   */
  transformToOrder(payload: GHLPayload, shopDomain: string): TripleWhaleOrder | null {
    const email = this.normalizeEmail(payload.email);
    const phone = this.normalizePhone(payload.phone);

    if (!email && !phone) {
      return null;
    }

    const dealValue = this.getMonetaryValue(payload) ?? 0;
    const opportunityName = payload.opportunityName || "Service";

    // Generate unique order ID
    let orderId = payload.opportunityId;
    if (!orderId) {
      const contactId = payload.contactId || "unknown";
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
      orderId = `GHL-${contactId}-${timestamp}`;
    }

    // Build customer
    const customer: TripleWhaleOrderCustomer = {};
    if (email) customer.email = email;
    if (phone) customer.phone = phone;
    if (payload.firstName) customer.first_name = payload.firstName;
    if (payload.lastName) customer.last_name = payload.lastName;

    const order: TripleWhaleOrder = {
      shop: shopDomain,
      order_id: orderId,
      created_at: payload.dateAdded || new Date().toISOString(),
      updated_at: payload.dateUpdated,
      platform: "CUSTOM",
      platform_account_id: payload.locationId,
      customer,
      line_items: [
        {
          product_id: payload.pipelineId || "ghl_deal",
          variant_id: payload.opportunityId || "default",
          title: opportunityName,
          quantity: 1,
          price: dealValue,
        },
      ],
      total_price: dealValue,
      subtotal_price: dealValue,
      total_tax: 0,
      total_discounts: 0,
      currency: this.defaultCurrency,
      source_name: "gohighlevel",
    };

    if (payload.tags?.length) {
      order.tags = payload.tags;
    }

    return order;
  }

  private buildEventProperties(
    payload: GHLPayload,
    stage: string,
    dealValue: number | null,
    attributedValue: number | undefined,
    daysInPipeline: number | undefined
  ): TripleWhaleEventProperties {
    const props: TripleWhaleEventProperties = {
      pipeline_name: payload.pipelineName,
      pipeline_stage: payload.pipelineStage,
      opportunity_name: payload.opportunityName,
      opportunity_id: payload.opportunityId,
      lead_value: dealValue ?? undefined,
      value: attributedValue,
      currency: this.defaultCurrency,
      source:
        payload.attributionSource ||
        payload.opportunitySource ||
        payload.source,
      ghl_contact_id: payload.contactId,
      ghl_opportunity_id: payload.opportunityId,
      company_name: payload.companyName,
      assigned_to: payload.assignedTo,
      days_in_pipeline: daysInPipeline,
    };

    // Handle closed stages
    if (
      stage.includes("won") ||
      stage === "customer" ||
      stage === "completed"
    ) {
      props.event_name = "closed_won";
      props.value = dealValue ?? undefined;
    } else if (stage.includes("lost") || stage === "disqualified") {
      props.event_name = "closed_lost";
      props.value = 0;
    }

    // Extract UTM from custom fields
    const utmMapping: Record<string, keyof TripleWhaleEventProperties> = {
      utm_source: "source",
      utm_medium: "medium",
      utm_campaign: "campaign",
    };

    for (const field of payload.customFields || []) {
      const key = (field.key || "").toLowerCase();
      const value = field.value || field.fieldValue;
      if (key in utmMapping && value) {
        props[utmMapping[key]] = String(value);
      }
    }

    // Remove undefined values
    return Object.fromEntries(
      Object.entries(props).filter(([_, v]) => v !== undefined)
    ) as TripleWhaleEventProperties;
  }

  private getMonetaryValue(payload: GHLPayload): number | null {
    const value = payload.monetaryValue ?? payload.leadValue;

    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === "number") {
      return value;
    }

    const cleaned = String(value).replace(/[^\d.]/g, "");
    if (!cleaned) return null;

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private getTimestamp(payload: GHLPayload): string {
    const ts = payload.dateUpdated || payload.timestamp;

    if (ts) {
      // Check if already has timezone
      if (ts.endsWith("Z") || ts.includes("+")) {
        return ts;
      }
      return `${ts}Z`;
    }

    return new Date().toISOString();
  }

  private calculateDaysInPipeline(dateAdded?: string): number | undefined {
    if (!dateAdded) return undefined;

    try {
      const added = new Date(dateAdded);
      if (isNaN(added.getTime())) return undefined;

      const now = new Date();
      const diffMs = now.getTime() - added.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return undefined;
    }
  }

  private normalizeEmail(email?: string): string | undefined {
    if (!email || typeof email !== "string") return undefined;

    const normalized = email.toLowerCase().trim();
    if (!normalized.includes("@") || !normalized.includes(".")) {
      return undefined;
    }
    return normalized;
  }

  private normalizePhone(phone?: string): string | undefined {
    if (!phone || typeof phone !== "string") return undefined;

    const cleaned = phone.trim();
    let digits: string;

    if (cleaned.startsWith("+")) {
      digits = "+" + cleaned.slice(1).replace(/\D/g, "");
    } else {
      digits = cleaned.replace(/\D/g, "");
    }

    if (digits.startsWith("+")) {
      return digits.length >= 10 ? digits : undefined;
    } else if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    } else if (digits.length > 10) {
      return `+${digits}`;
    }

    return undefined;
  }
}

export {
  GHLToTripleWhaleTransformer,
  GHLPayload,
  TripleWhaleEvent,
  TripleWhaleOrder,
};
```

---

## API Client with Retry

### Python Async Client

```python
import httpx
import asyncio
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class TripleWhaleAPIError(Exception):
    """Triple Whale API error with status code."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class TripleWhaleClient:
    """
    Async client for Triple Whale Data-In API with exponential backoff retry.

    Usage:
        async with TripleWhaleClient(api_key="...") as client:
            await client.send_event(event)
    """

    BASE_URL = "https://api.triplewhale.com/api/v2"
    MAX_RETRIES = 4
    RETRY_DELAYS = [2, 4, 8, 16]  # seconds
    RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

    def __init__(self, api_key: str, timeout: float = 30.0):
        self.api_key = api_key
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self) -> "TripleWhaleClient":
        self._client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={
                "x-api-key": self.api_key,
                "Content-Type": "application/json",
                "User-Agent": "GHL-TripleWhale-Bridge/1.0",
            },
            timeout=self.timeout,
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()

    async def send_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send attribution event to /data-in/event.

        Rate limit: 1,000 events/min
        """
        return await self._request("POST", "/data-in/event", event)

    async def send_order(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send order to /data-in/orders.

        Rate limit: 25,000 requests/min
        """
        return await self._request("POST", "/data-in/orders", order)

    async def validate_key(self) -> Dict[str, Any]:
        """Validate API key."""
        return await self._request("GET", "/users/api-keys/me", None)

    async def _request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Make request with exponential backoff retry."""
        if not self._client:
            raise RuntimeError("Client not initialized. Use async context manager.")

        last_error: Optional[Exception] = None

        for attempt in range(self.MAX_RETRIES + 1):
            try:
                response = await self._client.request(
                    method=method,
                    url=endpoint,
                    json=json_data,
                )

                if response.status_code == 200:
                    try:
                        return response.json()
                    except Exception:
                        return {"status": "success"}

                # Non-retryable errors
                if response.status_code in (401, 403):
                    raise TripleWhaleAPIError(
                        f"Authentication error: {response.text}",
                        response.status_code,
                    )

                if response.status_code == 422:
                    raise TripleWhaleAPIError(
                        f"Validation error: {response.text}",
                        response.status_code,
                    )

                # Retryable errors
                if response.status_code in self.RETRYABLE_STATUS_CODES:
                    last_error = TripleWhaleAPIError(
                        f"Server error: {response.status_code}",
                        response.status_code,
                    )
                    if attempt < self.MAX_RETRIES:
                        delay = self.RETRY_DELAYS[attempt]
                        logger.warning(
                            f"Request failed with {response.status_code}, "
                            f"retrying in {delay}s (attempt {attempt + 1})"
                        )
                        await asyncio.sleep(delay)
                        continue

                raise TripleWhaleAPIError(
                    f"Request failed: {response.text}",
                    response.status_code,
                )

            except httpx.RequestError as e:
                last_error = TripleWhaleAPIError(f"Network error: {e}")
                if attempt < self.MAX_RETRIES:
                    delay = self.RETRY_DELAYS[attempt]
                    logger.warning(f"Network error, retrying in {delay}s")
                    await asyncio.sleep(delay)
                    continue
                raise last_error

        raise last_error or TripleWhaleAPIError("Max retries exceeded")
```

### TypeScript Client

```typescript
interface TripleWhaleAPIError extends Error {
  statusCode?: number;
}

class TripleWhaleClient {
  private readonly baseUrl = "https://api.triplewhale.com/api/v2";
  private readonly apiKey: string;
  private readonly retryDelays = [2000, 4000, 8000, 16000];
  private readonly retryableStatusCodes = new Set([429, 500, 502, 503, 504]);

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEvent(event: TripleWhaleEvent): Promise<unknown> {
    return this.request("POST", "/data-in/event", event);
  }

  async sendOrder(order: TripleWhaleOrder): Promise<unknown> {
    return this.request("POST", "/data-in/orders", order);
  }

  async validateKey(): Promise<unknown> {
    return this.request("GET", "/users/api-keys/me");
  }

  private async request(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<unknown> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryDelays.length; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
            "User-Agent": "GHL-TripleWhale-Bridge/1.0",
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (response.ok) {
          return response.json();
        }

        // Non-retryable errors
        if ([401, 403, 422].includes(response.status)) {
          const error = new Error(
            `API error ${response.status}: ${await response.text()}`
          ) as TripleWhaleAPIError;
          error.statusCode = response.status;
          throw error;
        }

        // Retryable errors
        if (this.retryableStatusCodes.has(response.status)) {
          lastError = new Error(`Server error ${response.status}`);
          if (attempt < this.retryDelays.length) {
            console.warn(
              `Request failed with ${response.status}, ` +
                `retrying in ${this.retryDelays[attempt]}ms`
            );
            await this.sleep(this.retryDelays[attempt]);
            continue;
          }
        }

        throw new Error(`Request failed: ${await response.text()}`);
      } catch (error) {
        if ((error as TripleWhaleAPIError).statusCode) {
          throw error; // Don't retry auth/validation errors
        }
        lastError = error as Error;
        if (attempt < this.retryDelays.length) {
          await this.sleep(this.retryDelays[attempt]);
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

---

## Usage Examples

### Python - Complete Workflow

```python
import asyncio
from typing import Dict, Any


async def process_ghl_webhook(ghl_payload: Dict[str, Any]) -> None:
    """Process incoming GHL webhook and send to Triple Whale."""

    # Initialize transformer
    transformer = GHLToTripleWhaleTransformer(default_currency="USD")

    # Transform to event
    event = transformer.transform_to_event(ghl_payload)

    if not event:
        print("Could not transform payload (missing email/phone)")
        return

    print(f"Transformed to {event['type']} event")

    # Send to Triple Whale
    async with TripleWhaleClient(api_key="your_api_key") as client:
        result = await client.send_event(event)
        print(f"Event sent successfully: {result}")

        # If closed won, also send as order
        stage = (ghl_payload.get("pipelineStage") or "").lower()
        if "won" in stage:
            order = transformer.transform_to_order(
                ghl_payload,
                shop_domain="yourcompany.com"
            )
            if order:
                result = await client.send_order(order)
                print(f"Order sent successfully: {result}")


# Example usage
if __name__ == "__main__":
    sample_payload = {
        "email": "john@example.com",
        "phone": "(555) 123-4567",
        "firstName": "John",
        "lastName": "Doe",
        "companyName": "Acme Corp",
        "pipelineName": "Main Sales Pipeline",
        "pipelineStage": "Closed Won",
        "opportunityId": "opp_123",
        "opportunityName": "Enterprise Deal",
        "monetaryValue": 25000,
        "attributionSource": "google_ads",
        "dateAdded": "2024-01-01T10:00:00Z",
        "dateUpdated": "2024-02-01T16:00:00Z",
    }

    asyncio.run(process_ghl_webhook(sample_payload))
```

### TypeScript - Complete Workflow

```typescript
async function processGHLWebhook(payload: GHLPayload): Promise<void> {
  const transformer = new GHLToTripleWhaleTransformer("USD");

  // Transform to event
  const event = transformer.transformToEvent(payload);

  if (!event) {
    console.log("Could not transform payload (missing email/phone)");
    return;
  }

  console.log(`Transformed to ${event.type} event`);

  // Send to Triple Whale
  const client = new TripleWhaleClient("your_api_key");
  const result = await client.sendEvent(event);
  console.log("Event sent successfully:", result);

  // If closed won, also send as order
  const stage = (payload.pipelineStage || "").toLowerCase();
  if (stage.includes("won")) {
    const order = transformer.transformToOrder(payload, "yourcompany.com");
    if (order) {
      const orderResult = await client.sendOrder(order);
      console.log("Order sent successfully:", orderResult);
    }
  }
}

// Example usage
const samplePayload: GHLPayload = {
  email: "john@example.com",
  phone: "(555) 123-4567",
  firstName: "John",
  lastName: "Doe",
  companyName: "Acme Corp",
  pipelineName: "Main Sales Pipeline",
  pipelineStage: "Closed Won",
  opportunityId: "opp_123",
  opportunityName: "Enterprise Deal",
  monetaryValue: 25000,
  attributionSource: "google_ads",
  dateAdded: "2024-01-01T10:00:00Z",
  dateUpdated: "2024-02-01T16:00:00Z",
};

processGHLWebhook(samplePayload);
```
