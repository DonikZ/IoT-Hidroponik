/*
  ==============================================================================
  PANGAN-SENSE: SISTEM MONITORING & KONTROL HIDROPONIK ESP32 via MQTT
  ==============================================================================
  
  Wiring Koneksi Pin ESP32:
  ------------------------------------------------------------------------------
  Komponen      Pin Sensor/Modul     Pin ESP32          Keterangan
  ------------------------------------------------------------------------------
  DHT22         VCC                  3.3V               Daya 3.3V sensor DHT22
  DHT22         DATA                 GPIO 4             Jalur Data Suhu/Kelembapan
  DHT22         GND                  GND                Ground Bersama
  
  HC-SR04       VCC                  5V                 Daya 5V Ultrasonic
  HC-SR04       TRIG                 GPIO 5             Trigger Pulsa
  HC-SR04       ECHO                 GPIO 18            Echo Pulsa (via Voltage Divider)
  HC-SR04       GND                  GND                Ground Bersama
  
  Relay (Pompa) VCC                  5V                 Daya Modul Relay
  Relay (Pompa) GND                  GND                Ground Bersama
  Relay (Pompa) IN                   GPIO 26            Kendali Pompa Air/Nutrisi
  
  Buzzer Aktif  (+)                  GPIO 27            Sinyal Alarm Buzzer
  Buzzer Aktif  (-)                  GND                Ground Bersama
  
  ESP32 Power   VIN                  5V (Buck Converter) Catu Daya Utama 5V
  ESP32 Power   GND                  GND                 Ground Utama
  ------------------------------------------------------------------------------
  
  Library Arduino IDE yang Dibutuhkan (Install via Library Manager):
  1. DHT sensor library by Adafruit
  2. Adafruit Unified Sensor
  3. PubSubClient by Nick O'Leary
  4. ArduinoJson by Benoit Blanchon (v6 atau v7)
  ==============================================================================
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

// ==================== KONFIGURASI WIFI & MQTT ====================
const char* WIFI_SSID     = "NAMA_WIFI_ANDA";     // Ganti dengan SSID WiFi Anda
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA"; // Ganti dengan Password WiFi Anda

// Broker MQTT Publik (Gratis & Mendukung WebSockets untuk Dashboard Web)
// Port TCP ESP32: 1883 | Port Web Dashboard (WSS): 8084 (broker.emqx.io)
const char* MQTT_BROKER   = "broker.emqx.io";
const int   MQTT_PORT     = 1883;
const char* MQTT_CLIENT_ID= "ESP32_PanganSense_Hidroponik";

// Topik MQTT
const char* TOPIC_TELEMETRI = "hidroponik/telemetri"; // Publish data sensor
const char* TOPIC_KENDALI   = "hidroponik/kendali";   // Subscribe kontrol JSON
const char* TOPIC_POMPA     = "hidroponik/pompa";     // Subscribe kontrol pompa ("1"/"0")
const char* TOPIC_BUZZER    = "hidroponik/buzzer";    // Subscribe kontrol buzzer ("1"/"0")
const char* TOPIC_MODE      = "hidroponik/mode";      // Subscribe mode ("auto"/"manual")
const char* TOPIC_CONFIG    = "hidroponik/config";    // Subscribe update ambang batas

// ==================== INTEGRASI n8n WEBHOOK (OPSIONAL) ====================
// Catatan Arsitektur:
// METODE A (Rekomendasi): Gunakan node 'MQTT Trigger' di n8n untuk mendengarkan topik
//                         'hidroponik/telemetri'. Tidak membebani RAM ESP32 dan lebih cepat.
// METODE B (Langsung HTTP): Set ENABLE_N8N_WEBHOOK = true di bawah jika ingin ESP32
//                           mengirim HTTP POST langsung ke n8n webhook saat ada event penting.
#define ENABLE_N8N_WEBHOOK false
const char* N8N_WEBHOOK_URL = "http://192.168.1.100:5678/webhook/hidroponik-alert";

// Anti-Spam Telegram / Debounce timer agar bot Telegram tidak diblokir (Error 429)
unsigned long lastWebhookAlertMillis = 0;
const unsigned long MIN_ALERT_INTERVAL = 30000; // Minimal jeda 30 detik antar alert n8n
unsigned long lastPeriodicReportMillis = 0;
const unsigned long PERIODIC_INTERVAL = 1800000; // Kirim laporan rutin setiap 30 menit

bool previousAlarmState = false;
bool previousRelayState = false;

// ==================== DEFINISI PIN ====================
#define DHT_PIN      4
#define DHT_TYPE     DHT22

#define TRIG_PIN     5
#define ECHO_PIN     18

#define RELAY_PIN    26
#define BUZZER_PIN   27

// Catatan relay:
// Sebagian besar modul relay aktif LOW (LOW = ON, HIGH = OFF).
// Jika relay Anda aktif HIGH, ubah nilai di bawah menjadi false.
const bool RELAY_ACTIVE_LOW = false; 

// ==================== PARAMETER SISTEM & ALARM ====================
float batasJarak = 10.0; // cm (Alarm jika jarak air <= 10 cm / meluap/terlalu dekat)
float batasSuhu  = 30.0; // °C (Alarm jika suhu udara >= 30 °C)

String currentMode = "auto"; // "auto" atau "manual"
bool relayState    = false;  // false: OFF, true: ON
bool buzzerState   = false;  // false: OFF, true: ON
bool alarmActive   = false;

// Objek Sensor & Komunikasi
DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Timer non-blocking
unsigned long lastTelemetryMillis = 0;
const unsigned long TELEMETRY_INTERVAL = 2000; // Kirim data setiap 2 detik

// ==================== FUNGSI KENDALI AKTUATOR ====================
void setRelay(bool state) {
  relayState = state;
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(RELAY_PIN, state ? LOW : HIGH);
  } else {
    digitalWrite(RELAY_PIN, state ? HIGH : LOW);
  }
  Serial.print("[RELAY] Pompa: ");
  Serial.println(state ? "ON" : "OFF");
}

void setBuzzer(bool state) {
  buzzerState = state;
  digitalWrite(BUZZER_PIN, state ? HIGH : LOW);
  Serial.print("[BUZZER] Alarm: ");
  Serial.println(state ? "BUNYI (ON)" : "SENYAP (OFF)");
}

// ==================== BACA SENSOR HC-SR04 ====================
float readUltrasonicDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long durasi = pulseIn(ECHO_PIN, HIGH, 30000); // Timeout 30ms

  if (durasi <= 0) {
    return -1.0; // Tidak terdeteksi / di luar jangkauan
  }
  
  float jarak = (durasi * 0.0343) / 2.0;
  return jarak;
}

// ==================== CALLBACK MQTT (PESAN MASUK) ====================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();
  
  Serial.print("[MQTT PESAN MASUK] Topik: ");
  Serial.print(topic);
  Serial.print(" | Pesan: ");
  Serial.println(message);

  // 1. Kontrol Pompa Langsung (Topik: hidroponik/pompa)
  if (String(topic) == TOPIC_POMPA) {
    if (message == "1" || message.equalsIgnoreCase("ON") || message.equalsIgnoreCase("TRUE")) {
      setRelay(true);
    } else if (message == "0" || message.equalsIgnoreCase("OFF") || message.equalsIgnoreCase("FALSE")) {
      setRelay(false);
    }
  }
  
  // 2. Kontrol Buzzer Langsung (Topik: hidroponik/buzzer)
  else if (String(topic) == TOPIC_BUZZER) {
    if (message == "1" || message.equalsIgnoreCase("ON") || message.equalsIgnoreCase("TRUE")) {
      setBuzzer(true);
    } else if (message == "0" || message.equalsIgnoreCase("OFF") || message.equalsIgnoreCase("FALSE")) {
      setBuzzer(false);
    }
  }

  // 3. Ubah Mode (Topik: hidroponik/mode)
  else if (String(topic) == TOPIC_MODE) {
    if (message.equalsIgnoreCase("auto") || message.equalsIgnoreCase("manual")) {
      currentMode = message;
      Serial.print("[SISTEM] Mode diubah ke: ");
      Serial.println(currentMode);
    }
  }

  // 4. Update Konfigurasi Ambang Batas JSON (Topik: hidroponik/config)
  else if (String(topic) == TOPIC_CONFIG) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, message);
    if (!err) {
      if (doc.containsKey("batasJarak")) batasJarak = doc["batasJarak"];
      if (doc.containsKey("batasSuhu"))  batasSuhu  = doc["batasSuhu"];
      if (doc.containsKey("mode"))       currentMode = doc["mode"].as<String>();
      
      Serial.println("[CONFIG] Ambang batas diperbarui dari Web:");
      Serial.print("  - Batas Jarak: "); Serial.print(batasJarak); Serial.println(" cm");
      Serial.print("  - Batas Suhu : "); Serial.print(batasSuhu);  Serial.println(" C");
      Serial.print("  - Mode       : "); Serial.println(currentMode);
    }
  }

  // 5. Kontrol Gabungan JSON (Topik: hidroponik/kendali)
  else if (String(topic) == TOPIC_KENDALI) {
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, message);
    if (!err) {
      if (doc.containsKey("relay")) {
        setRelay(doc["relay"] == 1 || doc["relay"] == true);
      }
      if (doc.containsKey("buzzer")) {
        setBuzzer(doc["buzzer"] == 1 || doc["buzzer"] == true);
      }
      if (doc.containsKey("mode")) {
        currentMode = doc["mode"].as<String>();
      }
    }
  }
}

// ==================== KONEKSI WIFI & MQTT ====================
void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Terhubung!");
    Serial.print("IP Address ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Gagal Terhubung! Akan dicoba ulang di background.");
  }
}

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  while (!mqttClient.connected()) {
    Serial.print("Mencoba koneksi ke Broker MQTT: ");
    Serial.println(MQTT_BROKER);

    String clientId = String(MQTT_CLIENT_ID) + "_" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println(">> MQTT Terhubung!");

      // Subscribe topik kendali
      mqttClient.subscribe(TOPIC_POMPA);
      mqttClient.subscribe(TOPIC_BUZZER);
      mqttClient.subscribe(TOPIC_MODE);
      mqttClient.subscribe(TOPIC_CONFIG);
      mqttClient.subscribe(TOPIC_KENDALI);

      Serial.println(">> Berhasil subscribe topik kendali & telemetri!");
    } else {
      Serial.print("Gagal konek MQTT, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" Mencoba lagi dalam 4 detik...");
      delay(4000);
      break;
    }
  }
}

// ==================== PENGIRIMAN n8n WEBHOOK (DIRECT HTTP) ====================
void sendN8nWebhook(const char* eventType, float suhu, float kelembapan, float jarak, bool alarm, bool relay) {
#if ENABLE_N8N_WEBHOOK
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[n8n Webhook] WiFi tidak tersambung, batal kirim.");
    return;
  }

  HTTPClient http;
  http.begin(N8N_WEBHOOK_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000); // Batasi timeout 4 detik agar tidak memblokir loop

  StaticJsonDocument<350> doc;
  doc["event"]       = eventType;
  doc["suhu"]        = !isnan(suhu) ? round(suhu * 10) / 10.0 : 0.0;
  doc["kelembapan"]   = !isnan(kelembapan) ? round(kelembapan * 10) / 10.0 : 0.0;
  doc["jarak"]       = jarak >= 0 ? round(jarak * 10) / 10.0 : -1.0;
  doc["relay"]       = relay ? 1 : 0;
  doc["buzzer"]      = buzzerState ? 1 : 0;
  doc["alarm"]       = alarm;
  doc["mode"]        = currentMode;
  doc["batasJarak"]  = batasJarak;
  doc["batasSuhu"]   = batasSuhu;
  doc["device"]      = "ESP32_Hidroponik";
  doc["timestamp"]   = millis() / 1000;

  // Format pesan siap kirim untuk Telegram
  String telegramMessage = "";
  if (String(eventType) == "ALARM_TRIGGER") {
    telegramMessage = "🚨 *PERINGATAN HIDROPONIK!*\n";
    if (jarak >= 0 && jarak <= batasJarak) {
      telegramMessage += "⚠️ *Air Tandon Meluap/Dekat!* Jarak: " + String(jarak, 1) + " cm (Batas: " + String(batasJarak, 1) + " cm)\n";
    }
    if (!isnan(suhu) && suhu >= batasSuhu) {
      telegramMessage += "🔥 *Suhu Terlalu Panas!* Suhu: " + String(suhu, 1) + " °C (Batas: " + String(batasSuhu, 1) + " °C)\n";
    }
    telegramMessage += "💧 Kelembapan: " + String(kelembapan, 1) + " %\n";
    telegramMessage += "🔊 Buzzer: AKTIF | Pompa: " + String(relay ? "ON" : "OFF");
  } else if (String(eventType) == "ALARM_NORMAL") {
    telegramMessage = "✅ *KONDISI HIDROPONIK NORMAL KEMBALI*\nSuhu: " + String(suhu, 1) + " °C | Jarak: " + String(jarak, 1) + " cm\nBuzzer: OFF";
  } else if (String(eventType) == "PUMP_CHANGE") {
    telegramMessage = "🔄 *STATUS POMPA BERUBAH*\nPompa Relay (GPIO 26): " + String(relay ? "MENYALA (ON)" : "MATI (OFF)") + "\nMode: " + currentMode;
  } else {
    telegramMessage = "📊 *LAPORAN RUTIN HIDROPONIK*\nSuhu: " + String(suhu, 1) + " °C\nKelembapan: " + String(kelembapan, 1) + " %\nJarak Air: " + String(jarak, 1) + " cm\nPompa: " + String(relay ? "ON" : "OFF");
  }
  doc["telegram_text"] = telegramMessage;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.print("[n8n Webhook] Mengirim event '");
  Serial.print(eventType);
  Serial.print("' ke URL: ");
  Serial.println(N8N_WEBHOOK_URL);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.printf("[n8n Webhook] Berhasil terkirim! Respon HTTP: %d\n", httpCode);
  } else {
    Serial.printf("[n8n Webhook] Gagal kirim! Error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
#endif
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==============================================");
  Serial.println("  PANGAN-SENSE: HIDROPONIK ESP32 MQTT");
  Serial.println("  DHT22 + HC-SR04 + RELAY POMPA + BUZZER ALARM");
  Serial.println("==============================================");

  // Inisialisasi Pin
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Kondisi awal aktuator: OFF
  digitalWrite(TRIG_PIN, LOW);
  setRelay(false);
  setBuzzer(false);

  // Inisialisasi Sensor DHT22
  dht.begin();
  Serial.println("DHT22 Siap.");

  // Koneksi Jaringan
  setupWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  // Nada beep 2x pertanda booting selesai
  digitalWrite(BUZZER_PIN, HIGH);
  delay(80);
  digitalWrite(BUZZER_PIN, LOW);
  delay(80);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(80);
  digitalWrite(BUZZER_PIN, LOW);
}

// ==================== LOOP UTAMA ====================
void loop() {
  // Jaga koneksi MQTT
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMQTT();
    }
    mqttClient.loop();
  }

  // Timer kirim telemetri & eksekusi logika otomasi
  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryMillis >= TELEMETRY_INTERVAL) {
    lastTelemetryMillis = currentMillis;

    // 1. Baca Sensor HC-SR04
    float jarak = readUltrasonicDistance();

    // 2. Baca Sensor DHT22
    float suhu = dht.readTemperature();
    float kelembapan = dht.readHumidity();

    // Serial Print untuk Debugging Arduino IDE
    Serial.println("----------------------------------------------");
    if (jarak >= 0) {
      Serial.printf("Ketinggian Air (Jarak Sensor): %.1f cm\n", jarak);
    } else {
      Serial.println("Ketinggian Air: Sensor HC-SR04 Tidak Terdeteksi!");
    }

    if (!isnan(suhu) && !isnan(kelembapan)) {
      Serial.printf("Suhu Udara       : %.1f C\n", suhu);
      Serial.printf("Kelembapan Udara : %.1f %%\n", kelembapan);
    } else {
      Serial.println("Peringatan: Gagal membaca sensor DHT22!");
    }

    // 3. Logika Alarm & Otomatisasi
    bool jarakDekat = (jarak >= 0 && jarak <= batasJarak);
    bool suhuTinggi = (!isnan(suhu) && suhu >= batasSuhu);
    alarmActive = (jarakDekat || suhuTinggi);

    if (currentMode == "auto") {
      // Pada mode otomatis, buzzer mengikuti kondisi batas bahaya
      if (alarmActive) {
        setBuzzer(true);
        Serial.println(">>> ALARM OTOMATIS AKTIF! (Air meluap/terlalu dekat ATAU Suhu panas)");
      } else {
        setBuzzer(false);
        Serial.println(">>> Kondisi Otomatis: Normal");
      }
    } else {
      // Pada mode manual, buzzer dan pompa murni dikendalikan oleh perintah Web/User
      Serial.println(">>> Mode: MANUAL (Aktuator dikendalikan dari Web)");
    }

    // 4. Publish Telemetri ke Broker MQTT
    if (mqttClient.connected()) {
      StaticJsonDocument<256> doc;
      doc["suhu"]       = !isnan(suhu) ? round(suhu * 10) / 10.0 : 0.0;
      doc["kelembapan"] = !isnan(kelembapan) ? round(kelembapan * 10) / 10.0 : 0.0;
      doc["jarak"]      = jarak >= 0 ? round(jarak * 10) / 10.0 : -1.0;
      doc["relay"]      = relayState ? 1 : 0;
      doc["buzzer"]     = buzzerState ? 1 : 0;
      doc["alarm"]      = alarmActive;
      doc["mode"]       = currentMode;
      doc["uptime"]     = millis() / 1000;

      char buffer[256];
      serializeJson(doc, buffer);
      mqttClient.publish(TOPIC_TELEMETRI, buffer);

      Serial.print("[MQTT PUBLISH] Payload: ");
      Serial.println(buffer);
    }

    // 5. Integrasi n8n Webhook Berbasis Event (Anti-Spam Telegram)
#if ENABLE_N8N_WEBHOOK
    // A. Deteksi Transisi Alarm (Kondisi Berubah)
    if (alarmActive != previousAlarmState) {
      if (currentMillis - lastWebhookAlertMillis >= MIN_ALERT_INTERVAL) {
        lastWebhookAlertMillis = currentMillis;
        previousAlarmState = alarmActive;
        sendN8nWebhook(alarmActive ? "ALARM_TRIGGER" : "ALARM_NORMAL", suhu, kelembapan, jarak, alarmActive, relayState);
      }
    }

    // B. Deteksi Perubahan Status Pompa
    if (relayState != previousRelayState) {
      previousRelayState = relayState;
      sendN8nWebhook("PUMP_CHANGE", suhu, kelembapan, jarak, alarmActive, relayState);
    }

    // C. Laporan Rutin Berkala (Misal tiap 30 menit)
    if (currentMillis - lastPeriodicReportMillis >= PERIODIC_INTERVAL) {
      lastPeriodicReportMillis = currentMillis;
      sendN8nWebhook("PERIODIC_REPORT", suhu, kelembapan, jarak, alarmActive, relayState);
    }
#endif
  }
}
