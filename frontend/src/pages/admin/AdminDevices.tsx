import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  UserPlus,
  CheckCircle2,
  Key,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Settings,
  Shield,
  ShieldAlert,
  X,
  Code,
  Terminal,
  AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '../../config/api';
import { StatusBadge } from '../../components/StatusBadge';

export const AdminDevices: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New device form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUid, setNewUid] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('ESP8266_NODEMCU');
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);

  // Assignment modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [selectedFarmerId, setSelectedFarmerId] = useState<number | ''>('');
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Device Configuration modal state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configDevice, setConfigDevice] = useState<any>(null);
  const [configDetails, setConfigDetails] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotatedCreds, setRotatedCreds] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [devRes, farmerRes] = await Promise.all([
        apiRequest('/devices'),
        apiRequest('/admin/farmers'),
      ]);
      setDevices(devRes || []);
      setFarmers(farmerRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 4000);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'DEVICE_HEARTBEAT' || msg.type === 'SENSOR_TELEMETRY') {
            fetchData(true);
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/devices', {
        method: 'POST',
        body: JSON.stringify({
          device_uid: newUid,
          device_name: newName,
          device_type: newType,
        }),
      });
      setCreatedApiKey(res.api_key);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to register device');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !selectedFarmerId) return;

    try {
      const res = await apiRequest('/devices/assign', {
        method: 'POST',
        body: JSON.stringify({
          farmer_id: Number(selectedFarmerId),
          device_id: selectedDevice.id,
        }),
      });
      setAssignSuccess(res.message);
      setAssignModalOpen(false);
      fetchData();
      setTimeout(() => setAssignSuccess(null), 4000);
    } catch (e: any) {
      alert(e.message || 'Failed to assign device');
    }
  };

  const openConfigModal = async (dev: any) => {
    setConfigDevice(dev);
    setConfigModalOpen(true);
    setRotatedCreds(null);
    setShowRotateConfirm(false);
    setConfigLoading(true);
    try {
      const data = await apiRequest(`/devices/${dev.id}/config`);
      setConfigDetails(data);
    } catch (e: any) {
      console.error('Failed to load device config:', e);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleRotateCredentials = async () => {
    if (!configDevice) return;
    setRotating(true);
    try {
      const data = await apiRequest(`/devices/${configDevice.id}/rotate-credentials`, {
        method: 'POST',
      });
      setRotatedCreds(data);
      setShowRotateConfirm(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to rotate credentials');
    } finally {
      setRotating(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Helper to format copyable headers text
  const getHeadersText = (apiKey: string, secretKey: string, devId: string | number, devUid: string) => {
    return [
      `X-Device-API-Key: ${apiKey}`,
      `X-Device-Key: ${secretKey}`,
      `X-Device-Id: ${devId}`,
      `X-Device-UID: ${devUid}`,
    ].join('\n');
  };

  // Helper to format Arduino C++ snippet
  const getArduinoSnippet = (apiKey: string, secretKey: string, devId: string | number, devUid: string) => {
    return `// AgriShield ESP8266 HTTPClient Headers
http.addHeader("X-Device-API-Key", "${apiKey}");
http.addHeader("X-Device-Key", "${secretKey}");
http.addHeader("X-Device-Id", "${devId}");
http.addHeader("X-Device-UID", "${devUid}");`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Cpu className="w-6 h-6 text-leaf-600 dark:text-leaf-400" />
            <span>ESP8266 & IoT Device Fleet Management</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Register hardware nodes, manage cryptographic device keys, inspect request headers, and assign field units to farmers
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setNewUid(`ESP8266-AGRI-${Math.floor(100 + Math.random() * 900)}`);
              setNewName('Field Unit - ESP8266 NodeMCU');
              setNewType('ESP8266_NODEMCU');
              setCreatedApiKey(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-leaf-600 hover:bg-leaf-700 text-white flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Device</span>
          </button>
          <button
            onClick={() => fetchData()}
            title="Refresh Fleet List"
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-forest-900 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {assignSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{assignSuccess}</span>
        </div>
      )}

      {/* Devices List */}
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-gray-200 dark:border-forest-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-forest-950/40 text-gray-500 uppercase text-[10px] font-semibold border-b border-gray-100 dark:border-forest-900">
              <tr>
                <th className="py-3 px-4">Device ID & UID</th>
                <th className="py-3 px-4">Name & Platform</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Farmer</th>
                <th className="py-3 px-4">Last Heartbeat</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-forest-900 text-gray-700 dark:text-gray-300">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No devices registered yet. Click &quot;Register New Device&quot; to add one.
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-forest-950/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[11px] font-bold text-gray-900 dark:text-white">
                          {d.device_uid}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          (#{d.id})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{d.device_name}</p>
                      <p className="text-[10px] text-gray-400">{d.device_type} (v{d.firmware_version || '1.0.0'})</p>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      {d.assigned_farmer ? (
                        <div>
                          <span className="font-semibold text-leaf-700 dark:text-leaf-300">
                            {d.assigned_farmer.name}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-mono">
                            {d.assigned_farmer.phone}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Device Configuration Button */}
                        <button
                          onClick={() => openConfigModal(d)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-forest-800 dark:text-leaf-300 bg-forest-50 dark:bg-forest-950/80 hover:bg-forest-100 dark:hover:bg-forest-900/60 border border-forest-200 dark:border-forest-800 rounded-lg flex items-center space-x-1 transition-all cursor-pointer shadow-xs"
                          title="Open Device Configuration and Credentials"
                        >
                          <Settings className="w-3.5 h-3.5 text-forest-700 dark:text-leaf-400" />
                          <span>Configure</span>
                        </button>

                        {/* Assign / Reassign Button */}
                        <button
                          onClick={() => {
                            setSelectedDevice(d);
                            setSelectedFarmerId(d.assigned_farmer?.id || '');
                            setAssignModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-charcoal-800 hover:bg-gray-200 dark:hover:bg-charcoal-700 border border-gray-200 dark:border-forest-900 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{d.assigned_farmer ? 'Reassign' : 'Assign'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DEVICE CONFIGURATION & CREDENTIAL ROTATION MODAL                       */}
      {/* ========================================================================= */}
      {configModalOpen && configDevice && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-white dark:bg-charcoal-900 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-forest-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-forest-900/60 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-forest-50 dark:bg-forest-950 border border-forest-200 dark:border-forest-800 flex items-center justify-center text-forest-700 dark:text-leaf-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                    <span>Device Configuration: {configDevice.device_uid}</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ESP8266 NodeMCU & IoT Node Configuration • Cryptographic Credentials & Request Headers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-forest-950 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close configuration modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Device Overview Card */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900/60">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Device ID</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                    #{configDevice.id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Device UID</span>
                  <span className="font-mono font-bold text-leaf-600 dark:text-leaf-400 text-xs break-all block">
                    {configDevice.device_uid}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Device Status</span>
                  <div className="mt-0.5">
                    <StatusBadge status={configDevice.status} size="sm" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Assigned Farmer</span>
                  <span className="font-medium text-gray-900 dark:text-white truncate block">
                    {configDevice.assigned_farmer ? configDevice.assigned_farmer.name : 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rotated Credentials Banner (Displayed Once) */}
            {rotatedCreds ? (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs space-y-4">
                <div className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                      New Device Credentials Generated Successfully!
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {rotatedCreds.warning}
                    </p>
                  </div>
                </div>

                {/* API Key Box */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 text-[11px] uppercase tracking-wider">
                      Device API Key (Public Token)
                    </span>
                    <button
                      onClick={() => copyToClipboard(rotatedCreds.api_key, 'api_key')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold flex items-center space-x-1 hover:bg-emerald-200"
                    >
                      {copiedField === 'api_key' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'api_key' ? 'Copied!' : 'Copy API Key'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-charcoal-900 text-leaf-300 font-mono text-xs break-all select-all border border-forest-800">
                    {rotatedCreds.api_key}
                  </div>
                </div>

                {/* Secret Key Box */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 text-[11px] uppercase tracking-wider">
                      Device Secret Key (Hashed in MySQL)
                    </span>
                    <button
                      onClick={() => copyToClipboard(rotatedCreds.secret_key, 'secret_key')}
                      className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold flex items-center space-x-1 hover:bg-emerald-200"
                    >
                      {copiedField === 'secret_key' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'secret_key' ? 'Copied!' : 'Copy Secret Key'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-charcoal-900 text-amber-300 font-mono text-xs break-all select-all border border-forest-800">
                    {rotatedCreds.secret_key}
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Key Status & Rotation Option */
              <div className="p-5 rounded-2xl bg-white dark:bg-forest-950/20 border border-gray-200 dark:border-forest-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                      <Key className="w-3.5 h-3.5 text-leaf-600 dark:text-leaf-400" />
                      <span>Device Cryptographic Credentials</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      API Keys authenticate hardware nodes. Secret keys are securely hashed using bcrypt in MySQL.
                    </p>
                  </div>

                  {!showRotateConfirm && (
                    <button
                      onClick={() => setShowRotateConfirm(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-forest-800 hover:bg-forest-900 text-white flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-leaf-400" />
                      <span>Rotate Credentials</span>
                    </button>
                  )}
                </div>

                {/* Confirm Rotation Warning Box */}
                {showRotateConfirm && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs space-y-3">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-amber-900 dark:text-amber-200">
                        <span className="font-bold">Caution: Key Rotation</span>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          Generating new credentials will immediately invalidate any previous API keys. You must update your ESP8266 Arduino sketch firmware with the new keys.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={handleRotateCredentials}
                        disabled={rotating}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      >
                        {rotating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        <span>Confirm & Generate New Keys</span>
                      </button>
                      <button
                        onClick={() => setShowRotateConfirm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-200 dark:bg-charcoal-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Key Status Line */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-forest-950/50 border border-gray-200 dark:border-forest-900">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">API Key Status</span>
                    <span className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {configDetails?.api_key_masked || 'Configured in Database'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-forest-950/50 border border-gray-200 dark:border-forest-900">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Secret Key Storage</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 mt-0.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>{configDetails?.has_secret_key ? 'Encrypted with bcrypt (MySQL)' : 'Not yet generated'}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* Required ESP8266 Request Headers Section                                  */}
            {/* ========================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5 text-leaf-600 dark:text-leaf-400" />
                    <span>Required ESP8266 Request Headers</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    The physical node must transmit these 4 headers with every POST request to /api/telemetry, /api/gps, and /api/devices/heartbeat:
                  </p>
                </div>

                {/* Copy All Button */}
                <button
                  onClick={() => {
                    const activeApiKey = rotatedCreds?.api_key || configDetails?.required_headers?.['X-Device-API-Key'] || 'YOUR_API_KEY';
                    const activeSecret = rotatedCreds?.secret_key || '<DEVICE_SECRET_KEY>';
                    const headersText = getHeadersText(activeApiKey, activeSecret, configDevice.id, configDevice.device_uid);
                    copyToClipboard(headersText, 'all_headers');
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-forest-100 dark:bg-forest-950 text-forest-800 dark:text-leaf-300 hover:bg-forest-200 border border-forest-300 dark:border-forest-800 flex items-center space-x-1 transition-all cursor-pointer"
                >
                  {copiedField === 'all_headers' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'all_headers' ? 'Copied All!' : 'Copy All Headers'}</span>
                </button>
              </div>

              {/* 4 Header Rows */}
              <div className="grid grid-cols-1 gap-2 text-xs">
                {/* 1. X-Device-API-Key */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-forest-800 dark:text-leaf-400">
                      X-Device-API-Key:
                    </span>
                    <span className="font-mono text-gray-600 dark:text-gray-300 text-[11px] block break-all">
                      {rotatedCreds?.api_key || configDetails?.required_headers?.['X-Device-API-Key'] || 'agrishield_demo_api_key_2026'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const val = rotatedCreds?.api_key || configDetails?.required_headers?.['X-Device-API-Key'] || 'agrishield_demo_api_key_2026';
                      copyToClipboard(val, 'header_api_key');
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-forest-900 ml-2 shrink-0"
                    title="Copy API Key Header value"
                  >
                    {copiedField === 'header_api_key' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* 2. X-Device-Key */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-forest-800 dark:text-leaf-400">
                      X-Device-Key:
                    </span>
                    <span className="font-mono text-gray-600 dark:text-gray-300 text-[11px] block break-all">
                      {rotatedCreds?.secret_key || '<DEVICE_SECRET_KEY>'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const val = rotatedCreds?.secret_key || '<DEVICE_SECRET_KEY>';
                      copyToClipboard(val, 'header_key');
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-forest-900 ml-2 shrink-0"
                    title="Copy Device Key Header value"
                  >
                    {copiedField === 'header_key' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* 3. X-Device-Id */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-forest-800 dark:text-leaf-400">
                      X-Device-Id:
                    </span>
                    <span className="font-mono text-gray-600 dark:text-gray-300 text-[11px] block">
                      {configDevice.id}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(String(configDevice.id), 'header_id')}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-forest-900 ml-2 shrink-0"
                    title="Copy Device ID"
                  >
                    {copiedField === 'header_id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* 4. X-Device-UID */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-forest-950/40 border border-gray-200 dark:border-forest-900 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-forest-800 dark:text-leaf-400">
                      X-Device-UID:
                    </span>
                    <span className="font-mono text-gray-600 dark:text-gray-300 text-[11px] block font-bold">
                      {configDevice.device_uid}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(configDevice.device_uid, 'header_uid')}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-forest-900 ml-2 shrink-0"
                    title="Copy Device UID"
                  >
                    {copiedField === 'header_uid' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Arduino Code Snippet */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center space-x-1">
                    <Code className="w-3 h-3 text-forest-700 dark:text-leaf-400" />
                    <span>ESP8266 Arduino IDE HTTPClient Code Example</span>
                  </span>
                  <button
                    onClick={() => {
                      const activeApiKey = rotatedCreds?.api_key || configDetails?.required_headers?.['X-Device-API-Key'] || 'YOUR_API_KEY';
                      const activeSecret = rotatedCreds?.secret_key || '<DEVICE_SECRET_KEY>';
                      const code = getArduinoSnippet(activeApiKey, activeSecret, configDevice.id, configDevice.device_uid);
                      copyToClipboard(code, 'arduino_code');
                    }}
                    className="text-[10px] text-leaf-600 dark:text-leaf-400 font-bold hover:underline flex items-center space-x-1"
                  >
                    {copiedField === 'arduino_code' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'arduino_code' ? 'Copied Code!' : 'Copy Arduino Snippet'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-charcoal-900 border border-forest-900/60 font-mono text-[11px] text-leaf-300 select-all overflow-x-auto leading-relaxed">
                  <pre>{getArduinoSnippet(
                    rotatedCreds?.api_key || configDetails?.required_headers?.['X-Device-API-Key'] || 'YOUR_API_KEY',
                    rotatedCreds?.secret_key || '<DEVICE_SECRET_KEY>',
                    configDevice.id,
                    configDevice.device_uid
                  )}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-gray-100 dark:border-forest-900/60 flex items-center justify-end space-x-3">
              <button
                onClick={() => setConfigModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-forest-950/60 hover:bg-gray-200 dark:hover:bg-forest-900 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REGISTER DEVICE MODAL                                                  */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-charcoal-900 rounded-3xl p-6 border border-gray-200 dark:border-forest-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Register Hardware Node</h3>

            {createdApiKey ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
                  <p className="font-bold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Device Registered Successfully!</span>
                  </p>
                  <p className="text-[11px]">Copy this API Key into your ESP8266/ESP32 sketch header:</p>
                  <div className="p-2.5 bg-black/80 rounded-lg font-mono text-[11px] text-leaf-300 break-all select-all">
                    {createdApiKey}
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-leaf-600 text-white cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterDevice} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Device UID</label>
                  <input
                    type="text"
                    required
                    value={newUid}
                    onChange={(e) => setNewUid(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Friendly Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Hardware Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950/50 text-gray-900 dark:text-white"
                  >
                    <option value="ESP8266_NODEMCU">ESP8266 NodeMCU</option>
                    <option value="ESP32_DEV_KIT_V1">ESP32 DevKit V1</option>
                  </select>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-leaf-600 text-white cursor-pointer"
                  >
                    Generate API Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ASSIGN DEVICE MODAL                                                    */}
      {/* ========================================================================= */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-charcoal-900 rounded-3xl p-6 border border-gray-200 dark:border-forest-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Assign Device: {selectedDevice?.device_uid}
            </h3>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Select Registered Farmer
                </label>
                <select
                  value={selectedFarmerId}
                  onChange={(e) => setSelectedFarmerId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-forest-800 bg-white dark:bg-forest-950 text-gray-900 dark:text-white"
                >
                  <option value="">-- Choose Farmer --</option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name} ({f.phone_number}) - {f.village}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-forest-950/60 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-leaf-600 text-white cursor-pointer"
                >
                  Confirm Binding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
