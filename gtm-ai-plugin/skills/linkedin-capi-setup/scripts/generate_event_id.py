#!/usr/bin/env python3
"""
LinkedIn CAPI Event ID Generator

Generates unique event IDs for LinkedIn Conversions API deduplication.
Event ID must be identical between client-side Insight Tag and server-side CAPI Tag.

Usage:
    # Python (server-side)
    from generate_event_id import generate_event_id
    event_id = generate_event_id("purchase", "user123", 1703980800)
    
    # JavaScript (client-side) - equivalent logic
    function generateEventId(eventName, userId, timestamp) {
        const raw = `${eventName}_${userId}_${timestamp}`;
        return btoa(raw).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }
"""

import base64
import hashlib
import time
import uuid
from typing import Optional


def generate_event_id(
    event_name: str,
    user_identifier: Optional[str] = None,
    timestamp: Optional[int] = None,
    method: str = "hash"
) -> str:
    """
    Generate a unique event ID for LinkedIn CAPI deduplication.
    
    Args:
        event_name: The conversion event name (e.g., "purchase", "lead", "signup")
        user_identifier: Optional user ID, email hash, or session ID for consistency
        timestamp: Optional Unix timestamp (defaults to current time)
        method: Generation method - "hash" (deterministic) or "uuid" (random)
    
    Returns:
        A unique event ID string (max 64 characters, alphanumeric)
    """
    if timestamp is None:
        timestamp = int(time.time())
    
    if method == "uuid":
        unique_part = uuid.uuid4().hex
        return f"{event_name}_{unique_part}"[:64]
    else:
        raw_string = f"{event_name}_{user_identifier or 'anonymous'}_{timestamp}"
        hash_digest = hashlib.sha256(raw_string.encode()).hexdigest()
        return hash_digest[:32]


def generate_event_id_js() -> str:
    """Returns JavaScript code for client-side event ID generation."""
    return '''
function() {
    var eventName = {{Event Name}} || 'conversion';
    var userId = {{User ID}} || {{Client ID}} || 'anonymous';
    var timestamp = Math.floor(Date.now() / 1000);
    
    var raw = eventName + '_' + userId + '_' + timestamp;
    
    var hash = 0;
    for (var i = 0; i < raw.length; i++) {
        var char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    var hexHash = Math.abs(hash).toString(16);
    return (hexHash + timestamp.toString(16)).substring(0, 32);
}
'''


if __name__ == "__main__":
    print("=== LinkedIn Event ID Generator ===")
    event_id = generate_event_id("purchase", "user@example.com")
    print(f"Hash-based event ID: {event_id}")
