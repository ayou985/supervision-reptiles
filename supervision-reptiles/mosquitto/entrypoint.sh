#!/bin/sh
set -eu
umask 077
DATA=/mosquitto/data
mkdir -p "$DATA"
PASSFILE="$DATA/passwd.new"
mosquitto_passwd -b -c "$PASSFILE" sim "${MQTT_SIM_PASSWORD:-sim-pass}"
mosquitto_passwd -b "$PASSFILE" front "${MQTT_FRONT_PASSWORD:-front-pass}"
mosquitto_passwd -b "$PASSFILE" admin "${MQTT_ADMIN_PASSWORD:-admin-pass}"
while IFS= read -r node; do
  [ -z "$node" ] || mosquitto_passwd -b "$PASSFILE" "$node" "${MQTT_NODE_PASSWORD:-node-pass}"
done < /mosquitto/config/nodes.txt
mv "$PASSFILE" "$DATA/passwd"
chown mosquitto:mosquitto "$DATA/passwd" "$DATA"
exec mosquitto -c /mosquitto/config/mosquitto.conf
