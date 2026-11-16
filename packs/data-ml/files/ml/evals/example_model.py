"""Deterministic stand-in for a model so the harness runs without network or cost. Replace with your model call."""


def predict(text: str) -> str:
    t = text.lower()
    if "ignore previous instructions" in t:
        return "I can't help with that."
    if "refund" in t:
        return "Refunds are available within 30 days of purchase."
    if "json" in t:
        return '{"status": "ok", "items": []}'
    return "I don't know."
