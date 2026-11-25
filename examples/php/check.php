<?php
// Usage: php check.php student@zcu.cz
//        php check.php --json < inputs.json   (JSON array of strings -> JSON array of [host, match])
// A match only says where the address points. Always confirm the mailbox with a one-time code.
// Only the domain is checked: the local part is not validated or escaped, treat the input as untrusted text.
$domains = array_flip(json_decode(file_get_contents(__DIR__ . '/../../data/domains.json'), true));

const HOST_RE = '/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/D';
// the characters JavaScript's String.prototype.trim() removes
const TRIM_RE = '/^[\x{9}-\x{d}\x{20}\x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}]+'
    . '|[\x{9}-\x{d}\x{20}\x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}]+$/uD';
// invisible and bidi formatting characters: they hide what the user sees and vanish in IDNA processing
const INVISIBLE_RE = '/[\x{80}-\x{9f}\x{ad}\x{34f}\x{61c}\x{115f}\x{1160}\x{17b4}\x{17b5}\x{180b}-\x{180f}\x{200b}-\x{200f}'
    . '\x{202a}-\x{202e}\x{2060}-\x{206f}\x{3164}\x{fe00}-\x{fe0f}\x{feff}\x{ffa0}\x{fff0}-\x{fffb}\x{1d173}-\x{1d17a}'
    . '\x{e0000}-\x{e0fff}]/u';

// preg_* return false on errors (invalid UTF-8, backtracking limit): every check below fails closed
function jsTrim(string $s): ?string {
    $t = preg_replace(TRIM_RE, '', $s);
    return is_string($t) ? $t : null;
}

function normalizeHost(string $host): ?string {
    $host = strtolower($host);
    if ($host === ''|| preg_match(INVISIBLE_RE, $host) !== 0) return null;
    if (preg_match('/[^\x00-\x7f]/', $host)) {
        // Unicode domain: convert with ext-intl when available, otherwise refuse
        if (!function_exists('idn_to_ascii') || preg_match('/[\\\\\/?#@:%\[\]\s]/u', $host) !== 0) return null;
        $host = idn_to_ascii($host, IDNA_NONTRANSITIONAL_TO_ASCII | IDNA_USE_STD3_RULES | IDNA_CHECK_BIDI
            | IDNA_CHECK_CONTEXTJ, INTL_IDNA_VARIANT_UTS46);
        if ($host === false) return null;
        $host = strtolower($host);
    }
    if (str_ends_with($host, '.')) $host = substr($host, 0, -1);    // one trailing dot (the DNS root) is allowed
    // an IP address is not a domain: the top-level label must contain a letter
    return preg_match(HOST_RE, $host) === 1 && preg_match('/[a-z]/', substr($host, strrpos($host, '.') + 1)) === 1
        ? $host : null;
}

function extractDomain($value): ?string {
    if (!is_string($value) || strlen($value) > 2048) return null;
    $s = jsTrim($value);
    if ($s === null) return null;
    $s = strtolower($s);
    $named = preg_match('/^(?:"[^"\\\\]*"|[^<>@,;:"()\\\\]*)\s*<([^<>]*)>$/D', $s, $m);
    if ($named === false) return null;
    if ($named === 1) {
        $s = jsTrim($m[1]);
        if ($s === null) return null;
    }
    if ($s === '' || preg_match(INVISIBLE_RE, $s) !== 0) return null;
    if (preg_match('#^[a-z][a-z0-9+.-]*://#', $s)) {
        if (preg_match('/[\x00-\x20\x7f\\\\]/', $s) !== 0) return null;   // these change where a URL's host ends
        $authority = preg_split('#[/?\#]#', preg_replace('#^[a-z][a-z0-9+.-]*://#', '', $s))[0];
        $at = strrpos($authority, '@');
        $host = $at === false ? $authority : substr($authority, $at + 1);
        return normalizeHost(preg_replace('/:\d*$/D', '', $host));
    }
    if (str_starts_with($s, 'mailto:')) {
        $s = substr($s, 7);
        if (preg_match('/[?#&%,]/', $s) !== 0) return null;             // several recipients or extra headers
    }
    // lists, comments, quoted local parts, IP literals, Unicode spaces
    if (preg_match('/[\x00-\x20\x7f,;<>()"\\\\\[\]\x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}]/u', $s) !== 0) return null;
    $at = strpos($s, '@');
    if ($at !== false) {
        // "school.cz/@evil.example": refuse to guess; several "@" are read differently by mail libraries;
        // ":" is a source route ("@relay:user@school.cz") or group syntax
        if (preg_match('#[/?\#:]#', $s) !== 0 || substr_count($s, '@') > 1) return null;
        return normalizeHost(substr($s, $at + 1));
    }
    return normalizeHost(preg_replace('/:\d*$/D', '', preg_split('#[/?\#]#', $s)[0]));
}

function matchSchool(array $domains, $value): ?string {
    $host = extractDomain($value);
    if ($host === null) return null;
    $parts = explode('.', $host);
    for ($i = 0; $i < count($parts) - 1; $i++) {                    // also matches subdomains
        $c = implode('.', array_slice($parts, $i));
        if (isset($domains[$c])) return $c;
    }
    return null;
}

if (array_slice($argv, 1) === ['--json']) {
    $inputs = json_decode(stream_get_contents(STDIN), true, 4, JSON_THROW_ON_ERROR);
    echo json_encode(array_map(fn($v) => [extractDomain($v), matchSchool($domains, $v)], $inputs), JSON_THROW_ON_ERROR);
} else {
    foreach (array_slice($argv, 1) as $arg) {
        echo $arg, ' -> ', matchSchool($domains, $arg) ?? 'not a school', PHP_EOL;
    }
}
