# Catalogue des projets — 320 projets

219 capteurs et modules, 52 projets complets, 49 classiques. Chaque projet est dans `projects/LIBRARY/<id>/` (`.ino`, `README.md` avec câblage et bibliothèques, `project.json`) et dans l'onglet **Bibliothèque** de l'interface.

## Température, humidité & pression (29)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| DHT11 | `dht11` | ESP32, ESP32-S3, ESP32-C3 | DHT sensor library, Adafruit Unified Sensor |
| DHT22 / AM2302 | `dht22` | ESP32, ESP32-S3, ESP32-C3 | DHT sensor library, Adafruit Unified Sensor |
| DHT21 / AM2301 | `dht21` | ESP32, ESP32-S3, ESP32-C3 | DHT sensor library, Adafruit Unified Sensor |
| DS18B20 | `ds18b20` | ESP32, ESP32-S3, ESP32-C3 | OneWire, DallasTemperature |
| BME280 | `bme280` | ESP32, ESP32-S3, ESP32-C3 | Adafruit BME280 Library, Adafruit Unified Sensor, Adafruit BusIO |
| BMP280 | `bmp280` | ESP32, ESP32-S3, ESP32-C3 | Adafruit BMP280 Library, Adafruit Unified Sensor, Adafruit BusIO |
| BMP180 / BMP085 | `bmp180` | ESP32, ESP32-S3, ESP32-C3 | Adafruit BMP085 Library, Adafruit BusIO |
| BMP388 / BMP390 | `bmp388` | ESP32, ESP32-S3, ESP32-C3 | Adafruit BMP3XX Library, Adafruit Unified Sensor, Adafruit BusIO |
| SHT31 | `sht31` | ESP32, ESP32-S3, ESP32-C3 | Adafruit SHT31 Library, Adafruit BusIO |
| SHT40 / SHT41 / SHT45 | `sht4x` | ESP32, ESP32-S3, ESP32-C3 | Adafruit SHT4x Library, Adafruit Unified Sensor, Adafruit BusIO |
| AHT10 / AHT20 / AHT21 | `aht20` | ESP32, ESP32-S3, ESP32-C3 | Adafruit AHTX0, Adafruit Unified Sensor, Adafruit BusIO |
| HTU21D / SHT21 / Si7021 (GY-21) | `htu21d` | ESP32, ESP32-S3, ESP32-C3 | Adafruit HTU21DF Library, Adafruit BusIO |
| Si7021 | `si7021` | ESP32, ESP32-S3, ESP32-C3 | Adafruit Si7021 Library, Adafruit BusIO |
| HDC1080 | `hdc1080` | ESP32, ESP32-S3, ESP32-C3 | — |
| MCP9808 | `mcp9808` | ESP32, ESP32-S3, ESP32-C3 | Adafruit MCP9808 Library, Adafruit BusIO |
| TMP102 | `tmp102` | ESP32, ESP32-S3, ESP32-C3 | — |
| LM75 / LM75A | `lm75` | ESP32, ESP32-S3, ESP32-C3 | — |
| TMP117 | `tmp117` | ESP32, ESP32-S3, ESP32-C3 | Adafruit TMP117, Adafruit Unified Sensor, Adafruit BusIO |
| LM35 | `lm35` | ESP32, ESP32-S3, ESP32-C3 | — |
| TMP36 | `tmp36` | ESP32, ESP32-S3, ESP32-C3 | — |
| Thermistance CTN 10 kΩ | `ntc` | ESP32, ESP32-S3, ESP32-C3 | — |
| MAX6675 + thermocouple K | `max6675` | ESP32, ESP32-S3, ESP32-C3 | — |
| MAX31855 + thermocouple K | `max31855` | ESP32, ESP32-S3, ESP32-C3 | Adafruit MAX31855 library |
| MAX31865 + sonde PT100 | `max31865` | ESP32, ESP32-S3, ESP32-C3 | Adafruit MAX31865 library, Adafruit BusIO |
| MLX90614 (thermomètre infrarouge) | `mlx90614` | ESP32, ESP32-S3, ESP32-C3 | Adafruit MLX90614 Library, Adafruit BusIO |
| AMG8833 (caméra thermique 8×8) | `amg8833` | ESP32, ESP32-S3, ESP32-C3 | Adafruit AMG88xx Library, Adafruit BusIO |
| DPS310 | `dps310` | ESP32, ESP32-S3, ESP32-C3 | Adafruit DPS310, Adafruit Unified Sensor, Adafruit BusIO |
| LPS22HB | `lps22` | ESP32, ESP32-S3, ESP32-C3 | Adafruit LPS2X, Adafruit Unified Sensor, Adafruit BusIO |
| MS5611 (GY-63) | `ms5611` | ESP32, ESP32-S3, ESP32-C3 | MS5611 |

## Qualité de l'air & CO₂ (12)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| BME680 | `bme680` | ESP32, ESP32-S3, ESP32-C3 | Adafruit BME680 Library, Adafruit Unified Sensor, Adafruit BusIO |
| SCD30 (CO₂ NDIR) | `scd30` | ESP32, ESP32-S3, ESP32-C3 | Adafruit SCD30, Adafruit Unified Sensor, Adafruit BusIO |
| SCD40 / SCD41 (CO₂ photoacoustique) | `scd40` | ESP32, ESP32-S3, ESP32-C3 | — |
| CCS811 (eCO₂ / COVT) | `ccs811` | ESP32, ESP32-S3, ESP32-C3 | Adafruit CCS811 Library, Adafruit BusIO |
| SGP30 (eCO₂ / COVT) | `sgp30` | ESP32, ESP32-S3, ESP32-C3 | Adafruit SGP30 Sensor, Adafruit BusIO |
| SGP40 (indice COV) | `sgp40` | ESP32, ESP32-S3, ESP32-C3 | Adafruit SGP40 Sensor, Adafruit BusIO |
| ENS160 (AQI / eCO₂ / COVT) | `ens160` | ESP32, ESP32-S3, ESP32-C3 | — |
| MH-Z19B / MH-Z19C (CO₂ NDIR) | `mhz19` | ESP32, ESP32-S3, ESP32-C3 | — |
| SenseAir S8 (CO₂ NDIR) | `senseair_s8` | ESP32, ESP32-S3, ESP32-C3 | — |
| PMS5003 / PMS7003 (particules fines) | `pms5003` | ESP32, ESP32-S3, ESP32-C3 | — |
| SDS011 (particules fines) | `sds011` | ESP32, ESP32-S3, ESP32-C3 | — |
| Sharp GP2Y1010AU0F (poussière) | `gp2y1010` | ESP32, ESP32-S3, ESP32-C3 | — |

