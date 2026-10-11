#!/usr/bin/env bash
set -euo pipefail

echo "============================================="
echo " Monk's Dream Jazz Bar POS - Hub Setup Script"
echo "============================================="

if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run as root: sudo ./setup-host.sh"
  exit 1
fi

echo "[1/6] Installing runtime dependencies..."
apt-get update
apt-get install -y chrony avahi-daemon nut ufw ca-certificates curl jq

echo "[2/6] Configuring UFW Firewall for POS LAN..."
ufw default deny incoming
ufw default allow outgoing
ufw allow from 192.168.50.0/24 to any port 443 proto tcp
ufw allow from 192.168.50.0/24 to any port 5353 proto udp
ufw allow from 192.168.50.0/24 to any port 22 proto tcp
ufw --force enable

echo "[3/6] Configuring USB printer udev rule..."
mkdir -p /etc/udev/rules.d
cat << 'EOF' > /etc/udev/rules.d/99-pos-printer.rules
SUBSYSTEM=="usbmisc", KERNEL=="lp*", SYMLINK+="usb/receipt-printer", MODE="0660", GROUP="lp"
EOF
echo 'd /dev/usb 0755 root root -' > /etc/tmpfiles.d/pos-usb.conf
udevadm control --reload-rules || true

echo "[4/6] Configuring Avahi mDNS advertisement..."
mkdir -p /etc/avahi/services
cat << 'EOF' > /etc/avahi/services/monkspos.service
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">Monk's Dream POS Hub (%h)</name>
  <service>
    <type>_monkspos._tcp</type>
    <port>443</port>
    <txt-record>venue=monks-dream</txt-record>
    <txt-record>api=v1</txt-record>
  </service>
</service-group>
EOF
systemctl restart avahi-daemon

echo "[5/6] Setting Hostname..."
hostnamectl set-hostname pos-hub

echo "[6/6] Host provisioning complete! Hub is ready."
