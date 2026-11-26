# AgriShield Hardware Architecture & Wiring Guide (ESP8266 NodeMCU)

## 1. System Overview
AgriShield integrates an **ESP8266 NodeMCU (ESP-12E / ESP-12F)** as the core field IoT sensor node. It connects to:
1. **DHT11**: Measures ambient temperature and relative humidity during pesticide spraying.
2. **NEO-6M GPS**: Tracks real-time field coordinates, altitude, and locked satellites.
3. **Wi-Fi Connectivity**: Transmits actual physical readings directly over your local area network (LAN) to Laptop 1 running the FastAPI backend at `http://172.16.0.31:8000`.

---

## 2. ESP8266 NodeMCU Pin Mapping Reference

On the ESP8266 NodeMCU board, the silkscreen pin labels (`D0`–`D8`) differ from internal ESP8266 GPIO numbers.

| NodeMCU Silk Label | Internal ESP8266 GPIO | Connected Component | Function & Hardware Notes |
| :--- | :--- | :--- | :--- |
| **3V3** | 3.3V Rail | **DHT11 VCC** | 3.3V Power Supply |
| **VIN** | 5V Rail (USB) | **NEO-6M VCC** | 5V Power Supply for GPS internal LDO regulator |
| **GND** | Ground | **DHT11 & GPS GND**| Common System Ground |
| **D2** | **GPIO 4** | **DHT11 DATA** | Single-wire digital data bus (Safe general I/O) |
| **D6** | **GPIO 12** | **NEO-6M TX** | **SoftwareSerial RX** (Receives 9600 baud NMEA stream) |
| **D5** | **GPIO 14** | **NEO-6M RX** | **SoftwareSerial TX** (Sends configuration commands) |
| **D1** | **GPIO 5** | **Buzzer (+)** | Acoustic alert output (Optional) |
| **D4** | **GPIO 2** | **Onboard LED** | Hardware status indicator (Active LOW) |
| **TX / RX** | **GPIO 1 / GPIO 3** | **USB Bridge** | Reserved for USB Serial Monitor (115200 baud) |

---

## 3. Detailed Component Wiring & Electrical Specifications

### A. DHT11 to ESP8266 NodeMCU
The DHT11 measures temperature (0°C to 50°C ±2°C) and relative humidity (20% to 90% RH ±5%).

* **VCC**: Connect to NodeMCU **3V3** (or **VIN** if your DHT11 is on a 5V breakout PCB).
* **GND**: Connect to NodeMCU **GND**.
* **DATA**: Connect to NodeMCU **D2** (`GPIO 4`).
* *Pull-Up Resistor Note*: If using a raw 4-pin DHT11 sensor without a PCB, place a **4.7kΩ to 10kΩ pull-up resistor** between VCC and DATA. If using a pre-soldered 3-pin breakout module (pins labeled `+`, `-`, `OUT`/`S`), the pull-up resistor is already onboard.

### B. NEO-6M GPS Module to ESP8266 NodeMCU
The u-blox NEO-6M receiver outputs standard NMEA 0183 sentences at 9600 baud.

* **ESP8266 UART Architecture Consideration**:
  The ESP8266 only has one full hardware UART (`Serial` on GPIO 1 & 3), which is permanently connected to the onboard USB-to-UART chip (CH340G or CP2102) for firmware uploading and debugging. To preserve serial debugging in the Arduino Serial Monitor at 115200 baud, the NEO-6M GPS is connected via **SoftwareSerial** on pins `D6` (RX) and `D5` (TX) at 9600 baud.
