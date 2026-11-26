#!/usr/bin/env bash
set -euo pipefail
tls_dir="${1:?Specify a temporary certificate directory}"
mkdir -p "$tls_dir"
chmod 700 "$tls_dir"
cat > "$tls_dir/ca.cnf" <<'CNF'
[req]
distinguished_name = dn
x509_extensions = ca_ext
prompt = no
[dn]
CN = TYC XCTest Loopback Root
[ca_ext]
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
CNF
cat > "$tls_dir/leaf.cnf" <<'CNF'
[leaf_ext]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = IP:127.0.0.1,DNS:localhost
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
CNF
openssl req -x509 -sha256 -days 2 -newkey rsa:2048 -nodes -config "$tls_dir/ca.cnf" -keyout "$tls_dir/ca.key" -out "$tls_dir/ca.crt" 2>/dev/null
openssl req -new -sha256 -newkey rsa:2048 -nodes -subj /CN=localhost -keyout "$tls_dir/leaf.key" -out "$tls_dir/leaf.csr" 2>/dev/null
openssl x509 -req -sha256 -days 2 -in "$tls_dir/leaf.csr" -CA "$tls_dir/ca.crt" -CAkey "$tls_dir/ca.key" -CAcreateserial \
  -extfile "$tls_dir/leaf.cnf" -extensions leaf_ext -out "$tls_dir/leaf.crt" 2>/dev/null
