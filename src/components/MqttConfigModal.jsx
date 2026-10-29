import React, { useState } from 'react';
import { X, Radio, Server, Check, AlertCircle, RefreshCw, Activity, Terminal } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function MqttConfigModal({ isOpen, onClose }) {
  const {
    hydroponicSettings,
    updateHydroponicSettings,
    mqttStatus,
    mqttLogs,
    connectMqttBroker,
    disconnectMqttBroker
  } = useApp();

  const [brokerUrl, setBrokerUrl] = useState(hydroponicSettings.brokerUrl || 'wss://broker.emqx.io:8084/mqtt');
  const [topicTelemetry, setTopicTelemetry] = useState(hydroponicSettings.topicTelemetry || 'hidroponik/telemetri');
  const [topicCommand, setTopicCommand] = useState(hydroponicSettings.topicCommand || 'hidroponik/kendali');
  const [topicPump, setTopicPump] = useState(hydroponicSettings.topicPump || 'hidroponik/pompa');
  const [topicBuzzer, setTopicBuzzer] = useState(hydroponicSettings.topicBuzzer || 'hidroponik/buzzer');

  if (!isOpen) return null;

  const handleSaveAndReconnect = (e) => {
    e.preventDefault();
    updateHydroponicSettings({
      brokerUrl,
      topicTelemetry,
      topicCommand,
      topicPump,
      topicBuzzer
    });
    connectMqttBroker(brokerUrl);
    onClose();
  };

  const setPreset = (presetUrl) => {
    setBrokerUrl(presetUrl);
  };

  const isConnected = mqttStatus === 'CONNECTED';
  const isConnecting = mqttStatus === 'CONNECTING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#141719] border border-[#22272B] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#22272B] flex items-center justify-between bg-[#0B0D0E]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FF7A00]/15 text-[#FF9A3D] border border-[#FF7A00]/30">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F5F5]">
                Konfigurasi Broker MQTT Hidroponik
              </h2>
              <p className="text-xs text-[#8A9198] font-mono">
                Koneksi WebSocket browser langsung ke ESP32
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8A9198] hover:text-[#F5F5F5] hover:bg-[#22272B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-3 bg-[#0B0D0E]/50 border-b border-[#22272B] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected
                  ? 'bg-[#22C55E] shadow-sm shadow-[#22C55E]'
                  : isConnecting
                  ? 'bg-[#FF7A00] animate-ping'
                  : 'bg-[#EF4444]'
              }`}
            />
            <span className="text-[#F5F5F5]">Status: {mqttStatus}</span>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <button
                type="button"
                onClick={disconnectMqttBroker}
                className="px-2.5 py-1 rounded bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/30 text-[11px]"
              >
                Putuskan
              </button>
            ) : (
              <button
                type="button"
                onClick={() => connectMqttBroker(brokerUrl)}
                className="px-2.5 py-1 rounded bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#22C55E] border border-[#22C55E]/30 text-[11px] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Hubungkan
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSaveAndReconnect} className="p-5 overflow-y-auto space-y-4">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-mono text-[#8A9198] uppercase mb-2">
              Pilihan Broker Publik (WebSocket WSS)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreset('wss://broker.emqx.io:8084/mqtt')}
                className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all ${
                  brokerUrl.includes('emqx')
                    ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-[#FF9A3D]'
                    : 'border-[#22272B] bg-[#0B0D0E] text-[#8A9198] hover:border-[#38BDF8]/40'
                }`}
              >
                <div className="font-bold text-[#F5F5F5]">EMQX Broker (Rekomendasi)</div>
                <div className="text-[10px] text-[#8A9198]">Port 8084 WSS / 1883 TCP</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('wss://broker.hivemq.com:8884/mqtt')}
                className={`p-2.5 rounded-xl border text-left text-xs font-mono transition-all ${
                  brokerUrl.includes('hivemq')
                    ? 'border-[#FF7A00] bg-[#FF7A00]/10 text-[#FF9A3D]'
                    : 'border-[#22272B] bg-[#0B0D0E] text-[#8A9198] hover:border-[#38BDF8]/40'
                }`}
              >
                <div className="font-bold text-[#F5F5F5]">HiveMQ Public</div>
                <div className="text-[10px] text-[#8A9198]">Port 8884 WSS / 1883 TCP</div>
              </button>
            </div>
          </div>

          {/* Broker URL Input */}
          <div>
            <label className="block text-xs font-mono text-[#8A9198] uppercase mb-1.5">
              WebSocket Broker URL
            </label>
            <input
              type="text"
              value={brokerUrl}
              onChange={(e) => setBrokerUrl(e.target.value)}
              placeholder="wss://broker.emqx.io:8084/mqtt"
              className="w-full bg-[#0B0D0E] border border-[#22272B] rounded-xl px-3.5 py-2 text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#FF7A00]"
              required
            />
            <p className="text-[10px] text-[#6E7681] font-mono mt-1">
              *Di web browser wajib menggunakan protokol wss:// (WebSocket Secure).
            </p>
          </div>

          {/* Topik-Topik MQTT */}
          <div className="space-y-3 pt-2 border-t border-[#22272B]">
            <label className="block text-xs font-mono text-[#8A9198] uppercase">
              Topik MQTT yang Digunakan
            </label>

            <div>
              <span className="text-[11px] font-mono text-[#8A9198]">Topik Telemetri (Subscribe)</span>
              <input
                type="text"
                value={topicTelemetry}
                onChange={(e) => setTopicTelemetry(e.target.value)}
                className="w-full bg-[#0B0D0E] border border-[#22272B] rounded-lg px-3 py-1.5 text-xs font-mono text-[#F5F5F5] focus:border-[#FF7A00]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] font-mono text-[#8A9198]">Topik Pompa</span>
                <input
                  type="text"
                  value={topicPump}
                  onChange={(e) => setTopicPump(e.target.value)}
                  className="w-full bg-[#0B0D0E] border border-[#22272B] rounded-lg px-3 py-1.5 text-xs font-mono text-[#F5F5F5] focus:border-[#FF7A00]"
                />
              </div>

              <div>
                <span className="text-[11px] font-mono text-[#8A9198]">Topik Buzzer</span>
                <input
                  type="text"
                  value={topicBuzzer}
                  onChange={(e) => setTopicBuzzer(e.target.value)}
                  className="w-full bg-[#0B0D0E] border border-[#22272B] rounded-lg px-3 py-1.5 text-xs font-mono text-[#F5F5F5] focus:border-[#FF7A00]"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#22272B] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-[#8A9198] hover:bg-[#22272B] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-[#FF7A00] hover:bg-[#FF9A3D] text-[#0B0D0E] shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Simpan & Hubungkan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