* **VCC**: Connect to NodeMCU **VIN (5V)**. The NEO-6M features an onboard 3.3V LDO regulator (RT9180); powering it from 5V VIN ensures optimal voltage for the active ceramic patch antenna.
* **GND**: Connect to NodeMCU **GND** (Common Ground).
* **TX**: Connect to NodeMCU **D6** (`GPIO 12` – SoftwareSerial RX). The NEO-6M TX outputs 3.3V logic, safe for the ESP8266 without level shifters.
* **RX**: Connect to NodeMCU **D5** (`GPIO 14` – SoftwareSerial TX). ESP8266 outputs 3.3V logic, fully compatible with the NEO-6M RX pin.
* *Antenna Placement*: The active ceramic patch antenna **must face open sky** with an unobstructed line of sight. When indoors or under metal roofs, the module will blink while searching for satellites and report `GPS FIX NOT AVAILABLE` until satellite ephemeris is locked.

---

## 4. Arduino IDE Upload Instructions for ESP8266 NodeMCU

Follow these exact steps to flash the firmware to your physical NodeMCU:

### Step 1: Install ESP8266 Board Package in Arduino IDE
1. Open **Arduino IDE**.
2. Go to **File -> Preferences**.
3. In **Additional Boards Manager URLs**, paste:
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
4. Click **OK**.
5. Go to **Tools -> Board -> Boards Manager...**.
6. Search for `esp8266` and click **Install** (by *ESP8266 Community*).

### Step 2: Install Required Libraries
Open **Tools -> Manage Libraries...** and install:
1. **`DHT sensor library`** by *Adafruit* (version 1.4.x)
   *(When prompted, also install the dependent `Adafruit Unified Sensor` library)*
2. **`TinyGPSPlus`** by *Mikal Hart* (version 1.0.3)
*(Note: `ESP8266WiFi`, `ESP8266HTTPClient`, and `SoftwareSerial` are built directly into the ESP8266 board package; no separate download is needed).*

### Step 3: Open the Firmware Sketch
1. In Arduino IDE, open:
   `c:\Users\ASUS\Music\Agrisheild\hardware\esp8266_nodemcu_node\esp8266_nodemcu_node.ino`
2. Configure your Wi-Fi credentials in lines 36–37:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_NAME";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
3. Verify Laptop 1's backend target URL on line 41:
   ```cpp
   const char* SERVER_BASE_URL = "http://172.16.0.31:8000";
   ```

### Step 4: Configure Board Settings
Under the **Tools** menu, select:
* **Board**: `NodeMCU 1.0 (ESP-12E Module)`
* **Upload Speed**: `115200` (or `921600` for faster flashing)
* **CPU Frequency**: `80 MHz` (or `160 MHz`)
* **Flash Size**: `4MB (FS:2MB OTA:~1019KB)`
* **Port**: Select the COM port corresponding to your NodeMCU (e.g., `COM3`, `COM4` via Silicon Labs CP2102 or CH340).

### Step 5: Upload & Monitor
1. Click the **Upload** arrow button (`Ctrl + U`).
2. Once upload completes (`Done uploading`), open **Tools -> Serial Monitor** (`Ctrl + Shift + M`).
3. Set the baud rate to **115200 baud**.
4. You will see:
   ```
   ==========================================================
     AGRISHIELD ESP8266 NODEMCU SENSOR NODE INITIALIZATION   
   ==========================================================
   [WIFI] Connected successfully!
   [WIFI] NodeMCU IP Address: 172.16.0.xx
   [DHT11] Physical Reading -> Temperature: 28.5 °C | Humidity: 64.0 %
   [GPS] Awaiting satellite fix...
   ```

---

## 5. Strict Data Policies

1. **Never Uses Fake Data**: The firmware never injects fallback values, random offsets, or hardcoded coordinates.
2. **Disconnection Detection**: If the DHT11 data line is pulled low or disconnected, the ESP8266 sends `sensor_status = "SENSOR_ERROR"` and passes `null` values to FastAPI.
3. **Satellite Fix Enforcement**: If the NEO-6M receiver has not locked onto at least 3 satellites or coordinates are `0,0`, it sends `gps_fix = false` and omits coordinates. The dashboard displays `GPS FIX NOT AVAILABLE` without rendering a false pin.
