# Binaires MASTER précompilés (v6.0.0)

Compilés avec ESP-IDF 6.1 pour ESP32-S3 **N16R8** (16 Mo de flash, PSRAM octale 8 Mo), par exemple YD-ESP32-S3 / DevKitC-1 N16R8.
Pour flasher sans installer ESP-IDF (Python + `pip install esptool`) :

```
esptool --chip esp32s3 -p COM7 -b 460800 write-flash --flash-mode dio --flash-freq 80m --flash-size 16MB ^
  0x0 bootloader.bin 0x8000 partition-table.bin 0x10000 ota_data_initial.bin 0x20000 esp32_lab_master.bin
```
(sous Linux/macOS remplacez `^` par `\` et `COM7` par `/dev/ttyUSB0`.)

Pour une mise à jour d'une carte déjà installée : Réglages › Mises à jour › envoyer `esp32_lab_master.bin`.
Empreintes : `SHA256SUMS.txt`. Pour une autre carte (flash 8 Mo, PSRAM quad), recompilez depuis les sources.
