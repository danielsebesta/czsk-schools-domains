"""Usage: python check.py student@zcu.cz
       python check.py --json < inputs.json   (JSON array of strings -> JSON array of [host, match])

A match only says where the address points. Always confirm the mailbox with a one-time code.
Only the domain is checked: the local part is not validated or escaped, treat the input as untrusted text.
"""
import json, re, sys
from pathlib import Path

DOMAINS = set(json.loads((Path(__file__).parents[2] / "data" / "domains.json").read_text(encoding="utf-8")))

HOST = re.compile(r"(?=.{1,253}\Z)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+",
                  re.ASCII)
NAME_ADDR = re.compile(r'(?:"[^"\\]*"|[^<>@,;:"()\\]*)\s*<([^<>]*)>')
SCHEME = re.compile(r"[a-z][a-z0-9+.-]*://")
URL_BAD = re.compile(r"[\x00-\x20\x7f\\]")               # these change where a URL's host ends
# lists, comments, quoted local parts, IP literals, Unicode spaces
MAIL_BAD = re.compile(r'[\x00-\x20\x7f,;<>()"\\\[\]\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]')
# invisible and bidi formatting characters: they hide what the user sees and vanish in IDNA processing
INVISIBLE = re.compile("[\u0080-\u009f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f"
                       "\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0\ufff0-\ufffb"
                       "\U0001d173-\U0001d17a\U000e0000-\U000e0fff]")
# the characters JavaScript's String.prototype.trim() removes
TRIM = "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a" \
       "\u2028\u2029\u202f\u205f\u3000\ufeff"


def normalize_host(host: str):
    host = host.lower()
    if not host or INVISIBLE.search(host):
        return None
    if not host.isascii():
        # the standard "idna" codec is IDNA 2003: it maps "\u00df" and "\u03c2" differently from browsers, so refuse them
        if re.search(r"[\\/?#@:%\[\]\s\u00df\u03c2]", host):
            return None
        try:
            host = host.encode("idna").decode("ascii").lower()
        except UnicodeError:
            return None
    host = host.removesuffix(".")  # one trailing dot (the DNS root) is allowed
    # an IP address is not a domain: the top-level label must contain a letter
    return host if HOST.fullmatch(host) and re.search(r"[a-z]", host.rsplit(".", 1)[-1]) else None


def extract_domain(value):
    # 2048 UTF-16 code units, like JavaScript's .length (characters above U+FFFF count twice)
    if not isinstance(value, str) or len(value) > 2048 or len(value) + sum(ord(c) > 0xFFFF for c in value) > 2048:
        return None
    s = value.strip(TRIM).lower()
    m = NAME_ADDR.fullmatch(s)
    if m:
        s = m.group(1).strip(TRIM)
    if not s or INVISIBLE.search(s):
        return None
    if SCHEME.match(s):
        if URL_BAD.search(s):
            return None
        authority = re.split(r"[/?#]", SCHEME.sub("", s, count=1), maxsplit=1)[0]
        return normalize_host(re.sub(r":\d*\Z", "", authority.rsplit("@", 1)[-1]))
    if s.startswith("mailto:"):
        s = s[7:]
        if re.search(r"[?#&%,]", s):  # several recipients or extra headers
            return None
    if MAIL_BAD.search(s):
        return None
    if "@" in s:
        # "school.cz/@evil.example": e-mail or URL? refuse to guess; several "@" are read differently by mailers;
        # ":" is a source route ("@relay:user@school.cz") or group syntax
        if re.search(r"[/?#:]", s) or s.count("@") > 1:
            return None
        return normalize_host(s.split("@", 1)[1])
    return normalize_host(re.sub(r":\d*\Z", "", re.split(r"[/?#]", s, maxsplit=1)[0]))


def match_school(value):
    host = extract_domain(value)
    if not host:
        return None
    parts = host.split(".")
    for i in range(len(parts) - 1):  # also matches subdomains
        cand = ".".join(parts[i:])
        if cand in DOMAINS:
            return cand
    return None


if __name__ == "__main__":
    if sys.argv[1:] == ["--json"]:
        inputs = json.loads(sys.stdin.buffer.read().decode("utf-8"))
        sys.stdout.write(json.dumps([[extract_domain(v), match_school(v)] for v in inputs]))
    else:
        for arg in sys.argv[1:]:
            print(arg, "->", match_school(arg) or "not a school")
