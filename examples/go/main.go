// Usage (from examples/go): go run . student@zcu.cz
// Other location: go run . -data /path/to/domains.json student@zcu.cz
// Batch: go run . -json < inputs.json   (JSON array of strings -> JSON array of [host, match])
//
// A match only says where the address points. Always confirm the mailbox with a one-time code.
// Only the domain is checked: the local part is not validated or escaped, treat the input as untrusted text.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"regexp"
	"strings"
)

var (
	hostRe     = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$`)
	nameAddrRe = regexp.MustCompile(`^(?:"[^"\\]*"|[^<>@,;:"()\\]*)\s*<([^<>]*)>$`)
	schemeRe   = regexp.MustCompile(`^[a-z][a-z0-9+.-]*://`)
	urlBadRe   = regexp.MustCompile(`[\x00-\x20\x7f\\]`)            // these change where a URL's host ends
	mailBadRe  = regexp.MustCompile(`[\x00-\x20\x7f,;<>()"\\\[\]]`) // lists, comments, quotes, IP literals
	portRe     = regexp.MustCompile(`:\d*$`)
)

// isTrim reports the characters JavaScript's String.prototype.trim() removes.
func isTrim(r rune) bool {
	switch {
	case r >= '\t' && r <= '\r', r == ' ', r == 0xa0, r == 0x1680, r >= 0x2000 && r <= 0x200a,
		r == 0x2028, r == 0x2029, r == 0x202f, r == 0x205f, r == 0x3000, r == 0xfeff:
		return true
	}
	return false
}

func load(path string) map[string]struct{} {
	raw, err := os.ReadFile(path)
	if err != nil {
		panic(err)
	}
	var list []string
	if err := json.Unmarshal(raw, &list); err != nil {
		panic(err)
	}
	set := make(map[string]struct{}, len(list))
	for _, d := range list {
		set[d] = struct{}{}
	}
	return set
}

func normalizeHost(h string) string {
	h = strings.TrimSuffix(h, ".")
	// Unicode domains need golang.org/x/net/idna; this example simply refuses them
	if len(h) > 253 || !hostRe.MatchString(h) {
		return ""
	}
	// an IP address is not a domain: the top-level label must contain a letter
	if !strings.ContainsAny(h[strings.LastIndex(h, ".")+1:], "abcdefghijklmnopqrstuvwxyz") {
		return ""
	}
	return h
}

func extractDomain(v string) string {
	if len(v) > 2048 {
		return ""
	}
	s := strings.TrimFunc(v, isTrim)
	for _, r := range s { // ASCII only: avoids Unicode case-mapping and IDNA surprises
		if r > 0x7f {
			return ""
		}
	}
	s = strings.ToLower(s)
	if m := nameAddrRe.FindStringSubmatch(s); m != nil {
		s = strings.TrimFunc(m[1], isTrim)
	}
	if s == "" {
		return ""
	}
	if schemeRe.MatchString(s) {
		if urlBadRe.MatchString(s) {
			return ""
		}
		authority := schemeRe.ReplaceAllString(s, "")
		if i := strings.IndexAny(authority, "/?#"); i >= 0 {
			authority = authority[:i]
		}
		if i := strings.LastIndex(authority, "@"); i >= 0 {
			authority = authority[i+1:]
		}
		return normalizeHost(portRe.ReplaceAllString(authority, ""))
	}
	if strings.HasPrefix(s, "mailto:") {
		s = s[7:]
		if strings.ContainsAny(s, "?#&%,") { // several recipients or extra headers
			return ""
		}
	}
	if mailBadRe.MatchString(s) {
		return ""
	}
	if i := strings.Index(s, "@"); i >= 0 {
		// "school.cz/@evil.example": refuse to guess; several "@" are read differently by mail libraries;
		// ":" is a source route ("@relay:user@school.cz") or group syntax
		if strings.ContainsAny(s, "/?#:") || strings.Count(s, "@") > 1 {
			return ""
		}
		return normalizeHost(s[i+1:])
	}
	if i := strings.IndexAny(s, "/?#"); i >= 0 {
		s = s[:i]
	}
	return normalizeHost(portRe.ReplaceAllString(s, ""))
}

func match(set map[string]struct{}, v string) string {
	host := extractDomain(v)
	if host == "" {
		return ""
	}
	parts := strings.Split(host, ".")
	for i := 0; i < len(parts)-1; i++ { // also matches subdomains
		c := strings.Join(parts[i:], ".")
		if _, ok := set[c]; ok {
			return c
		}
	}
	return ""
}

func orNull(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func main() {
	data := flag.String("data", "../../data/domains.json", "path to domains.json")
	batch := flag.Bool("json", false, "read a JSON array of inputs from stdin, print a JSON array of [host, match]")
	flag.Parse()
	set := load(*data)
	if *batch {
		raw, err := io.ReadAll(os.Stdin)
		if err != nil {
			panic(err)
		}
		var inputs []string
		if err := json.Unmarshal(raw, &inputs); err != nil {
			panic(err)
		}
		out := make([][2]*string, len(inputs))
		for i, v := range inputs {
			out[i] = [2]*string{orNull(extractDomain(v)), orNull(match(set, v))}
		}
		if err := json.NewEncoder(os.Stdout).Encode(out); err != nil {
			panic(err)
		}
		return
	}
	for _, a := range flag.Args() {
		if m := match(set, a); m != "" {
			fmt.Println(a, "->", m)
		} else {
			fmt.Println(a, "-> not a school")
		}
	}
}
