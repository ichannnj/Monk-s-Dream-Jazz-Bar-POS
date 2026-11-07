#!/usr/bin/env bash
set -e

echo "=== Monk's Dream Jazz Bar POS: USB Thermal Printer Driver Fix ==="

# 1. Unload usblp kernel module if loaded
if lsmod | grep -q usblp; then
  echo "[-] Unloading 'usblp' module..."
  rmmod usblp 2>/dev/null || true
fi

# 2. Blacklist usblp permanently so Linux kernel never locks thermal printers on boot/hotplug
echo "[-] Blacklisting 'usblp' in /etc/modprobe.d/blacklist-usblp.conf..."
cat << 'CONF' > /etc/modprobe.d/blacklist-usblp.conf
# Prevents kernel usblp module from locking USB thermal printers,
# allowing Chrome WebUSB / WebSerial to claim interface directly.
blacklist usblp
CONF

# 3. Add udev rules for all USB thermal printers (USB Class 07: Printer)
echo "[-] Creating udev rule in /etc/udev/rules.d/99-usb-thermal-printer.rules..."
cat << 'UDEV' > /etc/udev/rules.d/99-usb-thermal-printer.rules
# Monk's Dream POS Thermal Receipt Printer Permissions
SUBSYSTEM=="usb", ATTR{bInterfaceClass}=="07", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ATTRS{bInterfaceClass}=="07", MODE="0666", GROUP="lp"
SUBSYSTEM=="usb", ENV{DEVTYPE}=="usb_device", MODE="0666"
UDEV

# 4. Reload and trigger udev
echo "[-] Reloading udev rules..."
udevadm control --reload-rules
udevadm trigger

echo "=== SUCCESS! Thermal printers can now connect without interface errors. ==="
