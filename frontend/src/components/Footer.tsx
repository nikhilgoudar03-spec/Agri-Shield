import React from 'react';
import { Shield, HeartHandshake, PhoneCall, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-forest-950 text-gray-300 border-t border-forest-900/60 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Mission */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-leaf-500 flex items-center justify-center text-white">
                <Shield className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Agri<span className="text-leaf-400">Shield</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Advanced AI & IoT-based smart safety monitoring platform dedicated to protecting agricultural workers during pesticide spraying and farm operations.
            </p>
            <div className="text-xs text-leaf-400 font-semibold flex items-center space-x-1.5">
              <HeartHandshake className="w-4 h-4" />
              <span>For Indian Farmers & Agriculture Safety</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/login" className="hover:text-leaf-400 transition-colors">Farmer Portal Login</Link></li>
              <li><Link to="/register" className="hover:text-leaf-400 transition-colors">Farmer Safety Registration</Link></li>
              <li><Link to="/admin/login" className="hover:text-leaf-400 transition-colors">Admin Security Portal</Link></li>
              <li><a href="#hardware" className="hover:text-leaf-400 transition-colors">ESP32 Hardware Specifications</a></li>
            </ul>
          </div>

          {/* Hardware & Safety Architecture */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase">IoT Sensors</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><span className="text-white font-medium">MQ-135:</span> General Air-Quality & Gas Monitoring</li>
              <li><span className="text-white font-medium">DHT11:</span> Ambient Temperature & Humidity</li>
              <li><span className="text-white font-medium">MPU6050:</span> Motion & Possible Fall Detection</li>
              <li><span className="text-white font-medium">NEO-6M:</span> Farmer GPS Field Coordinates</li>
              <li><span className="text-white font-medium">Buzzer & LCD:</span> Onboard Acoustic Alarm & 16x2 Display</li>
            </ul>
          </div>

          {/* Emergency Helplines & Support */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase">Emergency Helplines</h4>
            <div className="space-y-2 text-xs text-gray-400">
              <p className="flex items-center space-x-2 text-amber-300">
                <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                <span>Kisan Call Center: <strong>1800-180-1551</strong></span>
              </p>
              <p className="flex items-center space-x-2 text-red-300">
                <PhoneCall className="w-3.5 h-3.5 text-red-400" />
                <span>National Emergency: <strong>112</strong></span>
              </p>
              <p className="flex items-center space-x-2 text-emerald-300">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ambulance Service: <strong>108</strong></span>
              </p>
            </div>
          </div>
        </div>

        {/* Technical Notice Banner */}
        <div className="border-t border-forest-900/80 pt-6 pb-4">
          <div className="bg-forest-900/40 border border-forest-800 rounded-lg p-3 text-[11px] text-gray-400 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Technical & Safety Notice:</strong> The MQ-135 sensor monitors general relative air-quality fluctuations and is not a selective pesticide analyzer. Camera images capture situational evidence and cannot measure invisible chemical ppm. Fall detection alerts indicate possible fall events based on accelerometer vector magnitude. AgriShield assists farmer safety and alerts emergency contacts; it does not replace certified PPE or clinical oversight.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 pt-4">
          <p>© {new Date().getFullYear()} AgriShield Platform. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Engineered with React, FastAPI, MySQL & ESP32 IoT Architecture.</p>
        </div>
      </div>
    </footer>
  );
};