## Gaz (série MQ) (9)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| MQ-2 (fumée, GPL, butane) | `mq2` | ESP32, ESP32-S3, ESP32-C3 | — |
| MQ-3 (alcool) | `mq3` | ESP32, ESP32-S3, ESP32-C3 | — |
| MQ-4 (méthane, gaz naturel) | `mq4` | ESP32, ESP32-S3, ESP32-C3 | — |
| MQ-5 (GPL, gaz de ville) | `mq5` | ESP32, ESP32-S3, ESP32-C3 | — |
| MQ-6 (GPL, butane) | `mq6` | ESP32, ESP32-S3, ESP32-C3 | — |
| MQ-7 (monoxyde de carbone) | `mq7` | ESP32, ESP32-S3, ESP32-C3 | — |
| MQ-8 (hydrogène) | `mq8` | ESP32, ESP32-S3, ESP32-C3 | — |
| MQ-9 (CO, gaz inflammables) | `mq9` | ESP32, ESP32-S3, ESP32-C3 | — |
| MQ-135 (qualité de l'air) | `mq135` | ESP32, ESP32-S3, ESP32-C3 | — |

## Météo, sol & UV (14)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Capteur de pluie FC-37 / YL-83 | `rain` | ESP32, ESP32-S3, ESP32-C3 | — |
| Humidité du sol capacitive v1.2 | `soil_cap` | ESP32, ESP32-S3, ESP32-C3 | — |
| Humidité du sol résistive YL-69 / FC-28 | `soil_res` | ESP32, ESP32-S3, ESP32-C3 | — |
| Capteur de niveau d'eau (pistes) | `water_level` | ESP32, ESP32-S3, ESP32-C3 | — |
| Interrupteur à flotteur | `float_switch` | ESP32, ESP32-S3, ESP32-C3 | — |
| GUVA-S12SD (UV) | `guva_s12sd` | ESP32, ESP32-S3, ESP32-C3 | — |
| ML8511 (UV) | `ml8511` | ESP32, ESP32-S3, ESP32-C3 | — |
| VEML6070 (UV-A) | `veml6070` | ESP32, ESP32-S3, ESP32-C3 | Adafruit VEML6070 Library |
| LTR390 (UV + lumière) | `ltr390` | ESP32, ESP32-S3, ESP32-C3 | Adafruit LTR390 Library, Adafruit BusIO |
| SI1145 / SI1151 (UV, visible, IR) | `si1145` | ESP32, ESP32-S3, ESP32-C3 | Adafruit SI1145 Library, Adafruit BusIO |
| Anémomètre à impulsions | `anemometer` | ESP32, ESP32-S3, ESP32-C3 | — |
| Girouette à résistances | `wind_vane` | ESP32, ESP32-S3, ESP32-C3 | — |
| Pluviomètre à auget | `rain_gauge` | ESP32, ESP32-S3, ESP32-C3 | — |
| Adafruit STEMMA Soil Sensor (seesaw) | `stemma_soil` | ESP32, ESP32-S3, ESP32-C3 | Adafruit seesaw Library, Adafruit BusIO |

## Eau & aquariophilie (4)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Sonde pH (module PH-4502C / SEN0161) | `ph` | ESP32, ESP32-S3, ESP32-C3 | — |
| Sonde TDS (conductivité) | `tds` | ESP32, ESP32-S3, ESP32-C3 | — |
| Capteur de turbidité | `turbidity` | ESP32, ESP32-S3, ESP32-C3 | — |
| Débitmètre YF-S201 | `flow_yfs201` | ESP32, ESP32-S3, ESP32-C3 | — |

## Lumière, couleur & infrarouge (15)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Photorésistance (LDR / GL5528) | `ldr` | ESP32, ESP32-S3, ESP32-C3 | — |
| Module photorésistance KY-018 / LM393 | `ldr_module` | ESP32, ESP32-S3, ESP32-C3 | — |
| TEMT6000 (phototransistor) | `temt6000` | ESP32, ESP32-S3, ESP32-C3 | — |
| BH1750 (GY-30 / GY-302) | `bh1750` | ESP32, ESP32-S3, ESP32-C3 | BH1750 |
| TSL2561 | `tsl2561` | ESP32, ESP32-S3, ESP32-C3 | Adafruit TSL2561, Adafruit Unified Sensor |
| TSL2591 | `tsl2591` | ESP32, ESP32-S3, ESP32-C3 | Adafruit TSL2591 Library, Adafruit Unified Sensor |
| VEML7700 | `veml7700` | ESP32, ESP32-S3, ESP32-C3 | Adafruit VEML7700 Library, Adafruit BusIO |
| MAX44009 (GY-49) | `max44009` | ESP32, ESP32-S3, ESP32-C3 | — |
| TCS34725 (couleur RVB) | `tcs34725` | ESP32, ESP32-S3, ESP32-C3 | Adafruit TCS34725 |
| TCS3200 / TCS230 (couleur) | `tcs3200` | ESP32, ESP32-S3, ESP32-C3 | — |
| APDS9960 (gestes, proximité, couleur) | `apds9960` | ESP32, ESP32-S3, ESP32-C3 | Adafruit APDS9960 Library, Adafruit BusIO |
| AS7341 (spectromètre 11 canaux) | `as7341` | ESP32, ESP32-S3, ESP32-C3 | Adafruit AS7341, Adafruit BusIO |
| Détecteur de flamme IR (KY-026) | `flame` | ESP32, ESP32-S3, ESP32-C3 | — |
| Récepteur infrarouge VS1838B / TSOP38238 | `ir_receiver` | ESP32, ESP32-S3, ESP32-C3 | IRremote |
| Émetteur infrarouge (LED IR 940 nm) | `ir_transmitter` | ESP32, ESP32-S3, ESP32-C3 | IRremote |

## Distance & présence (17)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Détecteur d'obstacle IR (FC-51) | `ir_obstacle` | ESP32, ESP32-S3, ESP32-C3 | — |
| Suiveur de ligne TCRT5000 | `tcrt5000` | ESP32, ESP32-S3, ESP32-C3 | — |
| Barrière infrarouge (émetteur + récepteur) | `ir_beam` | ESP32, ESP32-S3, ESP32-C3 | — |
| Récepteur laser (module ISO203) | `laser_receiver` | ESP32, ESP32-S3, ESP32-C3 | — |
| HC-SR04 (ultrasons) | `hcsr04` | ESP32, ESP32-S3, ESP32-C3 | — |
| JSN-SR04T (ultrasons étanche) | `jsn_sr04t` | ESP32, ESP32-S3, ESP32-C3 | — |
| HC-SR04P / RCWL-1601 (3,3 V) | `hcsr04p` | ESP32, ESP32-S3, ESP32-C3 | — |
| US-100 (ultrasons, mode série) | `us100` | ESP32, ESP32-S3, ESP32-C3 | — |
| VL53L0X (temps de vol laser) | `vl53l0x` | ESP32, ESP32-S3, ESP32-C3 | Adafruit_VL53L0X |
| VL53L1X (ToF longue portée) | `vl53l1x` | ESP32, ESP32-S3, ESP32-C3 | VL53L1X |
| VL6180X (ToF courte portée + lux) | `vl6180x` | ESP32, ESP32-S3, ESP32-C3 | Adafruit_VL6180X |
| Sharp GP2Y0A21YK0F (IR 10-80 cm) | `sharp_ir` | ESP32, ESP32-S3, ESP32-C3 | — |
| Benewake TFmini / TF-Luna (LiDAR) | `tfmini` | ESP32, ESP32-S3, ESP32-C3 | — |
| HC-SR501 (PIR infrarouge passif) | `pir_hcsr501` | ESP32, ESP32-S3, ESP32-C3 | — |
| AM312 (mini PIR) | `pir_am312` | ESP32, ESP32-S3, ESP32-C3 | — |
| RCWL-0516 (radar micro-ondes) | `rcwl0516` | ESP32, ESP32-S3, ESP32-C3 | — |
| HLK-LD2410 (radar mmWave présence humaine) | `ld2410` | ESP32, ESP32-S3, ESP32-C3 | — |

## Mouvement, orientation & vibrations (20)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| MPU-6050 (GY-521) | `mpu6050` | ESP32, ESP32-S3, ESP32-C3 | Adafruit MPU6050, Adafruit Unified Sensor, Adafruit BusIO |
| MPU-9250 / MPU-6500 | `mpu9250` | ESP32, ESP32-S3, ESP32-C3 | — |
| ADXL345 (GY-291) | `adxl345` | ESP32, ESP32-S3, ESP32-C3 | Adafruit ADXL345, Adafruit Unified Sensor |
| LIS3DH | `lis3dh` | ESP32, ESP32-S3, ESP32-C3 | Adafruit LIS3DH, Adafruit Unified Sensor, Adafruit BusIO |
| LSM6DS3TR-C | `lsm6ds3` | ESP32, ESP32-S3, ESP32-C3 | Adafruit LSM6DS, Adafruit Unified Sensor, Adafruit BusIO |
| BNO055 (orientation absolue 9 axes) | `bno055` | ESP32, ESP32-S3, ESP32-C3 | Adafruit BNO055, Adafruit Unified Sensor |
| HMC5883L (boussole GY-273) | `hmc5883l` | ESP32, ESP32-S3, ESP32-C3 | Adafruit HMC5883 Unified, Adafruit Unified Sensor |
| QMC5883L (boussole GY-273 récente) | `qmc5883l` | ESP32, ESP32-S3, ESP32-C3 | — |
| ADXL335 (accéléromètre analogique) | `adxl335` | ESP32, ESP32-S3, ESP32-C3 | — |
| AS5600 (codeur magnétique 12 bits) | `as5600` | ESP32, ESP32-S3, ESP32-C3 | AS5600 |
| Capteur à effet Hall A3144 (KY-003) | `hall_a3144` | ESP32, ESP32-S3, ESP32-C3 | — |
| Capteur Hall linéaire SS49E (KY-035) | `hall_49e` | ESP32, ESP32-S3, ESP32-C3 | — |
| Contact reed (ILS) | `reed` | ESP32, ESP32-S3, ESP32-C3 | — |
| Capteur d'inclinaison SW-520D | `tilt_sw520` | ESP32, ESP32-S3, ESP32-C3 | — |
| Capteur de vibration SW-420 | `vibration_sw420` | ESP32, ESP32-S3, ESP32-C3 | — |
| Fin de course mécanique | `limit_switch` | ESP32, ESP32-S3, ESP32-C3 | — |
| Capteur de choc piézo | `piezo_knock` | ESP32, ESP32-S3, ESP32-C3 | — |
| Capteur de flexion (flex sensor 2,2") | `flex` | ESP32, ESP32-S3, ESP32-C3 | — |
| Capteur de force FSR402 | `fsr402` | ESP32, ESP32-S3, ESP32-C3 | — |
| Balance HX711 + cellule de charge | `hx711` | ESP32, ESP32-S3, ESP32-C3 | HX711 Arduino Library |

## Boutons, claviers & commandes (9)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Bouton-poussoir (anti-rebond) | `button` | ESP32, ESP32-S3, ESP32-C3 | — |
| Bouton tactile capacitif TTP223 | `ttp223` | ESP32, ESP32-S3, ESP32-C3 | — |
| Touche capacitive intégrée ESP32 | `esp_touch` | ESP32, ESP32-S3 | — |
| Potentiomètre 10 kΩ | `potentiometer` | ESP32, ESP32-S3, ESP32-C3 | — |
| Joystick analogique KY-023 | `joystick` | ESP32, ESP32-S3, ESP32-C3 | — |
| Codeur rotatif KY-040 | `rotary_encoder` | ESP32, ESP32-S3, ESP32-C3 | — |
| Clavier matriciel 4×4 | `keypad4x4` | ESP32, ESP32-S3, ESP32-C3 | Keypad |
| Clavier matriciel 3×4 (téléphone) | `keypad3x4` | ESP32, ESP32-S3, ESP32-C3 | Keypad |
| MPR121 (12 touches capacitives) | `mpr121` | ESP32, ESP32-S3, ESP32-C3 | Adafruit MPR121, Adafruit BusIO |

## Santé, son & biométrie (7)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Capteur de pouls (Pulse Sensor) | `pulse_sensor` | ESP32, ESP32-S3, ESP32-C3 | — |
| MAX30102 (pouls & SpO₂) | `max30102` | ESP32, ESP32-S3, ESP32-C3 | SparkFun MAX3010x Pulse and Proximity Sensor Library |
| AD8232 (électrocardiogramme) | `ad8232` | ESP32, ESP32-S3, ESP32-C3 | — |
| Capteur GSR (conductance cutanée) | `gsr` | ESP32, ESP32-S3, ESP32-C3 | — |
| Capteur de son KY-038 / LM393 | `sound_ky038` | ESP32, ESP32-S3, ESP32-C3 | — |
| Microphone MAX4466 / MAX9814 | `max4466` | ESP32, ESP32-S3, ESP32-C3 | — |
| INMP441 (micro numérique I2S) | `inmp441` | ESP32, ESP32-S3, ESP32-C3 | — |

## Courant, tension & énergie (10)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| INA219 (tension/courant/puissance) | `ina219` | ESP32, ESP32-S3, ESP32-C3 | Adafruit INA219, Adafruit BusIO |
| INA226 (wattmètre 36 V) | `ina226` | ESP32, ESP32-S3, ESP32-C3 | INA226 |
| INA260 (shunt intégré 15 A) | `ina260` | ESP32, ESP32-S3, ESP32-C3 | Adafruit INA260 Library, Adafruit BusIO |
| ACS712 (courant à effet Hall 5/20/30 A) | `acs712` | ESP32, ESP32-S3, ESP32-C3 | — |
| Module mesure de tension 0-25 V | `voltage_divider` | ESP32, ESP32-S3, ESP32-C3 | — |
| Niveau de batterie Li-ion (pont 100k/100k) | `battery_monitor` | ESP32, ESP32-S3, ESP32-C3 | — |
| ZMPT101B (tension secteur AC) | `zmpt101b` | ESP32, ESP32-S3, ESP32-C3 | — |
| Pince ampèremétrique SCT-013-030 | `sct013` | ESP32, ESP32-S3, ESP32-C3 | — |
| PZEM-004T v3 (compteur d'énergie) | `pzem004t` | ESP32, ESP32-S3, ESP32-C3 | PZEM004Tv30 |
| Petit panneau solaire (tension/puissance) | `solar_panel` | ESP32, ESP32-S3, ESP32-C3 | — |

## Identification, temps & position (11)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Lecteur RFID RC522 (13,56 MHz) | `rc522` | ESP32, ESP32-S3, ESP32-C3 | MFRC522 |
| Lecteur NFC PN532 (I2C) | `pn532` | ESP32, ESP32-S3, ESP32-C3 | Adafruit PN532, Adafruit BusIO |
| Lecteur d'empreintes R307 / AS608 | `fingerprint` | ESP32, ESP32-S3, ESP32-C3 | Adafruit Fingerprint Sensor Library |
| Lecteur RFID 125 kHz RDM6300 | `rdm6300` | ESP32, ESP32-S3, ESP32-C3 | — |
| Lecteur de codes-barres / QR GM65 | `gm65` | ESP32, ESP32-S3, ESP32-C3 | — |
| GPS u-blox NEO-6M / NEO-M8N | `gps_neo6m` | ESP32, ESP32-S3, ESP32-C3 | TinyGPSPlus |
| Horloge temps réel DS3231 | `ds3231` | ESP32, ESP32-S3, ESP32-C3 | RTClib, Adafruit BusIO |
| Horloge temps réel DS1307 (Tiny RTC) | `ds1307` | ESP32, ESP32-S3, ESP32-C3 | RTClib, Adafruit BusIO |
| Horloge temps réel PCF8563 | `pcf8563` | ESP32, ESP32-S3, ESP32-C3 | RTClib, Adafruit BusIO |
| EEPROM I2C AT24C32 / AT24C256 | `at24c32` | ESP32, ESP32-S3, ESP32-C3 | — |
| Module carte microSD (SPI) | `sd_card` | ESP32, ESP32-S3, ESP32-C3 | — |

## Actionneurs : LED, relais, son (15)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Module laser KY-008 (650 nm) | `laser_module` | ESP32, ESP32-S3, ESP32-C3 | — |
| LED + résistance 220 Ω | `led` | ESP32, ESP32-S3, ESP32-C3 | — |
| LED à intensité variable (PWM) | `led_pwm` | ESP32, ESP32-S3, ESP32-C3 | — |
| LED RVB (cathode commune) | `rgb_led` | ESP32, ESP32-S3, ESP32-C3 | — |
| Ruban / anneau LED WS2812B (NeoPixel) | `ws2812` | ESP32, ESP32-S3, ESP32-C3 | Adafruit NeoPixel |
| Buzzer actif 5 V | `buzzer_active` | ESP32, ESP32-S3, ESP32-C3 | — |
| Buzzer passif / haut-parleur piézo | `buzzer_passive` | ESP32, ESP32-S3, ESP32-C3 | — |
| Module relais 5 V (1 canal) | `relay` | ESP32, ESP32-S3, ESP32-C3 | — |
| Relais statique SSR G3MB-202P | `ssr` | ESP32, ESP32-S3, ESP32-C3 | — |
| Module MOSFET IRF520 / IRLZ44N | `mosfet_irf520` | ESP32, ESP32-S3, ESP32-C3 | — |
| Gâche / serrure électrique 12 V | `solenoid_lock` | ESP32, ESP32-S3, ESP32-C3 | — |
| Ventilateur PC 4 fils (PWM 25 kHz) | `fan_pwm` | ESP32, ESP32-S3, ESP32-C3 | — |
| Lecteur MP3 DFPlayer Mini | `dfplayer` | ESP32, ESP32-S3, ESP32-C3 | DFRobotDFPlayerMini |
| Ampli I2S MAX98357A + haut-parleur | `max98357` | ESP32, ESP32-S3, ESP32-C3 | — |
| Convertisseur N/A interne (DAC 8 bits) | `dac_internal` | ESP32 | — |

## Moteurs & servos (13)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Moteur vibreur (via transistor) | `vibration_motor` | ESP32, ESP32-S3, ESP32-C3 | — |
| Mini-pompe à eau 5 V (via MOSFET) | `pump` | ESP32, ESP32-S3, ESP32-C3 | — |
| Servomoteur SG90 / MG90S | `servo_sg90` | ESP32, ESP32-S3, ESP32-C3 | ESP32Servo |
| Servomoteur MG996R (couple 10 kg·cm) | `servo_mg996r` | ESP32, ESP32-S3, ESP32-C3 | ESP32Servo |
| Servo à rotation continue FS90R | `servo_360` | ESP32, ESP32-S3, ESP32-C3 | ESP32Servo |
| Moteur pas-à-pas 28BYJ-48 + ULN2003 | `stepper_28byj48` | ESP32, ESP32-S3, ESP32-C3 | AccelStepper |
| Pas-à-pas NEMA 17 + A4988 / DRV8825 | `stepper_a4988` | ESP32, ESP32-S3, ESP32-C3 | AccelStepper |
| Pont en H L298N (moteur CC) | `l298n` | ESP32, ESP32-S3, ESP32-C3 | — |
| Driver TB6612FNG (moteur CC) | `tb6612` | ESP32, ESP32-S3, ESP32-C3 | — |
| Driver DRV8833 (moteur CC) | `drv8833` | ESP32, ESP32-S3, ESP32-C3 | — |
| Driver L9110S (moteur CC) | `l9110s` | ESP32, ESP32-S3, ESP32-C3 | — |
| Driver BTS7960 43 A (moteur puissant) | `bts7960` | ESP32, ESP32-S3, ESP32-C3 | — |
| PCA9685 (16 servos I2C) | `pca9685` | ESP32, ESP32-S3, ESP32-C3 | Adafruit PWM Servo Driver Library, Adafruit BusIO |

## Extensions d'E/S & convertisseurs (10)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| MCP23017 (16 E/S I2C) | `mcp23017` | ESP32, ESP32-S3, ESP32-C3 | Adafruit MCP23017 Arduino Library, Adafruit BusIO |
| PCF8574 (8 E/S I2C) | `pcf8574` | ESP32, ESP32-S3, ESP32-C3 | — |
| Registre à décalage 74HC595 | `hc595` | ESP32, ESP32-S3, ESP32-C3 | — |
| Registre d'entrée 74HC165 | `hc165` | ESP32, ESP32-S3, ESP32-C3 | — |
| Multiplexeur analogique CD74HC4067 (16 voies) | `cd74hc4067` | ESP32, ESP32-S3, ESP32-C3 | — |
| ADS1115 (CAN 16 bits, 4 voies) | `ads1115` | ESP32, ESP32-S3, ESP32-C3 | Adafruit ADS1X15, Adafruit BusIO |
| PCF8591 (CAN/CNA 8 bits) | `pcf8591` | ESP32, ESP32-S3, ESP32-C3 | — |
| MCP4725 (CNA 12 bits I2C) | `mcp4725` | ESP32, ESP32-S3, ESP32-C3 | Adafruit MCP4725, Adafruit BusIO |
| Multiplexeur I2C TCA9548A (8 bus) | `tca9548a` | ESP32, ESP32-S3, ESP32-C3 | — |
| Scanner I2C (diagnostic) | `i2c_scanner` | ESP32, ESP32-S3, ESP32-C3 | — |

## Afficheurs (14)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Écran OLED 0,96" SSD1306 128×64 (I2C) | `oled_ssd1306` | ESP32, ESP32-S3, ESP32-C3 | Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Écran OLED 0,91" SSD1306 128×32 (I2C) | `oled_128x32` | ESP32, ESP32-S3, ESP32-C3 | Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Écran OLED 1,3" SH1106 128×64 (I2C) | `oled_sh1106` | ESP32, ESP32-S3, ESP32-C3 | Adafruit SH110X, Adafruit GFX Library, Adafruit BusIO |
| Écran couleur TFT 1,8" ST7735 128×160 (SPI) | `tft_st7735` | ESP32, ESP32-S3, ESP32-C3 | Adafruit ST7735 and ST7789 Library, Adafruit GFX Library, Adafruit BusIO |
| Écran couleur IPS 1,3"/1,54" ST7789 240×240 (SPI) | `tft_st7789` | ESP32, ESP32-S3, ESP32-C3 | Adafruit ST7735 and ST7789 Library, Adafruit GFX Library, Adafruit BusIO |
| Écran couleur TFT 2,4"/2,8" ILI9341 320×240 (SPI) | `tft_ili9341` | ESP32, ESP32-S3, ESP32-C3 | Adafruit ILI9341, Adafruit GFX Library, Adafruit BusIO |
| Écran Nokia 5110 PCD8544 84×48 (SPI) | `nokia5110` | ESP32, ESP32-S3, ESP32-C3 | Adafruit PCD8544 Nokia 5110 LCD library, Adafruit GFX Library, Adafruit BusIO |
| Écran LCD 16×2 + module I2C | `lcd1602` | ESP32, ESP32-S3, ESP32-C3 | LiquidCrystal I2C |
| Écran LCD 20×4 + module I2C | `lcd2004` | ESP32, ESP32-S3, ESP32-C3 | LiquidCrystal I2C |
| Afficheur 4 chiffres TM1637 | `tm1637` | ESP32, ESP32-S3, ESP32-C3 | TM1637 |
| Matrice LED 8×8 MAX7219 | `max7219_matrix` | ESP32, ESP32-S3, ESP32-C3 | — |
| Afficheur 8 chiffres MAX7219 | `max7219_7seg` | ESP32, ESP32-S3, ESP32-C3 | — |
| Afficheur 4 chiffres HT16K33 (I2C) | `ht16k33_7seg` | ESP32, ESP32-S3, ESP32-C3 | Adafruit LED Backpack Library, Adafruit GFX Library, Adafruit BusIO |
| Afficheur 7 segments 1 chiffre | `seg7_single` | ESP32, ESP32-S3, ESP32-C3 | — |

## Communication & radio (10)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Radio nRF24L01+ (2,4 GHz) | `nrf24l01` | ESP32, ESP32-S3, ESP32-C3 | RF24 |
| LoRa SX1276/SX1278 (Ra-01/Ra-02, RFM95) | `lora_sx1278` | ESP32, ESP32-S3, ESP32-C3 | LoRa |
| Bluetooth HC-05 / HC-06 (série) | `hc05` | ESP32, ESP32-S3, ESP32-C3 | — |
| Radio série HC-12 (433 MHz, 1 km) | `hc12` | ESP32, ESP32-S3, ESP32-C3 | — |
| Récepteur 433 MHz (RXB6 / MX-RM-5V) | `rf433_rx` | ESP32, ESP32-S3, ESP32-C3 | rc-switch |
| Émetteur 433 MHz (FS1000A) | `rf433_tx` | ESP32, ESP32-S3, ESP32-C3 | rc-switch |
| Bus RS485 MAX485 (Modbus RTU) | `rs485` | ESP32, ESP32-S3, ESP32-C3 | — |
| Bus CAN MCP2515 + TJA1050 | `mcp2515` | ESP32, ESP32-S3, ESP32-C3 | mcp_can |
| Modem GSM SIM800L (SMS, appels) | `sim800l` | ESP32, ESP32-S3, ESP32-C3 | — |
| Scanner Bluetooth Low Energy (intégré) | `ble_scanner` | ESP32, ESP32-S3, ESP32-C3 | — |

## Projets complets (52)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Station météo intérieure connectée | `app_station_meteo` | ESP32, ESP32-S3 | Adafruit BME280 Library, Adafruit Unified Sensor, Adafruit BusIO, BH1750, Adafruit SSD1306, Adafruit GFX Library |
| Station météo extérieure complète | `app_station_meteo_ext` | ESP32, ESP32-S3 | DHT sensor library, Adafruit Unified Sensor |
| Thermostat de chauffage | `app_thermostat` | ESP32, ESP32-S3 | OneWire, DallasTemperature, Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Ventilateur proportionnel à la température | `app_ventilation_auto` | ESP32, ESP32-S3 | DHT sensor library, Adafruit Unified Sensor |
| Lampe crépusculaire | `app_lampe_crepusculaire` | ESP32, ESP32-S3 | BH1750 |
| Éclairage à intensité automatique | `app_variateur_auto` | ESP32, ESP32-S3 | — |
| Volet roulant automatique | `app_volet_roulant` | ESP32, ESP32-S3 | BH1750, AccelStepper |
| Prise commandée par télécommande IR | `app_telecommande_ir` | ESP32, ESP32-S3 | IRremote |
| Passerelle prises radio 433 MHz | `app_prise_radio` | ESP32, ESP32-S3 | Adafruit AHTX0, Adafruit Unified Sensor, Adafruit BusIO, rc-switch, PubSubClient |
| Capteur domotique MQTT (Home Assistant) | `app_mqtt_domotique` | ESP32, ESP32-S3 | Adafruit SHT31 Library, Adafruit BusIO, PubSubClient |
| Afficheur de confort intérieur (LCD) | `app_lcd_interieur` | ESP32, ESP32-S3 | Adafruit AHTX0, Adafruit Unified Sensor, Adafruit BusIO, LiquidCrystal I2C |
| Horloge précise DS3231 + OLED | `app_horloge_rtc` | ESP32, ESP32-S3 | RTClib, Adafruit BusIO, Adafruit SSD1306, Adafruit GFX Library |
| Horloge / thermomètre à LED 8 chiffres | `app_horloge_led` | ESP32, ESP32-S3 | OneWire, DallasTemperature |
| Arrosage automatique de plante | `app_arrosage_auto` | ESP32, ESP32-S3 | Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Serre intelligente | `app_serre` | ESP32, ESP32-S3 | Adafruit SHT31 Library, Adafruit BusIO, BH1750 |
| Contrôleur d'aquarium | `app_aquarium` | ESP32, ESP32-S3 | OneWire, DallasTemperature |
| Analyseur de qualité de l'eau | `app_qualite_eau` | ESP32, ESP32-S3 | — |
| Jauge de cuve d'eau de pluie | `app_niveau_cuve` | ESP32, ESP32-S3 | Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Balance connectée (ruche, réservoir) | `app_balance` | ESP32, ESP32-S3 | HX711 Arduino Library, Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Alarme de réfrigérateur / congélateur | `app_frigo` | ESP32, ESP32-S3 | OneWire, DallasTemperature |
| Indicateur CO₂ « feu tricolore » (salle de classe) | `app_co2_feu` | ESP32, ESP32-S3 | Adafruit NeoPixel, Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Alarme CO₂ avec buzzer | `app_alarme_co2` | ESP32, ESP32-S3 | Adafruit SCD30, Adafruit Unified Sensor, Adafruit BusIO, LiquidCrystal I2C |
| Moniteur de particules fines PM2.5 | `app_particules` | ESP32, ESP32-S3 | Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Station qualité de l'air complète | `app_qualite_air_complet` | ESP32, ESP32-S3 | Adafruit SGP40 Sensor, Adafruit BusIO, Adafruit SSD1306, Adafruit GFX Library |
| Détecteur de fuite de gaz | `app_fuite_gaz` | ESP32, ESP32-S3 | — |
| Détecteur de flamme et fumée | `app_detecteur_incendie` | ESP32, ESP32-S3 | — |
| Cardiofréquencemètre à écran | `app_cardio` | ESP32, ESP32-S3 | SparkFun MAX3010x Pulse and Proximity Sensor Library, Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Sonomètre lumineux | `app_sonometre` | ESP32, ESP32-S3 | Adafruit NeoPixel |
| Alerte UV plage | `app_uv_plage` | ESP32, ESP32-S3 | Adafruit LTR390 Library, Adafruit BusIO, Adafruit SSD1306, Adafruit GFX Library |
| Alarme anti-intrusion | `app_alarme_intrusion` | ESP32, ESP32-S3 | — |
| Contrôle d'accès par badge RFID | `app_acces_rfid` | ESP32, ESP32-S3 | MFRC522 |
| Serrure à empreinte digitale | `app_acces_empreinte` | ESP32, ESP32-S3 | Adafruit Fingerprint Sensor Library |
| Antivol à vibration (vélo, sac) | `app_antivol` | ESP32, ESP32-S3 | — |
| Barrière laser d'alarme | `app_barriere_laser` | ESP32, ESP32-S3 | — |
| Compteur de passages / visiteurs | `app_compteur_passages` | ESP32, ESP32-S3 | LiquidCrystal I2C |
| Sonnette sans fil 433 MHz | `app_sonnette_radio` | ESP32, ESP32-S3 | rc-switch |
| Robot éviteur d'obstacles | `app_robot_evitement` | ESP32, ESP32-S3 | — |
| Radar de recul sonore | `app_radar_recul` | ESP32, ESP32-S3 | TM1637 |
| Aide au stationnement lumineuse (garage) | `app_parking_led` | ESP32, ESP32-S3 | Adafruit_VL53L0X, Adafruit NeoPixel |
| Thérémine à ultrasons | `app_theremine` | ESP32, ESP32-S3 | — |
| Servomoteur piloté par potentiomètre | `app_servo_potentiometre` | ESP32, ESP32-S3 | ESP32Servo |
| Tourelle pan-tilt au joystick | `app_joystick_servo` | ESP32, ESP32-S3 | ESP32Servo |
| Variateur de LED au potentiomètre | `app_variateur_potentiometre` | ESP32, ESP32-S3 | — |
| Niveau à bulle numérique | `app_niveau_bulle` | ESP32, ESP32-S3 | Adafruit MPU6050, Adafruit Unified Sensor, Adafruit BusIO, Adafruit SSD1306, Adafruit GFX Library |
| Boussole numérique | `app_boussole` | ESP32, ESP32-S3 | Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Traceur GPS avec enregistrement | `app_traceur_gps` | ESP32, ESP32-S3 | TinyGPSPlus, Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO |
| Compteur d'énergie domestique | `app_compteur_energie` | ESP32, ESP32-S3 | PZEM004Tv30, Adafruit SSD1306, Adafruit GFX Library, Adafruit BusIO, PubSubClient |
| Suivi d'une batterie / panneau solaire | `app_suivi_batterie` | ESP32, ESP32-S3 | Adafruit INA219, Adafruit BusIO, Adafruit SSD1306, Adafruit GFX Library |
| Enregistreur de données climatiques | `app_enregistreur_meteo` | ESP32, ESP32-S3 | Adafruit BME280 Library, Adafruit Unified Sensor, Adafruit BusIO, RTClib |
| Capteur distant LoRa (plusieurs km) | `app_capteur_lora` | ESP32, ESP32-S3 | Adafruit BME280 Library, Adafruit Unified Sensor, Adafruit BusIO, LoRa |
| Capteur connecté au tableau de bord du MASTER | `app_capteur_master` | ESP32, ESP32-S3 | Adafruit SHT4x Library, Adafruit Unified Sensor, Adafruit BusIO, BH1750 |
| Détecteur de présence Bluetooth | `app_scanner_ble` | ESP32, ESP32-S3 | — |

## Classiques ESP32 (système & réseau) (49)

| Projet | Identifiant | Cartes | Bibliothèques |
|---|---|---|---|
| Clignotement de la LED intégrée | `classic_blink` | ESP32, ESP32-S3, ESP32-C3 | — |
| Scanner de réseaux Wi-Fi | `classic_wifi_scan` | ESP32, ESP32-S3, ESP32-C3 | — |
| Point d'accès + serveur web | `classic_wifi_ap_web` | ESP32, ESP32-S3, ESP32-C3 | — |
| Connexion Wi-Fi robuste | `classic_wifi_reconnect` | ESP32, ESP32-S3, ESP32-C3 | — |
| Tableau de bord web des GPIO | `classic_web_gpio` | ESP32 | — |
| Client HTTPS + JSON (météo Open-Meteo) | `classic_http_json` | ESP32, ESP32-S3, ESP32-C3 | ArduinoJson |
| Horloge Internet NTP | `classic_ntp_clock` | ESP32, ESP32-S3, ESP32-C3 | — |
| Nom réseau mDNS (.local) | `classic_mdns` | ESP32, ESP32-S3, ESP32-C3 | — |
| Serveur UDP écho | `classic_udp_echo` | ESP32, ESP32-S3, ESP32-C3 | — |
| Console Telnet (serveur TCP) | `classic_tcp_server` | ESP32, ESP32-S3, ESP32-C3 | — |
| ESP-NOW émetteur | `classic_espnow_sender` | ESP32, ESP32-S3, ESP32-C3 | — |
| ESP-NOW récepteur | `classic_espnow_receiver` | ESP32, ESP32-S3, ESP32-C3 | — |
| ESP-NOW en diffusion (maillage simple) | `classic_espnow_broadcast` | ESP32, ESP32-S3, ESP32-C3 | — |
| Sommeil profond minuté | `classic_deep_sleep_timer` | ESP32, ESP32-S3, ESP32-C3 | — |
| Sommeil profond réveillé par bouton | `classic_deep_sleep_button` | ESP32, ESP32-S3 | — |
| Réglages en mémoire non volatile (NVS) | `classic_preferences` | ESP32, ESP32-S3, ESP32-C3 | — |
| Fichiers dans la flash (LittleFS) | `classic_littlefs` | ESP32, ESP32-S3, ESP32-C3 | — |
| Moniteur de mémoire | `classic_heap_monitor` | ESP32, ESP32-S3, ESP32-C3 | — |
| Carte d'identité de la puce | `classic_chip_info` | ESP32, ESP32-S3, ESP32-C3 | — |
| Multitâche FreeRTOS | `classic_freertos_tasks` | ESP32, ESP32-S3, ESP32-C3 | — |
| Minuterie matérielle | `classic_hw_timer` | ESP32, ESP32-S3, ESP32-C3 | — |
| Chien de garde (watchdog) | `classic_task_watchdog` | ESP32, ESP32-S3, ESP32-C3 | — |
| Fondu LED matériel (LEDC) | `classic_ledc_fade` | ESP32, ESP32-S3, ESP32-C3 | — |
| Mélodie sur buzzer passif | `classic_ledc_tone` | ESP32, ESP32-S3, ESP32-C3 | — |
| Mesure analogique étalonnée | `classic_adc_oversampling` | ESP32 | — |
| Compteur d'impulsions matériel (PCNT) | `classic_pcnt_counter` | ESP32, ESP32-S3 | — |
| Interruption et anti-rebond | `classic_interrupt_counter` | ESP32, ESP32-S3, ESP32-C3 | — |
| Console de commandes série | `classic_serial_cli` | ESP32, ESP32-S3, ESP32-C3 | — |
| Échanges JSON sur le port série | `classic_json_serial` | ESP32, ESP32-S3, ESP32-C3 | ArduinoJson |
| Protocole série binaire avec CRC | `classic_serial_binary` | ESP32, ESP32-S3, ESP32-C3 | — |
| Identifiants uniques (UUID v4) | `classic_uuid` | ESP32, ESP32-S3, ESP32-C3 | — |
| Test de boucle UART | `classic_uart_loopback` | ESP32, ESP32-S3, ESP32-C3 | — |
| Test de boucle SPI | `classic_spi_loopback` | ESP32, ESP32-S3, ESP32-C3 | — |
| Mise à jour sans fil (ArduinoOTA) | `classic_arduino_ota` | ESP32, ESP32-S3, ESP32-C3 | — |
| Page web de mise à jour firmware | `classic_web_ota` | ESP32, ESP32-S3, ESP32-C3 | — |
| Portail captif de configuration Wi-Fi | `classic_wifi_portal` | ESP32, ESP32-S3, ESP32-C3 | — |
| Notification smartphone (ntfy.sh) | `classic_webhook_ntfy` | ESP32, ESP32-S3, ESP32-C3 | — |
| Client MQTT (Home Assistant) | `classic_mqtt` | ESP32, ESP32-S3, ESP32-C3 | PubSubClient |
| Terminal Bluetooth classique (SPP) | `classic_bluetooth_serial` | ESP32 | — |
| Liaison série BLE (UART Nordic) | `classic_ble_uart` | ESP32, ESP32-S3, ESP32-C3 | — |
| Balise iBeacon | `classic_ble_beacon` | ESP32, ESP32-S3, ESP32-C3 | — |
| Température interne de la puce | `classic_internal_temp` | ESP32, ESP32-S3, ESP32-C3 | — |
| Envoyer des mesures au MASTER ESP32 LAB | `classic_sensor_to_master` | ESP32, ESP32-S3, ESP32-C3 | — |
| Test de la PSRAM | `classic_psram_test` | ESP32-S3, ESP32 | — |
| Station météo BME280 + OLED + DS3231 (manuscrite) | `classic_station_meteo_rtc` | ESP32 | Adafruit BME280 Library, Adafruit Unified Sensor, Adafruit BusIO, Adafruit SSD1306, Adafruit GFX Library, RTClib |
| Contrôle d'accès RFID + servo + dashboard Wi-Fi | `classic_acces_rfid_web` | ESP32 | MFRC522, ESP32Servo |
| Robot éviteur à deux servos continus | `classic_robot_servos` | ESP32 | ESP32Servo |
| Enregistreur DHT22 + BH1750 + DS3231 (CSV série) | `classic_datalogger_csv` | ESP32 | DHT sensor library, Adafruit Unified Sensor, BH1750, RTClib, Adafruit BusIO |
| Alarme ultrason + NeoPixel + buzzer + dashboard | `classic_alarme_web` | ESP32 | Adafruit NeoPixel |
