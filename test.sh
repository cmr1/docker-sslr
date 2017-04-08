#!/bin/bash

set -e

sudo su -

cert_dir=`pwd`/certs/$DOMAIN
expected_files="cert.pem privkey.pem chain.pem fullchain.pem"

if [ ! -d $cert_dir ]; then
  echo "Missing certificate directory: $cert_dir"

  exit 1
fi

for f in $expected_files; do
  if [ ! -f $cert_dir/$f ]; then
    echo "Missing certificate file: $cert_dir/$f"

    exit 1
  fi
done
