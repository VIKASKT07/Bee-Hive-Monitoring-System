/* --- Blynk credentials --- */
#define BLYNK_TEMPLATE_ID "TEMPLATE ID"         // <-- copy from blynk.cloud
#define BLYNK_TEMPLATE_NAME "TEMPLATE NAME"
#define BLYNK_AUTH_TOKEN "BLYNK_AUTH_TOKEN"

/* ---------------  Wi-Fi creds (edit!)  --------------- */
char ssid[] = "ssid";
char pass[] = "passwd";                 // <-- change in real code

/* --- Libraries --- */
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <BlynkSimpleEsp32.h>
#include "DHT.h"
#include "HX711.h"

void sendGasEvent(int);
void sendWeightEvent(float);

/* --- Pins --- */
#define GAS_PIN     36     // MQ-series analog
#define FAN_PIN     25     // Relay/MOSFET
#define DHTPIN      18
#define DHTTYPE     DHT11
#define LDR_PIN     34     // ADC1
#define DT_PIN      4      // HX711 DT pin
#define SCK_PIN     5      // HX711 SCK pin
const char* SERVER_URL = "http://192.168.43.127:5000/api/gas";  /*this SERVER_URL and SERVER_WEIGHT_URL changed whever wifi connected to laptop(givem above is changed)*/
/*const char* SERVER_URL = "http://192.168.0.100:5000/api/gas";*/
const char* SERVER_WEIGHT_URL ="http://192.168.43.127:5000/api/weight";
int ledPin = 2; // GPIO2

/* --- Time Config --- */
const long gmtoffset_sec = 19800;
const int daylightoffset_sec = 0;

/* --- Thresholds --- */
const int GAS_THRESHOLD = 1000;
const int LDR_THRESHOLD = 1000;  // Tweak for your lighting
const int TEMP_THRESHOLD = 60;
float SEMI_WEIGHT_THRESHOLD = 200.0;    // Example: Semi threshold = 200g
float FULL_WEIGHT_THRESHOLD = 500.0;    // Full threshold = 500g

float calibration_factor = 230.7059;    // Your Load cell calibration factor
BlynkTimer timer;
float temp;
float hum;

/* --- Sensor setup --- */
DHT dht(DHTPIN, DHTTYPE);
HX711 scale;

/* --- State Flags --- */
bool userOverride = false;
bool fanState = false;
bool gasDetect = false;
bool leakLatched = false;
int lightOffCount = 0;
unsigned long lastLdrResetTime = 0;
bool semiAlertSent = false;
bool fullAlertSent = false;

/* === BLYNK virtual pin callbacks === */
BLYNK_WRITE(V2)
{
  double v = param.asInt();
  userOverride = (v == 1);
}

