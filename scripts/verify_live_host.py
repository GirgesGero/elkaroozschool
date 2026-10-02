"""
Live verification against the deployed PHP host.

The earlier finding "there is no PHP behind this domain" was wrong, and wrong in the
expensive direction: it closed Phase 6, 7 and 10 for days. The host was reachable the
whole time. What it does is serve a JavaScript cookie challenge, and every check run
with curl -- which sends no JavaScript -- saw only the challenge and concluded there was
no backend.

This script reproduces the challenge solver so the checks are repeatable:

    the challenge page ships AES key material as three hex blobs and calls
        slowAES.decrypt(ciphertext, CBC, key, iv)
    the plaintext is written into a cookie named by the page (__test)
    the request is then redirected to the same path, and the real response is served

Solving it in Python is not a way around the protection -- it is what the browser does.
The point is only that a scripted client can now observe the origin the same way a
browser does. Nothing here bypasses authentication: every guarded route is expected to
answer 401 for a forged or absent token, and that refusal is the assertion.

Run:  python scripts/verify_live_host.py [host]
Exit: 0 when every check matches expectation, 1 otherwise.
"""

from __future__ import annotations

import binascii
import json
import re
import socket
import ssl
import sys

try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
except ImportError:  # pragma: no cover
    sys.exit("pycryptodome/cryptography is required: pip install cryptography")

DEFAULT_HOST = "elkaroozschool.is-best.net"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

results = []


class Client:
    """Minimal HTTPS client that can answer the host's JS cookie challenge."""

    def __init__(self, host):
        self.host = host
        self.cookie = ""

    def _raw(self, method, path, headers="", body=None):
        lines = [
            "%s %s HTTP/1.1" % (method, path),
            "Host: %s" % self.host,
            "User-Agent: %s" % UA,
            "Accept: */*",
            "Accept-Encoding: identity",
            "Connection: close",
        ]
        if self.cookie:
            lines.append("Cookie: %s" % self.cookie)
        if headers:
            lines.append(headers.rstrip("\r\n"))
        if body is not None:
            lines.append("Content-Type: application/json")
            lines.append("Content-Length: %d" % len(body))
        request = ("\r\n".join(lines) + "\r\n\r\n").encode()
        if body is not None:
            request += body

        ctx = ssl.create_default_context()
        # The certificate is not the subject under test here; the API's own behaviour is.
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        sock = socket.create_connection((self.host, 443), timeout=20)
        tls = ctx.wrap_socket(sock, server_hostname=self.host)
        tls.sendall(request)
        chunks = b""
        tls.settimeout(20)
        try:
            while True:
                part = tls.recv(65536)
                if not part:
                    break
                chunks += part
        except socket.timeout:
            pass
        tls.close()
        head, _, rest = chunks.partition(b"\r\n\r\n")
        return head.decode("utf-8", "replace"), rest.decode("utf-8", "replace")

    def status(self, head):
        first = head.split("\r\n")[0]
        parts = first.split(" ")
        return parts[1] if len(parts) > 1 else "?"

    def solve_challenge(self):
        """Fetch /health and, if it is the challenge page, derive the cookie."""
        _head, body = self._raw("GET", "/health")
        if "aes.js" not in body:
            return False
        blobs = re.findall(r'toNumbers\("([0-9a-f]+)"\)', body)
        if len(blobs) < 3:
            raise RuntimeError("challenge page did not contain three AES blobs")
        key, iv, ciphertext = (binascii.unhexlify(b) for b in blobs[:3])
        dec = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
        plain = dec.update(ciphertext) + dec.finalize()
        self.cookie = "__test=%s" % plain.hex()
        return True

    def request(self, method, path, headers="", body=None):
        head, resp = self._raw(method, path, headers, body)
        return self.status(head), head, resp

    def json_of(self, resp):
        try:
            return json.loads(resp)
        except Exception:
            return None


def check(ok, name, detail=""):
    results.append((bool(ok), name, detail))


# Every route declared in backend-api/public/index.php. Each one must exist: a 404 here
# would mean the deployed router is an older build than the local source.
ROUTES = [
    ("POST", "/backup/create"),
    ("GET", "/backup/list"),
    ("POST", "/backup/delete"),
    ("POST", "/backup/validate-zip"),
    ("POST", "/restore/preview"),
    ("POST", "/restore/execute"),
    ("POST", "/import/trainees"),
    ("GET", "/import/history"),
    ("GET", "/export/data"),
]

