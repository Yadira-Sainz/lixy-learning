#!/bin/bash
# Add 2GB swap to help prevent OOM on low-memory EC2 instances.
# Run with: sudo ./scripts/add-swap.sh

set -e

SWAP_FILE="/swapfile2"
SWAP_SIZE_GB=2

if [ "$EUID" -ne 0 ]; then
  echo "Run with sudo: sudo $0"
  exit 1
fi

if [ -f "$SWAP_FILE" ]; then
  echo "Swap file $SWAP_FILE already exists."
  swapon --show
  exit 0
fi

echo "Creating ${SWAP_SIZE_GB}GB swap file at $SWAP_FILE..."
fallocate -l "${SWAP_SIZE_GB}G" "$SWAP_FILE"
chmod 600 "$SWAP_FILE"
mkswap "$SWAP_FILE"
swapon "$SWAP_FILE"

echo "Adding to /etc/fstab for persistence..."
if ! grep -q "$SWAP_FILE" /etc/fstab; then
  echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
  echo "Added to fstab."
else
  echo "Already in fstab."
fi

echo "Done. Current swap:"
swapon --show
free -h
