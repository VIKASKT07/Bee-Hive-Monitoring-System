# 🐝 Smart Beehive Monitoring System

The **Smart Beehive Monitoring System** is an IoT-based solution designed to monitor environmental conditions inside and around a beehive using multiple sensors. The system collects data such as temperature, smoke presence, weight, and light activity, helping beekeepers remotely track the health and safety of the hive.

It integrates real-time monitoring through the **Blynk IoT cloud platform**, along with a **custom-built web dashboard** using **Flask** and **SQLite** to store and visualize historical data.

---

## 📌 Features

- 🌡️ **Temperature Monitoring** using DHT11 — automatically triggers a fan if the hive gets too hot.
- 💨 **Smoke Detection** using MQ2 Sensor — activates fan if smoke is detected near the hive.
- ⚖️ **Weight Monitoring** using HX711 with 20kg Load Cell — helps track honey production or sudden hive loss.
- 💡 **Light Activity Detection** using LDR — detects movement based on light fluctuation caused by bee activity.
- 🌐 **Cloud Integration** with Blynk — monitor sensor data and receive alerts on mobile.
- 📊 **Web Dashboard** — View live and historical data using Flask + SQLite backend.

---

## 🧠 Technologies Used

| Category         | Tools / Platforms           |
|------------------|-----------------------------|
| Hardware         | ESP32, DHT11, MQ2, HX711 + Load Cell (20kg), LDR |
| Cloud Platform   | Blynk IoT (Blynk.Cloud)     |
| Web Development  | Flask (Python)              |
| Database         | SQLite                      |
| Protocols        | HTTP, Serial (for sensor reading) |
| Frontend         | React, Tailwind CSS |

---

## 🔌 Hardware Setup

| Sensor  | Purpose                        | Action on Threshold          |
|---------|--------------------------------|------------------------------|
| DHT11   | Measures Hive Temperature      | Fan ON if temp > threshold  |
| MQ2     | Detects Smoke Around Hive      | Fan ON if smoke is detected |
| HX711 + Load Cell | Measures Hive Weight         | Data sent to cloud + DB     |
| LDR     | Detects Bee Movement via Light | Count blink activity        |

Fan control is handled via GPIO pin on ESP32 and triggered when DHT11 or MQ2 values exceed the set limit.

---

## 📲 Cloud Dashboard (Blynk)

The ESP32 sends real-time data to **Blynk Cloud**. Alerts and sensor values can be viewed on the Blynk mobile app. You can:

- Monitor temperature, smoke, light, and weight
- Set thresholds for alerts
- View live graph updates for each parameter
- Receive push notifications when threshold is breached

---

## 💻 Local Web Dashboard

The **Flask** backend receives sensor data (via HTTP POST or Serial), stores it in a **SQLite database**, and displays it on a web dashboard.

### Web Dashboard Features:

- Live view of all 4 sensor values
- Threshold breach indicators
- Data logs for weight, temperature, smoke, and LDR
- Responsive UI (can be viewed from mobile/PC)

---

## ⚙️ Installation & Setup

### 1. **Hardware Setup**
- Connect all sensors to ESP32 GPIOs.
- Configure DHT11, MQ2, HX711, and LDR with appropriate power and data pins.
- Use a relay (optional) for fan control via GPIO.

### 2. **Flashing ESP32**
- Install the Arduino IDE
- Install ESP32 board manager & libraries (`DHT`, `MQ2`, `HX711`, `Blynk`)
- Upload the firmware to ESP32 (ensure WiFi and Blynk credentials are added)

### 3. **Web Dashboard Setup**
```bash
git clone https://github.com/VIKASKT07/Bee-Hive-Monitoring-System.git
cd Bee-Hive-Monitoring-System
-Install all the dependencies
python app.py
