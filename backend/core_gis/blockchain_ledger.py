"""
Blockchain-Anchored Immutable Audit Ledger.
Cryptographically signs and chains disaster alerts, administrative sign-offs,
and evacuation orders to prevent post-disaster tampering and ensure accountability.
"""

import hashlib
import json
from datetime import datetime
from database import get_connection

def calculate_block_hash(index: int, timestamp: str, event_type: str, payload_json: str, prev_hash: str, nonce: int = 0) -> str:
    content = f"{index}:{timestamp}:{event_type}:{payload_json}:{prev_hash}:{nonce}"
    return hashlib.sha256(content.encode()).hexdigest()

def record_audit_event(event_type: str, payload: dict) -> dict:
    """
    Appends a new cryptographically chained block to the audit ledger.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT block_index, current_hash FROM blockchain_blocks ORDER BY block_index DESC LIMIT 1")
    last_block = cursor.fetchone()

    if last_block:
        new_index = last_block["block_index"] + 1
        prev_hash = last_block["current_hash"]
    else:
        new_index = 0
        prev_hash = "0" * 64

    timestamp = datetime.utcnow().isoformat()
    payload_str = json.dumps(payload, sort_keys=True)
    curr_hash = calculate_block_hash(new_index, timestamp, event_type, payload_str, prev_hash)

    cursor.execute("""
    INSERT INTO blockchain_blocks (block_index, timestamp, event_type, payload_json, previous_hash, current_hash, nonce)
    VALUES (?, ?, ?, ?, ?, ?, 0)
    """, (new_index, timestamp, event_type, payload_str, prev_hash, curr_hash))

    conn.commit()
    conn.close()

    return {
        "block_index": new_index,
        "timestamp": timestamp,
        "event_type": event_type,
        "current_hash": curr_hash,
        "previous_hash": prev_hash
    }

def get_audit_trail():
    """
    Returns entire ledger and verifies chain integrity.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM blockchain_blocks ORDER BY block_index ASC")
    rows = cursor.fetchall()
    conn.close()

    blocks = []
    is_valid = True
    prev_hash_expected = "0" * 64

    for i, r in enumerate(rows):
        payload_data = json.loads(r["payload_json"])
        # Verify hash
        computed_hash = calculate_block_hash(
            r["block_index"], r["timestamp"], r["event_type"], r["payload_json"], r["previous_hash"], r["nonce"]
        )
        hash_matches = (computed_hash == r["current_hash"])
        chain_linked = (i == 0) or (r["previous_hash"] == prev_hash_expected)

        if not (hash_matches and chain_linked):
            is_valid = False

        blocks.append({
            "block_index": r["block_index"],
            "timestamp": r["timestamp"],
            "event_type": r["event_type"],
            "payload": payload_data,
            "previous_hash": r["previous_hash"],
            "current_hash": r["current_hash"],
            "verified": hash_matches and chain_linked
        })
        prev_hash_expected = r["current_hash"]

    return {
        "ledger_verified": is_valid,
        "total_blocks": len(blocks),
        "blocks": blocks[::-1] # return latest first for display
    }
