#!/usr/bin/env bash
# Usage: ./check.sh student@zcu.cz   (plain address or domain, exact domain match; needs only grep)
# A match only says where the address points. Always confirm the mailbox with a one-time code.
export LC_ALL=C   # [A-Za-z] means ASCII letters only, whatever the user's locale
re_mail='^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$'
re_host='^[A-Za-z0-9.-]+$'
if [[ $# -ne 1 || ( ! "$1" =~ $re_mail && ! "$1" =~ $re_host ) ]]; then
  printf '%s -> not a school (unsupported input)\n' "${1-}"
  exit 2
fi
d="${1##*@}"
d="${d%.}"
if [[ -n "$d" ]] && grep -qixF -- "$d" "$(dirname "$0")/../../data/domains.txt"; then
  printf '%s -> school\n' "$1"
else
  printf '%s -> not a school\n' "$1"
fi
