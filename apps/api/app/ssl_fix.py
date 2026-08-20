"""SSL bootstrap for Windows / corporate MITM proxies.

Must run before HTTPS clients (httpx). Kept lazy + time-bounded so a stuck
truststore inject cannot block API startup forever.
"""

from __future__ import annotations

import logging
import threading

_log = logging.getLogger("foundervoice.ssl")
_configured = False
_lock = threading.Lock()


def configure_ssl(timeout_sec: float = 2.5) -> None:
    global _configured
    with _lock:
        if _configured:
            return

        result: dict[str, bool] = {"ok": False}

        def run() -> None:
            try:
                import truststore

                truststore.inject_into_ssl()
                result["ok"] = True
            except Exception as exc:  # noqa: BLE001
                _log.debug("truststore inject skipped: %s", exc)

        t = threading.Thread(target=run, daemon=True, name="fv-ssl-fix")
        t.start()
        t.join(timeout=timeout_sec)
        if t.is_alive():
            _log.warning("SSL truststore inject timed out after %.1fs — using default SSL", timeout_sec)
        _configured = True


def client_ssl_context() -> "ssl.SSLContext":  # noqa: F821 - ssl imported lazily
    """Context for outbound HTTPS clients, preferring the OS trust store.

    The inject above is global, but httpx builds its own context, so clients
    have to ask for this explicitly or they miss the corporate chain.
    """
    import ssl

    configure_ssl()
    try:
        import truststore

        return truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    except Exception as exc:  # noqa: BLE001
        _log.debug("truststore context unavailable: %s", exc)
        return ssl.create_default_context()


# Best-effort at import; never block process forever
configure_ssl()
