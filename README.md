# AgriShield – Smart Farmer Safety Monitoring Platform

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20TailwindCSS-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![ESP8266](https://img.shields.io/badge/Hardware-ESP8266%20NodeMCU-E7352C?logo=espressif&logoColor=white)](https://www.espressif.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An intelligent, IoT-driven safety monitoring platform engineered specifically to safeguard agricultural workers during pesticide spraying, hazardous field conditions, and lone-worker farm operations.

---

## 🌟 Key Features

### 1. Real-Time Multi-Sensor Telemetry
- **DHT22 / DHT11 Climate Sensor**: Ambient temperature and relative humidity tracking with heat-stress alerts.
- **MQ-135 Gas & Air Quality Sensor**: True 10-bit raw ADC readings (`0–1023`) and relative air-quality index for hazardous chemical/pesticide fumes.
- **MPU6050 6-Axis IMU**: Accelerometer and gyroscope telemetry for real-time fall and sudden impact detection.
- **NEO-6M GPS Module**: Real-time satellite latitude, longitude, altitude, and ground speed coordinates with OpenStreetMap visualization.
- **Onboard Acoustic & Visual Alarms**: Immediate local buzzer siren and 16x2 I2C LCD diagnostic status readouts.

### 2. Physical Device Authentication & Security
- Cryptographic API Key and bcrypt-hashed Device Secret Key verification.
- Required 4-Header Security Handshake:
  - `X-Device-API-Key`
  - `X-Device-Key`
  - `X-Device-Id`
  - `X-Device-UID`
- Anti-tampering fleet management with single-reveal key rotation.

### 3. Smart Fall & Emergency Response
- Instantaneous **Manual SOS** trigger on farmer dashboard.
- Automated **Possible Fall Detection** alerts with threshold-based vector magnitude calculations.
- Live emergency dispatch broadcast via WebSockets.

### 4. Interactive Dashboards & Multi-Language Support
- **Farmer Dashboard**: Real-time sensor gauge readings, interactive GPS field map, and emergency SOS dispatch.
- **Admin Command Portal**: Fleet management, device credential rotation, farmer assignment, and audit logs.
- **Tri-Lingual Localization**: English, Kannada (ಕನ್ನಡ), and Hindi (हिंदी).

---

## 🏗️ Hardware Architecture & Pin Mapping

### ESP8266 NodeMCU V3 Pinout

| Peripheral | NodeMCU Pin | GPIO | Protocol / Function |
|---|---|---|---|
| **DHT22 / DHT11** | `D2` | `GPIO 4` | Single-Bus Digital Data |
| **MQ-135 Gas Sensor** | `A0` | `ADC0` | 10-Bit Raw Analog Input (0–1023) |
| **NEO-6M GPS TX** | `D6` | `GPIO 12` | SoftwareSerial RX (9600 baud) |
| **NEO-6M GPS RX** | `D5` | `GPIO 14` | SoftwareSerial TX (9600 baud) |
| **MPU6050 / LCD SDA** | `D2` | `GPIO 4` | I2C Data Bus |
| **MPU6050 / LCD SCL** | `D1` | `GPIO 5` | I2C Clock Bus |
| **Active Buzzer Alarm** | `D7` | `GPIO 13` | Digital Output Alarm Siren |
| **Onboard Warning LED** | `D4` | `GPIO 2` | Active-LOW Status Indicator |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.11)
- Node.js 18+ & npm
- Arduino IDE (with ESP8266 board definitions & required libraries: `DHT`, `TinyGPSPlus`, `LiquidCrystal_I2C`)

### 2. Backend Setup (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run server on port 8001
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
Swagger UI: [http://localhost:8001/docs](http://localhost:8001/docs)

### 3. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Platform: [http://localhost:5173/](http://localhost:5173/)

---

## 📱 Registered Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Administrator** | `nikhilgodar03@gmail.com` | `12345678` |
| **Farmer (Mithun - Device #3)** | `mithunhp3@gmail.com` | `password123` |

---

## 📄 License
This project is licensed under the MIT License.
