// NEXUS — firmware véhicule : réglages. Copie ce fichier, renseigne-le, puis téléverse vehicle.ino.
#pragma once

// Identifiant unique de la voiture dans la flotte : V1 … V9 (lettres et chiffres, 12 max).
#define VEHICLE_ID        "V1"

// Réseau du laboratoire (point d'accès du MASTER S3).
#define LAB_AP_SSID       "ESP32-LAB"
#define LAB_AP_PASSWORD   "ESP32-LAB-Setup2026!"   // même valeur que firmware/worker/config.h

// Clé de flotte : 16 caractères minimum, IDENTIQUE à NEXUS_FLEET_KEY dans /etc/nexus/nexus.env du Pi.
// Ne laisse jamais cette valeur d'exemple : change-la avant le premier essai.
#define FLEET_KEY         "change-moi-cle-de-flotte"

// Adresse du Pi (0.0.0.0 = apprise à la première commande valide ; les annonces partent en diffusion).
#define PI_ADDRESS        "0.0.0.0"

// --- Pont en H (L298N, TB6612FNG, DRV8833 en mode PWM + direction) --------------------------------
#define MOTOR_L_PWM       25
#define MOTOR_L_IN1       26
#define MOTOR_L_IN2       27
#define MOTOR_R_PWM       14
#define MOTOR_R_IN1       12   // GPIO12 est une broche de démarrage sur ESP32 : garde-la à 0 au boot (L298N : OK)
#define MOTOR_R_IN2       13
#define MOTOR_PWM_FREQ    20000
#define MOTOR_PWM_BITS    10
#define MOTOR_MIN_DUTY    0.35f   // en dessous, les petits moteurs jaunes ne démarrent pas
#define MOTOR_L_INVERT    0
#define MOTOR_R_INVERT    0

// --- Capteur d'obstacle avant HC-SR04 (écho en 5 V : pont 1 kΩ / 2 kΩ obligatoire) --------------------
#define US_TRIG           32
#define US_ECHO           33
#define OBSTACLE_STOP_MM  150     // arrêt local immédiat, même sans Wi-Fi

// --- Codeurs de roues (facultatifs mais fortement conseillés : sans eux la position est estimée) ---
#define ENC_L             34      // -1 si absent
#define ENC_R             35
#define TICKS_PER_REV     20      // disque à 20 fentes des kits « smart car »
#define WHEEL_DIAMETER_M  0.065f
#define WHEEL_BASE_M      0.13f   // écartement des roues

// Vitesse estimée à pleine puissance quand il n'y a pas de codeurs (à mesurer : 1 m chronométré).
#define OPEN_LOOP_MAX_MPS 0.45f

// --- Bouton d'arrêt d'urgence (vers GND) et LED d'état -----------------------------------------------
#define ESTOP_PIN         4       // -1 si absent ; un coupe-circuit sur la batterie reste indispensable
#define STATUS_LED        2

// --- Sécurité ------------------------------------------------------------------------------------------
#define MAX_LEASE_MS      800     // un ordre ne peut jamais faire rouler plus longtemps sans être renouvelé
#define MAX_SPEED_MPS     0.6f
#define BATTERY_ADC       39      // pont diviseur vers ADC1 ; -1 si absent
#define BATTERY_DIVIDER   3.0f    // (R1 + R2) / R2
