import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, Activity, AlertTriangle, Volume2, MapPin, Bell,
  Cpu, HeartHandshake, CheckCircle2, ArrowRight,
  ExternalLink, Sparkles, Send, ShieldCheck
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const [contactSubmitted, setContactSubmitted] = useState(false);

  return (
    <div className="space-y-24 pb-16">
      {/* 3D Greenery Agricultural Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
        {/* Background Gradients & Organic 3D Shapes */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-leaf-400/20 via-forest-500/15 to-transparent rounded-full blur-3xl opacity-70" />
          <div className="absolute top-10 right-10 w-96 h-96 bg-forest-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 left-10 w-96 h-96 bg-leaf-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & Call to Action */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-leaf-100/80 dark:bg-forest-900/60 border border-leaf-300 dark:border-forest-700 text-xs font-semibold text-forest-800 dark:text-leaf-300">
                <Sparkles className="w-3.5 h-3.5 text-leaf-600" />
                <span>{t('hero.badge')}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.15]">
                {t('hero.title_part1')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-forest-700 via-leaf-600 to-forest-800 dark:from-leaf-400 dark:to-leaf-200">
                  {t('hero.title_part2')}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {t('hero.subtitle')}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  to="/register"
                  className="px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-forest-700 to-leaf-600 hover:from-forest-800 hover:to-leaf-700 shadow-lg shadow-forest-900/20 hover:scale-[1.02] transition-all flex items-center space-x-2"
                >
                  <span>{t('nav.get_started')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login"
                  className="px-6 py-3.5 rounded-xl font-bold text-sm text-forest-900 dark:text-leaf-300 bg-white dark:bg-charcoal-900 border border-gray-300 dark:border-forest-800 hover:border-leaf-500 shadow-sm transition-all"
                >
                  {t('hero.cta_farmer')}
                </Link>

                <Link
                  to="/admin/login"
                  className="px-5 py-3.5 rounded-xl font-semibold text-xs text-gray-600 dark:text-gray-300 hover:text-forest-700 dark:hover:text-leaf-400 flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>{t('hero.cta_admin')}</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 border-t border-gray-200/60 dark:border-forest-900/60 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <p className="text-xl font-bold text-forest-800 dark:text-leaf-400">100%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Secure Native Auth</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-forest-800 dark:text-leaf-400">&lt; 2s</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">SOS Alert Latency</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-forest-800 dark:text-leaf-400">3-Lang</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">EN / ಕನ್ನಡ / हिंदी</p>
                </div>
              </div>
            </div>

            {/* Right Column: Live Safety Mockup Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white/90 dark:bg-charcoal-900/90 rounded-3xl p-6 shadow-2xl border border-gray-200/80 dark:border-forest-800 backdrop-blur-xl">
                {/* Header of Mockup */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-forest-900">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">Field Node: ESP32-AGRI-001</h4>
                      <p className="text-[10px] text-gray-400">Ramesh Gowda • Ramanagara</p>
                    </div>
                  </div>
                  <StatusBadge status="LIVE" size="sm" />
                </div>

                {/* Telemetry Grid */}
                <div className="grid grid-cols-2 gap-3 my-4">
                  <div className="p-3 rounded-2xl bg-forest-50/80 dark:bg-forest-950/60 border border-forest-100 dark:border-forest-900">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">Air Quality Index</span>
                    <span className="text-lg font-bold text-forest-900 dark:text-leaf-300">142</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold mt-0.5">Normal Atmosphere</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-forest-50/80 dark:bg-forest-950/60 border border-forest-100 dark:border-forest-900">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">DHT11 Temp & Hum</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">29.4°C</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block">62% Humidity</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-forest-50/80 dark:bg-forest-950/60 border border-forest-100 dark:border-forest-900">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">MPU6050 Motion</span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Stable Upright</span>
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">1.02 G Magnitude</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-forest-50/80 dark:bg-forest-950/60 border border-forest-100 dark:border-forest-900">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">NEO-6M GPS</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block mt-1">12.9716° N</span>
                    <span className="text-[9px] text-gray-400 block">77.5946° E (Fix Active)</span>
                  </div>
                </div>

                {/* Instant SOS Action Preview */}
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs">
                      SOS
                    </div>
                    <div>
                      <span className="text-xs font-bold text-rose-900 dark:text-rose-300 block">Emergency Dispatch Ready</span>
                      <span className="text-[10px] text-rose-700 dark:text-rose-400">1 Authorized Family Member</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-leaf-600 dark:text-leaf-400">
            About AgriShield
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
            Engineering Lifesaving Technology for Agriculture
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Pesticide spraying exposes Indian farmers to toxic chemical vapors, dizziness, dehydration and accidental falls in remote fields. AgriShield provides a reliable, non-intrusive safety net using low-power IoT microcontrollers and instantaneous cloud alerts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-leaf-300 flex items-center justify-center font-bold">
              01
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white">Smart Environmental Sensing</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Monitors ambient air quality trends and heat indices, warning farmers before hazardous exposure causes disorientation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-leaf-300 flex items-center justify-center font-bold">
              02
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white">Possible Fall Detection</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              MPU6050 6-axis accelerometer & gyroscope tracks sudden impact and orientation anomalies, alerting loved ones immediately.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-forest-100 dark:bg-forest-900 text-forest-700 dark:text-leaf-300 flex items-center justify-center font-bold">
              03
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white">Precise Rescue Coordinates</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              NEO-6M GPS integration ensures emergency contacts and medical teams know exact field coordinates for rapid response.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-leaf-600 dark:text-leaf-400">
            Platform Capabilities
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
            Built for Robust Field Conditions
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm hover:border-leaf-500 transition-all">
            <Activity className="w-8 h-8 text-leaf-600 mb-4" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Live Sensor Monitoring</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Continuous MQ-135 and DHT11 data telemetry streamed via WebSocket directly to web dashboards with freshness indicators.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm hover:border-leaf-500 transition-all">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-4" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Possible Fall Detection</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Validates sudden acceleration changes and posture anomalies to register possible fall events without false alarms.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm hover:border-leaf-500 transition-all">
            <Volume2 className="w-8 h-8 text-forest-600 dark:text-leaf-400 mb-4" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Acoustic Buzzer & LCD Display</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Immediate onboard acoustic warning sirens and 16x2 I2C LCD status readouts for field-level hazard alerts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm hover:border-leaf-500 transition-all">
            <MapPin className="w-8 h-8 text-emerald-600 mb-4" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Field GPS Tracking</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Interactive OpenStreetMap tracking maps the farmer's location, ensuring family members can reach them in large orchards.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm hover:border-leaf-500 transition-all">
            <Bell className="w-8 h-8 text-rose-500 mb-4" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Emergency Alert Dispatch</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Automated notifications to authorized emergency contacts, local administrators, and onboard buzzer/LED alarms.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-forest-900 shadow-sm hover:border-leaf-500 transition-all">
            <Cpu className="w-8 h-8 text-indigo-500 mb-4" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Device Management</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Administrative provisioning and secure binding of ESP32 sensor kits to farmer mobile profiles with cryptographic API keys.
            </p>
          </div>
        </div>
      </section>

      {/* Hardware Architecture Section */}
      <section id="technology" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-forest-950 text-white rounded-3xl p-8 sm:p-12 border border-forest-900">
          <div className="max-w-3xl mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-leaf-400">
              IoT Architecture
            </h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
              Hardware Components & Sensor Pin Mappings
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 mt-2">
              Engineered with low-power ESP32 DevKit V1 and ESP32-CAM nodes with reliable Wi-Fi reconnect and telemetry protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-forest-900/50 border border-forest-800 space-y-2">
              <span className="text-xs font-bold text-leaf-400">ESP32 DevKit V1</span>
              <h4 className="text-sm font-semibold text-white">Central Processing Unit</h4>
              <p className="text-xs text-gray-400">Dual-core Tensilica Xtensa 32-bit LX6 running real-time sensor processing and Wi-Fi HTTP telemetry.</p>
            </div>

            <div className="p-5 rounded-2xl bg-forest-900/50 border border-forest-800 space-y-2">
              <span className="text-xs font-bold text-leaf-400">MQ-135 Gas Sensor</span>
              <h4 className="text-sm font-semibold text-white">Air Quality Variations</h4>
              <p className="text-xs text-gray-400">Analog Pin GPIO 34. Monitors relative atmospheric gas changes to identify elevated chemical density.</p>
            </div>

            <div className="p-5 rounded-2xl bg-forest-900/50 border border-forest-800 space-y-2">
              <span className="text-xs font-bold text-leaf-400">DHT11 Climate Sensor</span>
              <h4 className="text-sm font-semibold text-white">Ambient Temperature & Humidity</h4>
              <p className="text-xs text-gray-400">Digital Pin GPIO 4. Tracks heat stress risk (0-50°C) and relative humidity percentages.</p>
            </div>

            <div className="p-5 rounded-2xl bg-forest-900/50 border border-forest-800 space-y-2">
              <span className="text-xs font-bold text-leaf-400">MPU6050 Motion</span>
              <h4 className="text-sm font-semibold text-white">Accelerometer & Gyroscope</h4>
              <p className="text-xs text-gray-400">I2C (SDA GPIO 21, SCL GPIO 22). Calculates total G-force vector to trigger possible fall alarms.</p>
            </div>

            <div className="p-5 rounded-2xl bg-forest-900/50 border border-forest-800 space-y-2">
              <span className="text-xs font-bold text-leaf-400">NEO-6M GPS Module</span>
              <h4 className="text-sm font-semibold text-white">Satellite Location Tracking</h4>
              <p className="text-xs text-gray-400">Hardware Serial (RX GPIO 16, TX GPIO 17). Provides accurate field latitude and longitude coordinates.</p>
            </div>

            <div className="p-5 rounded-2xl bg-forest-900/50 border border-forest-800 space-y-2">
              <span className="text-xs font-bold text-leaf-400">Audio/Visual Alarms</span>
              <h4 className="text-sm font-semibold text-white">Buzzer & Warning LEDs</h4>
              <p className="text-xs text-gray-400">Buzzer GPIO 18, Warning LED GPIO 19. Immediate acoustic and visual warnings on local unit.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-charcoal-900 rounded-3xl p-8 sm:p-12 border border-gray-200 dark:border-forest-900 shadow-md">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-leaf-600 dark:text-leaf-400">
              Connect With Us
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              Farmer Support & Inquiries
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Have questions regarding device deployment or registration in your taluk/district? Contact our engineering team.
            </p>
          </div>

          {contactSubmitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-300">Message Received</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Thank you. An AgriShield technical coordinator will reach out to your mobile number.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setContactSubmitted(true);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Suresh Kumar"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Mobile Number (+91)</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">District / Village</label>
                <input
                  type="text"
                  required
                  placeholder="Mandya, Karnataka"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Message / Query</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Need assistance configuring sensor unit or linking family emergency phone..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-xs text-white bg-leaf-600 hover:bg-leaf-700 shadow-sm flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send Support Request</span>
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};