/* === Main periodic sensor task === */
void sampleAndPublish()
{
  int gasRaw = analogRead(GAS_PIN);
  Blynk.virtualWrite(V0, gasRaw);  // Gas gauge

  // === DHT11 readings ===
  temp = dht.readTemperature();
  hum = dht.readHumidity();
  //Serial.println(hum);
  Serial.println(temp);
  if (!isnan(temp)) Blynk.virtualWrite(V3, temp);
  if (!isnan(hum))  Blynk.virtualWrite(V4, hum);

  if (userOverride) {
    fanState = true;
  } else {
    gasDetect = (gasRaw > GAS_THRESHOLD)||(temp >TEMP_THRESHOLD) ;
    fanState = gasDetect;
  }

  digitalWrite(FAN_PIN, fanState || gasDetect ? LOW : HIGH);
  Blynk.virtualWrite(V1, gasDetect ? "Gas Detected" : "Safe Level");

  bool leakNow = (gasRaw > GAS_THRESHOLD);
  if (leakNow && !leakLatched) {
    sendGasEvent(gasRaw);
    leakLatched = true;
  }
  if (!leakNow) leakLatched = false;

//  // === DHT11 readings ===
//  temp = dht.readTemperature();
//  hum = dht.readHumidity();
//  //Serial.println(hum);
//  Serial.println(temp);
//  if (!isnan(temp)) Blynk.virtualWrite(V3, temp);
//  if (!isnan(hum))  Blynk.virtualWrite(V4, hum);

  // === LDR Logic ===
  int ldrValue = analogRead(LDR_PIN);
  Serial.printf("LDR = %d\n", ldrValue);

  if (ldrValue > 0) {
    lightOffCount++;
  }

  unsigned long now = millis();
  if (now - lastLdrResetTime >= 30000) {  // 30 seconds
    //Serial.println(lightOffCount);
    Blynk.virtualWrite(V5, lightOffCount);  // Show count in app
    lightOffCount = 0;
    lastLdrResetTime = now;
  }

  //Blynk.virtualWrite(V5, lightOffCount);  // Show count in app
    /* --- Load Cell Weight Reading --- */
  if (scale.is_ready()) {
    float weight = scale.get_units(10);  // Average over 10 samples

    Serial.print("Weight RAW: ");
    Serial.println(weight, 2);
//    if(weight  < 0 ){
//      weight = weight* -1;
//    }
    
    Serial.print("Weight (g): ");
    Serial.println(weight, 2);

    Blynk.virtualWrite(V6, weight);  // Sending live weight to Blynk (optional)

    if (weight > SEMI_WEIGHT_THRESHOLD && weight <= FULL_WEIGHT_THRESHOLD) {
      Serial.println("Semi Threshold Crossed");
      sendWeightEvent(weight);
       semiAlertSent = true;
       fullAlertSent = false;
    } else if (weight > FULL_WEIGHT_THRESHOLD) {
      Serial.println("Full Threshold ALERT!");
      sendWeightEvent(weight);
       fullAlertSent = true;
       semiAlertSent = false;
    }
  } else {
    Serial.println("HX711 not found. Check wiring.");
  }
}

/* === POST gas event === */
void sendGasEvent(int gasRaw)
{
  time_t now = time(nullptr);
  if (now < 10000) return;

  struct tm timeinfo;
  if (!localtime_r(&now, &timeinfo)) return;

  char isoTime[25];
  strftime(isoTime, sizeof(isoTime), "%Y-%m-%dT%H:%M:%S", &timeinfo);

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["value"] = gasRaw;
  doc["ts"] = isoTime;

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  Serial.printf("POST /api/gas -> %d\n", code);

  if (code > 200) {
    String resp = http.getString();
    Serial.println(resp);
  }
  http.end();
}

/*----Weight Send---*/
void sendWeightEvent(float weight){
  time_t now = time(nullptr);
  if (now < 10000) return;

  struct tm timeinfo;
  if (!localtime_r(&now, &timeinfo)) return;

  char isoTime[25];
  strftime(isoTime, sizeof(isoTime), "%Y-%m-%d, %H:%M:%S", &timeinfo);

  HTTPClient http;
  http.begin(SERVER_WEIGHT_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["weight"] = weight;
  doc["ts"] = isoTime;

  String payload;
  serializeJson(doc, payload);
  int code = http.POST(payload);
  Serial.printf("POST /api/weight -> %d\n", code);
  http.end();
}

/* === Setup === */
void setup()
{
  Serial.begin(115200);
  delay(1000);
  Serial.println("STARTING...");

  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, HIGH); // Turn LED ON

  pinMode(GAS_PIN, INPUT);
  pinMode(FAN_PIN, OUTPUT);
  digitalWrite(FAN_PIN, HIGH);
  pinMode(LDR_PIN, INPUT);

  dht.begin();

  /* --- HX711 Setup --- */
  scale.begin(DT_PIN, SCK_PIN);
  scale.set_scale(calibration_factor);
  scale.tare();
  Serial.println("HX711 Setup Done");

  Serial.println("Connecting to Blynk...");
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);

  Serial.println("Connected to Blynk!");
  timer.setInterval(2000L, sampleAndPublish);

  configTime(gmtoffset_sec, daylightoffset_sec, "pool.ntp.org");
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    Serial.println("Waiting for time sync...");
    delay(1000);
  }
  Serial.println("Time synced!");
}

/* === Loop === */
void loop()
{
  Blynk.run();
  timer.run();
}