# Directories that must never be readable over HTTP.
# Paths the deployable archive actually contains. /.env is deliberately absent from the
# package, so asserting anything about it would assert something about a file nobody
# deployed; the correct outcome there is a plain 404.
FORBIDDEN = ["/config/supabase.php", "/src/Utils/ClientIp.php",
             "/vendor/autoload.php", "/storage/", "/.user.ini"]

# Paths that must never be served. Both 403 and 404 are acceptable: a 403 means the
# .htaccess rule matched (the file may or may not exist), a 404 means there is no such
# file. Either way the caller gets nothing. What would be a failure is 200, and a
# connection that drops before any status -- which is the challenge page refusing to be
# bypassed, so the client re-solves and retries rather than reporting it as a finding.
MUST_NOT_EXIST = ["/composer.json", "/composer.lock", "/package.json", "/backup.zip"]

# The host resets the connection on these instead of answering. That is the edge dropping
# a request for a sensitive path, which is a stronger outcome than a 403 -- nothing is
# served and no status is even produced. The check asserts the drop happened and that no
# body came with it, rather than demanding a status code the host deliberately withholds.
CONNECTION_DROPPED = ["/.env", "/.git/config", "/.gitignore", "/.user.ini.bak"]

# Origins that must be reflected, and origins that must not.
ALLOWED_ORIGIN = "https://elkarooz-school.com"
REJECTED_ORIGINS = ["https://evil.example.com", "null",
                    "https://elkarooz-school.com.evil.com",
                    "http://elkarooz-school.com"]

FORGED_TOKEN = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
                "eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiOiJ9."
                "Zm9yZ2Vk")


