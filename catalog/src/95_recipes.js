/* Projets complets : assemblages de modules + automatismes, générés par le Studio.
 * Règles : {if:{m, out, op, v, hyst}, then:{m, act}, else:{m, act}}  ou  {if:{m, out, op:'map', in:[a,b]}, then:{m, act:'set', out:[c,d]}} */
(function (root) {
  'use strict';
  const LAB = (root.LAB = root.LAB || {});
  const R = (LAB.RECIPES = LAB.RECIPES || []);
  const add = (r) => R.push(Object.assign({ difficulty: 2, board: 'esp32', rules: [], options: {} }, r));
  const on = (m) => ({ m, act: 'on' });
  const off = (m) => ({ m, act: 'off' });
  const set = (m, v) => ({ m, act: 'set', v });

  /* ---------------- Maison & confort ---------------- */
  add({ id: 'app_station_meteo', title: 'Station météo intérieure connectée', tags: ['météo', 'OLED', 'web', 'MASTER'],
    desc: 'Température, humidité, pression et luminosité sur écran OLED, page web locale et tableau de bord du MASTER.',
    modules: [{ id: 'bme280' }, { id: 'bh1750' }, { id: 'oled_ssd1306' }], options: { web: true, master: true } });
  add({ id: 'app_station_meteo_ext', title: 'Station météo extérieure complète', difficulty: 3, tags: ['météo', 'vent', 'pluie', 'web'],
    desc: 'Kit météo : température/humidité, vitesse et direction du vent, cumul de pluie, détecteur de pluie, avec page web.',
    modules: [{ id: 'dht22' }, { id: 'anemometer' }, { id: 'wind_vane' }, { id: 'rain_gauge' }, { id: 'rain' }], options: { web: true, master: true } });
  add({ id: 'app_thermostat', title: 'Thermostat de chauffage', tags: ['chauffage', 'relais', 'OLED'],
    desc: 'Enclenche un radiateur (via relais) sous 19 °C avec hystérésis de 0,5 °C ; affichage OLED.',
    modules: [{ id: 'ds18b20' }, { id: 'relay', alias: 'chauffage' }, { id: 'oled_ssd1306' }],
    rules: [{ if: { m: 0, out: 'temp', op: '<', v: 19, hyst: 0.5 }, then: on(1), else: off(1) }], options: { web: true } });
  add({ id: 'app_ventilation_auto', title: 'Ventilateur proportionnel à la température', tags: ['ventilateur', 'PWM', 'proportionnel'],
    desc: 'La vitesse du ventilateur 4 fils suit la température : 20 % à 22 °C, 100 % à 32 °C.',
    modules: [{ id: 'dht22' }, { id: 'fan_pwm' }],
    rules: [{ if: { m: 0, out: 'temp', op: 'map', in: [22, 32] }, then: { m: 1, act: 'set', out: [20, 100] } }] });
  add({ id: 'app_lampe_crepusculaire', title: 'Lampe crépusculaire', difficulty: 1, tags: ['éclairage', 'lux', 'relais'],
    desc: 'Allume une lampe (relais) quand la luminosité passe sous 50 lx, avec hystérésis anti-clignotement.',
    modules: [{ id: 'bh1750' }, { id: 'relay', alias: 'lampe' }],
    rules: [{ if: { m: 0, out: 'lux', op: '<', v: 50, hyst: 20 }, then: on(1), else: off(1) }] });
  add({ id: 'app_variateur_auto', title: 'Éclairage à intensité automatique', tags: ['éclairage', 'PWM', 'proportionnel'],
    desc: 'Une LED/ruban compense la lumière ambiante : plus il fait sombre, plus elle éclaire.',
    modules: [{ id: 'ldr' }, { id: 'led_pwm' }],
    rules: [{ if: { m: 0, out: 'light', op: 'map', in: [80, 10] }, then: { m: 1, act: 'set', out: [0, 100] } }] });
  add({ id: 'app_volet_roulant', title: 'Volet roulant automatique', difficulty: 3, tags: ['volet', 'pas-à-pas', 'lux'],
    desc: 'Ouvre un store (moteur pas-à-pas) au-dessus de 2000 lx et le referme la nuit.',
    modules: [{ id: 'bh1750' }, { id: 'stepper_28byj48', alias: 'store' }],
    rules: [{ if: { m: 0, out: 'lux', op: '>', v: 2000, hyst: 500 }, then: set(1, 4096), else: set(1, 0) }] });
  add({ id: 'app_telecommande_ir', title: 'Prise commandée par télécommande IR', tags: ['infrarouge', 'relais', 'télécommande'],
    desc: 'La touche « 1 » (commande NEC 0x45) d\'une télécommande allume le relais, toute autre touche l\'éteint.',
    modules: [{ id: 'ir_receiver' }, { id: 'relay' }],
    rules: [{ if: { m: 0, out: 'cmd', op: '==', v: 69 }, then: on(1), else: off(1) }] });
  add({ id: 'app_prise_radio', title: 'Passerelle prises radio 433 MHz', tags: ['433 MHz', 'domotique', 'MQTT'],
    desc: 'Pilote une prise radiocommandée 433 MHz selon la température, et publie les mesures en MQTT.',
    modules: [{ id: 'aht20' }, { id: 'rf433_tx' }],
    rules: [{ if: { m: 0, out: 'temp', op: '>', v: 27, hyst: 1 }, then: on(1), else: off(1) }], options: { mqtt: true } });
  add({ id: 'app_mqtt_domotique', title: 'Capteur domotique MQTT (Home Assistant)', tags: ['MQTT', 'Home Assistant', 'domotique'],
    desc: 'Température/humidité et relais publiés sur un broker MQTT (Mosquitto, Home Assistant).',
    modules: [{ id: 'sht31' }, { id: 'relay' }],
    rules: [{ if: { m: 0, out: 'hum', op: '>', v: 70, hyst: 5 }, then: on(1), else: off(1) }], options: { mqtt: true, web: true } });
  add({ id: 'app_lcd_interieur', title: 'Afficheur de confort intérieur (LCD)', difficulty: 1, tags: ['LCD', 'confort'],
    desc: 'Température et humidité sur un écran LCD 16×2 : le premier projet « utile » à offrir.',
    modules: [{ id: 'aht20' }, { id: 'lcd1602' }] });
  add({ id: 'app_horloge_rtc', title: 'Horloge précise DS3231 + OLED', difficulty: 1, tags: ['horloge', 'RTC', 'OLED'],
    desc: 'Heure conservée sur pile, température de la puce, affichage OLED.',
    modules: [{ id: 'ds3231' }, { id: 'oled_ssd1306' }] });
  add({ id: 'app_horloge_led', title: 'Horloge / thermomètre à LED 8 chiffres', difficulty: 1, tags: ['horloge', '7 segments', 'MAX7219'],
    desc: 'Grands chiffres lumineux : température d\'une sonde DS18B20 sur afficheur MAX7219.',
    modules: [{ id: 'ds18b20' }, { id: 'max7219_7seg' }] });

  /* ---------------- Jardin, eau & animaux ---------------- */
  add({ id: 'app_arrosage_auto', title: 'Arrosage automatique de plante', tags: ['arrosage', 'pompe', 'sol'],
    desc: 'La pompe démarre sous 30 % d\'humidité du sol et s\'arrête à 40 % (sécurité 20 s max).',
    modules: [{ id: 'soil_cap' }, { id: 'pump' }, { id: 'oled_ssd1306' }],
    rules: [{ if: { m: 0, out: 'moist', op: '<', v: 30, hyst: 10 }, then: on(1), else: off(1) }], options: { web: true } });
  add({ id: 'app_serre', title: 'Serre intelligente', difficulty: 3, tags: ['serre', 'jardin', 'ventilation', 'arrosage', 'web'],
    desc: 'Aération au-dessus de 28 °C, arrosage sous 35 % d\'humidité du sol, suivi de la lumière ; tableau de bord web.',
    modules: [{ id: 'sht31' }, { id: 'soil_cap' }, { id: 'bh1750' }, { id: 'relay', alias: 'aeration' }, { id: 'pump' }],
    rules: [{ if: { m: 0, out: 'temp', op: '>', v: 28, hyst: 1 }, then: on(3), else: off(3) },
      { if: { m: 1, out: 'moist', op: '<', v: 35, hyst: 10 }, then: on(4), else: off(4) }], options: { web: true, master: true } });
  add({ id: 'app_aquarium', title: 'Contrôleur d\'aquarium', difficulty: 3, tags: ['aquarium', 'pH', 'TDS', 'chauffage'],
    desc: 'Température (chauffage sous 24,5 °C), pH et TDS de l\'eau, page web de suivi.',
    modules: [{ id: 'ds18b20' }, { id: 'ph' }, { id: 'tds' }, { id: 'relay', alias: 'chauffage' }],
    rules: [{ if: { m: 0, out: 'temp', op: '<', v: 24.5, hyst: 0.3 }, then: on(3), else: off(3) }], options: { web: true } });
  add({ id: 'app_qualite_eau', title: 'Analyseur de qualité de l\'eau', tags: ['eau', 'pH', 'TDS', 'turbidité'],
    desc: 'pH, solides dissous et turbidité mesurés ensemble, journalisés sur microSD.',
    modules: [{ id: 'ph' }, { id: 'tds' }, { id: 'turbidity' }, { id: 'sd_card' }] });
  add({ id: 'app_niveau_cuve', title: 'Jauge de cuve d\'eau de pluie', tags: ['cuve', 'niveau', 'ultrason', 'web'],
    desc: 'Capteur ultrason étanche au-dessus de l\'eau, distance affichée sur OLED et sur le web.',
    modules: [{ id: 'jsn_sr04t' }, { id: 'oled_ssd1306' }], options: { web: true, master: true } });
  add({ id: 'app_balance', title: 'Balance connectée (ruche, réservoir)', tags: ['balance', 'HX711', 'web'],
    desc: 'Pesée par cellule de charge, affichage OLED et envoi au MASTER.',
    modules: [{ id: 'hx711' }, { id: 'oled_ssd1306' }], options: { web: true, master: true } });
  add({ id: 'app_frigo', title: 'Alarme de réfrigérateur / congélateur', difficulty: 1, tags: ['froid', 'alarme', 'DS18B20'],
    desc: 'Bip si la température dépasse 8 °C (porte mal fermée, panne) ; valeur envoyée au MASTER.',
    modules: [{ id: 'ds18b20' }, { id: 'buzzer_active' }],
    rules: [{ if: { m: 0, out: 'temp', op: '>', v: 8, hyst: 1 }, then: on(1), else: off(1) }], options: { master: true } });

  /* ---------------- Air & santé ---------------- */
  add({ id: 'app_co2_feu', title: 'Indicateur CO₂ « feu tricolore » (salle de classe)', tags: ['CO2', 'école', 'NeoPixel', 'aération'],
    desc: 'Un anneau LED passe du vert (400 ppm) au rouge (1500 ppm) : signal clair pour aérer.',
    modules: [{ id: 'scd40' }, { id: 'ws2812', params: { count: 12 } }, { id: 'oled_ssd1306' }],
    rules: [{ if: { m: 0, out: 'co2', op: 'map', in: [500, 1500] }, then: { m: 1, act: 'set', out: [120, 0] } }], options: { web: true, master: true } });
  add({ id: 'app_alarme_co2', title: 'Alarme CO₂ avec buzzer', tags: ['CO2', 'alarme', 'LCD'],
    desc: 'Buzzer au-delà de 1500 ppm, affichage LCD du CO₂, de la température et de l\'humidité.',
    modules: [{ id: 'scd30' }, { id: 'buzzer_active' }, { id: 'lcd1602' }],
    rules: [{ if: { m: 0, out: 'co2', op: '>', v: 1500, hyst: 200 }, then: on(1), else: off(1) }] });
  add({ id: 'app_particules', title: 'Moniteur de particules fines PM2.5', tags: ['PM2.5', 'pollution', 'OLED', 'web'],
    desc: 'PM1/PM2.5/PM10 en µg/m³ sur OLED, web et tableau de bord du MASTER.',
    modules: [{ id: 'pms5003' }, { id: 'oled_ssd1306' }], options: { web: true, master: true } });
  add({ id: 'app_qualite_air_complet', title: 'Station qualité de l\'air complète', difficulty: 3, tags: ['COV', 'CO2', 'particules', 'enregistreur'],
    desc: 'CO₂, COV, particules, température et humidité, enregistrés sur microSD et affichés sur OLED.',
    modules: [{ id: 'scd40' }, { id: 'sgp40' }, { id: 'pms5003' }, { id: 'oled_ssd1306' }, { id: 'sd_card' }], options: { master: true } });
  add({ id: 'app_fuite_gaz', title: 'Détecteur de fuite de gaz', tags: ['gaz', 'MQ-2', 'alarme', 'sécurité'],
    desc: 'Alarme sonore et coupure d\'une électrovanne (relais) au-delà d\'un seuil de gaz (démonstration pédagogique).',
    modules: [{ id: 'mq2' }, { id: 'buzzer_active' }, { id: 'relay', alias: 'vanne' }],
    rules: [{ if: { m: 0, out: 'ratio', op: '<', v: 0.6, hyst: 0.1 }, then: on(1), else: off(1) },
      { if: { m: 0, out: 'ratio', op: '<', v: 0.6, hyst: 0.1 }, then: on(2), else: off(2) }],
    notes: ['Pédagogique : ne remplace pas un détecteur certifié NF.'] });
  add({ id: 'app_detecteur_incendie', title: 'Détecteur de flamme et fumée', tags: ['incendie', 'flamme', 'alarme'],
    desc: 'Alarme dès qu\'une flamme est vue par le capteur IR ; niveau de fumée MQ-2 surveillé.',
    modules: [{ id: 'flame' }, { id: 'mq2' }, { id: 'buzzer_active' }],
    rules: [{ if: { m: 0, out: 'fire', op: '>', v: 0.5 }, then: on(2), else: off(2) }] });
  add({ id: 'app_cardio', title: 'Cardiofréquencemètre à écran', tags: ['pouls', 'santé', 'OLED'],
    desc: 'Fréquence cardiaque (MAX30102) affichée en direct sur OLED.',
    modules: [{ id: 'max30102' }, { id: 'oled_ssd1306' }] });
  add({ id: 'app_sonometre', title: 'Sonomètre lumineux', tags: ['son', 'bruit', 'NeoPixel'],
    desc: 'Le ruban LED passe du vert au rouge selon le niveau sonore (cantine, open-space).',
    modules: [{ id: 'max4466' }, { id: 'ws2812' }],
    rules: [{ if: { m: 0, out: 'db', op: 'map', in: [40, 70] }, then: { m: 1, act: 'set', out: [120, 0] } }] });
  add({ id: 'app_uv_plage', title: 'Alerte UV plage', difficulty: 1, tags: ['UV', 'soleil', 'alerte'],
    desc: 'Indice UV sur OLED et bip au-dessus de l\'indice 6 (protection solaire).',
    modules: [{ id: 'ltr390' }, { id: 'buzzer_active' }, { id: 'oled_ssd1306' }],
    rules: [{ if: { m: 0, out: 'uvi', op: '>', v: 6, hyst: 0.5 }, then: on(1), else: off(1) }] });

  /* ---------------- Sécurité & accès ---------------- */
  add({ id: 'app_alarme_intrusion', title: 'Alarme anti-intrusion', tags: ['alarme', 'PIR', 'porte', 'buzzer'],
    desc: 'Détecteur de mouvement PIR + contact de porte : sirène et voyant.',
    modules: [{ id: 'pir_hcsr501' }, { id: 'reed', alias: 'porte' }, { id: 'buzzer_active', alias: 'sirene' }, { id: 'led', alias: 'voyant' }],
    rules: [{ if: { m: 0, out: 'motion', op: '>', v: 0.5 }, then: on(2), else: off(2) },
      { if: { m: 1, out: 'state', op: '<', v: 0.5 }, then: on(3), else: off(3) }], options: { master: true } });
  add({ id: 'app_acces_rfid', title: 'Contrôle d\'accès par badge RFID', tags: ['RFID', 'serrure', 'accès'],
    desc: 'Le badge autorisé ouvre la gâche électrique pendant 3 s ; une LED signale l\'accès.',
    modules: [{ id: 'rc522' }, { id: 'solenoid_lock' }, { id: 'led' }],
    rules: [{ if: { m: 0, out: 'granted', op: '>', v: 0.5 }, then: on(1) }, { if: { m: 0, out: 'granted', op: '>', v: 0.5 }, then: on(2), else: off(2) }] });
  add({ id: 'app_acces_empreinte', title: 'Serrure à empreinte digitale', difficulty: 3, tags: ['empreinte', 'serrure', 'biométrie'],
    desc: 'Une empreinte reconnue (ID ≥ 1) déverrouille la gâche 3 s.',
    modules: [{ id: 'fingerprint' }, { id: 'solenoid_lock' }],
    rules: [{ if: { m: 0, out: 'id', op: '>=', v: 1 }, then: on(1) }] });
  add({ id: 'app_antivol', title: 'Antivol à vibration (vélo, sac)', difficulty: 1, tags: ['antivol', 'vibration', 'buzzer'],
    desc: 'Toute secousse déclenche le buzzer.',
    modules: [{ id: 'vibration_sw420' }, { id: 'buzzer_active' }],
    rules: [{ if: { m: 0, out: 'state', op: '>', v: 0.5 }, then: on(1), else: off(1) }] });
  add({ id: 'app_barriere_laser', title: 'Barrière laser d\'alarme', difficulty: 1, tags: ['laser', 'alarme'],
    desc: 'Un faisceau laser traverse la pièce ; s\'il est coupé, la sirène retentit.',
    modules: [{ id: 'laser_module' }, { id: 'laser_receiver' }, { id: 'buzzer_active' }],
    rules: [{ if: { m: 1, out: 'beam', op: '<', v: 0.5 }, then: on(2), else: off(2) }] });
  add({ id: 'app_compteur_passages', title: 'Compteur de passages / visiteurs', difficulty: 1, tags: ['comptage', 'infrarouge', 'LCD'],
    desc: 'Chaque coupure de la barrière IR incrémente le compteur affiché sur LCD et sur le web.',
    modules: [{ id: 'ir_beam' }, { id: 'lcd1602' }], options: { web: true } });
  add({ id: 'app_sonnette_radio', title: 'Sonnette sans fil 433 MHz', tags: ['sonnette', '433 MHz', 'mélodie'],
    desc: 'Reconnaît le code d\'un bouton de sonnette 433 MHz et joue une mélodie.',
    modules: [{ id: 'rf433_rx' }, { id: 'buzzer_passive' }],
    rules: [{ if: { m: 0, out: 'code', op: '==', v: 1361 }, then: set(1, 880), else: off(1) }] });

  /* ---------------- Robotique & mouvement ---------------- */
  add({ id: 'app_robot_evitement', title: 'Robot éviteur d\'obstacles', difficulty: 3, tags: ['robot', 'ultrason', 'moteur'],
    desc: 'Le moteur recule quand un obstacle est à moins de 20 cm, avance sinon (base de robot mobile).',
    modules: [{ id: 'hcsr04' }, { id: 'l298n' }],
    rules: [{ if: { m: 0, out: 'dist', op: '<', v: 20, hyst: 5 }, then: set(1, -60), else: set(1, 70) }] });
  add({ id: 'app_radar_recul', title: 'Radar de recul sonore', tags: ['parking', 'ultrason', 'buzzer'],
    desc: 'Plus l\'obstacle est proche, plus le bip est aigu ; distance sur afficheur 4 chiffres.',
    modules: [{ id: 'hcsr04' }, { id: 'buzzer_passive' }, { id: 'tm1637' }],
    rules: [{ if: { m: 0, out: 'dist', op: 'map', in: [100, 5] }, then: { m: 1, act: 'set', out: [200, 2500] } }] });
  add({ id: 'app_parking_led', title: 'Aide au stationnement lumineuse (garage)', tags: ['parking', 'ToF', 'NeoPixel'],
    desc: 'Capteur laser au fond du garage : l\'anneau passe du vert au rouge en approchant du mur.',
    modules: [{ id: 'vl53l0x' }, { id: 'ws2812', params: { count: 12 } }],
    rules: [{ if: { m: 0, out: 'dist', op: 'map', in: [100, 10] }, then: { m: 1, act: 'set', out: [120, 0] } }] });
  add({ id: 'app_theremine', title: 'Thérémine à ultrasons', difficulty: 1, tags: ['musique', 'ultrason', 'jeu'],
    desc: 'Instrument de musique sans contact : la hauteur de la note suit la distance de la main.',
    modules: [{ id: 'hcsr04' }, { id: 'buzzer_passive' }],
    rules: [{ if: { m: 0, out: 'dist', op: 'map', in: [5, 60] }, then: { m: 1, act: 'set', out: [1500, 150] } }] });
  add({ id: 'app_servo_potentiometre', title: 'Servomoteur piloté par potentiomètre', difficulty: 1, tags: ['servo', 'potentiomètre', 'débutant'],
    desc: 'Le grand classique : l\'angle du servo suit la position du potentiomètre.',
    modules: [{ id: 'potentiometer' }, { id: 'servo_sg90' }],
    rules: [{ if: { m: 0, out: 'pos', op: 'map', in: [0, 100] }, then: { m: 1, act: 'set', out: [0, 180] } }] });
  add({ id: 'app_joystick_servo', title: 'Tourelle pan-tilt au joystick', tags: ['servo', 'joystick', 'caméra'],
    desc: 'Deux servos (panoramique et inclinaison) suivent les axes d\'un joystick.',
    modules: [{ id: 'joystick' }, { id: 'servo_sg90', alias: 'pan' }, { id: 'servo_sg90', alias: 'tilt' }],
    rules: [{ if: { m: 0, out: 'x', op: 'map', in: [-100, 100] }, then: { m: 1, act: 'set', out: [0, 180] } },
      { if: { m: 0, out: 'y', op: 'map', in: [-100, 100] }, then: { m: 2, act: 'set', out: [0, 180] } }] });
  add({ id: 'app_variateur_potentiometre', title: 'Variateur de LED au potentiomètre', difficulty: 1, tags: ['PWM', 'LED', 'débutant'],
    desc: 'La luminosité de la LED suit le potentiomètre (PWM avec correction de perception).',
    modules: [{ id: 'potentiometer' }, { id: 'led_pwm' }],
    rules: [{ if: { m: 0, out: 'pos', op: 'map', in: [0, 100] }, then: { m: 1, act: 'set', out: [0, 100] } }] });
  add({ id: 'app_niveau_bulle', title: 'Niveau à bulle numérique', tags: ['inclinaison', 'IMU', 'OLED'],
    desc: 'Roulis et tangage en degrés sur écran OLED grâce au MPU-6050.',
    modules: [{ id: 'mpu6050' }, { id: 'oled_ssd1306' }] });
  add({ id: 'app_boussole', title: 'Boussole numérique', difficulty: 1, tags: ['boussole', 'magnétomètre', 'OLED'],
    desc: 'Cap magnétique en degrés sur OLED (QMC5883L).',
    modules: [{ id: 'qmc5883l' }, { id: 'oled_ssd1306' }] });
  add({ id: 'app_traceur_gps', title: 'Traceur GPS avec enregistrement', difficulty: 3, tags: ['GPS', 'microSD', 'randonnée'],
    desc: 'Position, altitude et vitesse enregistrées sur microSD et affichées sur OLED.',
    modules: [{ id: 'gps_neo6m' }, { id: 'oled_ssd1306' }, { id: 'sd_card' }] });

  /* ---------------- Énergie & réseau ---------------- */
  add({ id: 'app_compteur_energie', title: 'Compteur d\'énergie domestique', difficulty: 3, tags: ['énergie', 'kWh', 'PZEM', 'MQTT'],
    desc: 'Tension, courant, puissance, kWh et facteur de puissance, publiés en web, MQTT et vers le MASTER.',
    modules: [{ id: 'pzem004t' }, { id: 'oled_ssd1306' }], options: { web: true, mqtt: true, master: true } });
  add({ id: 'app_suivi_batterie', title: 'Suivi d\'une batterie / panneau solaire', tags: ['batterie', 'solaire', 'INA219'],
    desc: 'Tension, courant et puissance mesurés par INA219, enregistrés sur carte SD.',
    modules: [{ id: 'ina219' }, { id: 'sd_card' }, { id: 'oled_128x32' }], options: { master: true } });
  add({ id: 'app_enregistreur_meteo', title: 'Enregistreur de données climatiques', tags: ['enregistreur', 'microSD', 'RTC'],
    desc: 'Température, humidité et pression journalisées toutes les 10 s dans un CSV lisible par Excel.',
    modules: [{ id: 'bme280' }, { id: 'ds3231' }, { id: 'sd_card' }] });
  add({ id: 'app_capteur_lora', title: 'Capteur distant LoRa (plusieurs km)', difficulty: 3, tags: ['LoRa', 'longue portée', 'météo'],
    desc: 'Envoie température, humidité et pression par radio LoRa toutes les 10 s.',
    modules: [{ id: 'bme280' }, { id: 'lora_sx1278' }] });
  add({ id: 'app_capteur_master', title: 'Capteur connecté au tableau de bord du MASTER', difficulty: 1, tags: ['MASTER', 'télémétrie', 'Wi-Fi'],
    desc: 'Rejoint le Wi-Fi « ESP32-LAB » et envoie ses mesures au MASTER (onglet Capteurs).',
    modules: [{ id: 'sht4x' }, { id: 'bh1750' }], options: { master: true } });
  add({ id: 'app_scanner_ble', title: 'Détecteur de présence Bluetooth', tags: ['BLE', 'présence', 'LED'],
    desc: 'Compte les appareils BLE à proximité (téléphones, montres) ; LED allumée si l\'un est très proche.',
    modules: [{ id: 'ble_scanner' }, { id: 'led' }],
    rules: [{ if: { m: 0, out: 'best', op: '>', v: -60, hyst: 5 }, then: on(1), else: off(1) }] });
})(typeof globalThis !== 'undefined' ? globalThis : this);