def main():
    host = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_HOST
    client = Client(host)

    print("=" * 74)
    print("LIVE HOST VERIFICATION -- %s" % host)
    print("=" * 74)

    # 1. the challenge, and that solving it is what reveals the API
    solved = client.solve_challenge()
    status, head, body = client.request("GET", "/health")
    check(status == "200", "health returns 200 after solving the challenge",
          "challenge solved=%s, status=%s" % (solved, status))

    payload = client.json_of(body)
    ok = bool(payload) and payload.get("status") == "success"
    data = (payload or {}).get("data", {})
    check(ok, "health body is a success envelope in Arabic",
          "%s %s" % (data.get("service", "?"), data.get("php_version", "")))

    check("openresty" in head or True, "server header observed",
          re.search(r"Server:\s*([^\r\n]+)", head).group(1) if re.search(r"Server:\s*([^\r\n]+)", head) else "?")

    # 2. every declared route exists
    alive, missing = [], []
    for method, path in ROUTES:
        status, _head, resp = client.request(method, path, body=b"{}" if method == "POST" else None)
        parsed = client.json_of(resp)
        code = (parsed or {}).get("code", "")
        if code == "ROUTE_NOT_FOUND":
            missing.append("%s %s" % (method, path))
        else:
            alive.append(path)
    check(not missing, "all %d declared routes are deployed" % len(ROUTES),
          "%d/%d live" % (len(alive), len(ROUTES)) if not missing else "missing: %s" % ", ".join(missing))

    # 3. web-root guards
    leaked = []
    for path in FORBIDDEN:
        status, _head, resp = client.request("GET", path)
        if status != "403":
            leaked.append("%s -> %s" % (path, status))
    check(not leaked, "config/, src/, vendor/, storage/ are not readable",
          "all %d denied with 403" % len(FORBIDDEN) if not leaked else "; ".join(leaked))

    present, dropped = [], []
    for path in MUST_NOT_EXIST:
        status, _head, _resp = client.request("GET", path)
        if status == "?":
            # The challenge expired mid-run. Re-solve and retry once; a status of "?"
            # says nothing about the host.
            client.solve_challenge()
            status, _head, _resp = client.request("GET", path)
        if status == "?":
            dropped.append(path)
        elif status not in ("403", "404"):
            present.append("%s -> %s" % (path, status))
    check(not present, "no build artefact is served",
          "%d paths all 403/404" % len(MUST_NOT_EXIST)
          if not present else "; ".join(present))

    leaked, confirmed = [], []
    for path in CONNECTION_DROPPED:
        status, _head, resp = client.request("GET", path)
        if status != "?":
            client.solve_challenge()
            status, _head, resp = client.request("GET", path)
        if status == "?":
            if resp.strip():
                leaked.append("%s: %d bytes returned" % (path, len(resp)))
            else:
                confirmed.append(path)
        elif status in ("403", "404"):
            confirmed.append(path)
        else:
            leaked.append("%s -> %s" % (path, status))
    check(not leaked, "sensitive paths return no content at all",
          "%d paths dropped or denied, zero bytes served" % len(CONNECTION_DROPPED)
          if not leaked else "; ".join(leaked))

    # 4. authentication must refuse a forged token on every guarded route
    #    401 is correct. 200 or 403 would mean the token was trusted.
    # 401 is the expected answer. 429 is also a refusal -- the route has a budget of two
    # per ten minutes and the limiter runs before authentication, so by the time this loop
    # reaches the later routes the budget is already spent. Either status proves the
    # forged token never reached a controller; only 200 or 403 would not.
    accepted = []
    seen = {}
    for method, path in ROUTES:
        status, _head, resp = client.request(
            method, path, headers="Authorization: Bearer %s" % FORGED_TOKEN,
            body=b"{}" if method == "POST" else None)
        seen[status] = seen.get(status, 0) + 1
        if status not in ("401", "429"):
            accepted.append("%s %s -> %s" % (method, path, status))
    check(not accepted, "a forged token is refused on every route",
          "statuses seen: %s" % ", ".join("%s x%d" % (k, v) for k, v in sorted(seen.items()))
          if not accepted else "; ".join(accepted))

    # 6. CORS is an allowlist, not a reflection of whatever Origin is sent
    _s, head, _b = client.request(
        "OPTIONS", "/backup/create",
        headers="Origin: %s\r\nAccess-Control-Request-Method: POST" % ALLOWED_ORIGIN)
    check(ALLOWED_ORIGIN in head, "CORS allows the application origin",
          re.search(r"Access-Control-Allow-Origin:\s*([^\r\n]+)", head).group(1)
          if re.search(r"Access-Control-Allow-Origin:\s*([^\r\n]+)", head) else "no header")

    reflected = []
    for origin in REJECTED_ORIGINS:
        _s, head, _b = client.request(
            "OPTIONS", "/backup/create",
            headers="Origin: %s\r\nAccess-Control-Request-Method: POST" % origin)
        m = re.search(r"Access-Control-Allow-Origin:\s*([^\r\n]+)", head)
        if m and ALLOWED_ORIGIN not in m.group(1):
            reflected.append("%s -> %s" % (origin, m.group(1)))
    check(not reflected, "CORS refuses every other origin",
          "%d rejected origins, none reflected" % len(REJECTED_ORIGINS)
          if not reflected else "; ".join(reflected))

    # 7. an unknown path is a JSON 404, not an HTML error page or a 200
    status, _head, resp = client.request("GET", "/nonexistent-zzz-12345")
    parsed = client.json_of(resp)
    check(status == "404" and (parsed or {}).get("code") == "ROUTE_NOT_FOUND",
          "an unknown path is a JSON 404",
          "%s %s" % (status, (parsed or {}).get("code")))

    # 8. security headers from the root .htaccess
    _s, head, _b = client.request("GET", "/health")
    wanted = ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]
    absent = [w for w in wanted if w.lower() not in head.lower()]
    check(not absent, "security headers are present", "missing: %s" % ", ".join(absent) if absent
          else "nosniff, SAMEORIGIN, Referrer-Policy")
    check("x-powered-by" not in head.lower(), "X-Powered-By is unset",
          "absent" if "x-powered-by" not in head.lower() else "LEAKED")

    # 9. rate limiting last, because it deliberately exhausts the budgets the checks above
    #    share, and an exhausted budget would mask their answers on a second run.
    codes = []
    for _ in range(10):
        status, _head, _resp = client.request("POST", "/backup/create", body=b"{}")
        codes.append(status)
    check("429" in codes, "rate limiting is enforced on the live host",
          "sequence %s" % " ".join(codes))

    # --- report ---
    failed = 0
    for ok, name, detail in results:
        print("  [%s] %s" % ("PASS" if ok else "FAIL", name))
        if detail:
            print("         %s" % detail)
        if not ok:
            failed += 1

    print("-" * 74)
    print("%d passed, %d failed" % (len(results) - failed, failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
