import React, { useState } from 'react';
import {
  Waves,
  Droplet,
  Thermometer,
  Wind,
  Power,
  Bell,
  BellOff,
  Sliders,
  Cpu,
  FileCode,
  Radio,
  Check,
  Copy,
  Download,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Settings2,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  Send,
  Bot,
  Zap,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import HydroponicWaterTank from '../components/HydroponicWaterTank.jsx';
import HydroponicPlantMicroclimate from '../components/HydroponicPlantMicroclimate.jsx';
import MqttConfigModal from '../components/MqttConfigModal.jsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export default function HydroponicsPage() {
  const {
    hydroponicData,
    hydroponicSettings,
    hydroponicHistory,
    mqttStatus,
    mqttLogs,
    isHydroDemo,
    toggleHydroponicPump,
    toggleHydroponicBuzzer,
    setHydroponicMode,
    updateHydroponicSettings,
    connectMqttBroker,
    toggleHydroDemo
  } = useApp();

  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' | 'automation' | 'wiring' | 'n8n' | 'console'
  const [isMqttModalOpen, setIsMqttModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedN8nJson, setCopiedN8nJson] = useState(false);

  // Automation Form State
  const [formBatasJarak, setFormBatasJarak] = useState(hydroponicSettings.batasJarak || 10.0);
  const [formBatasSuhu, setFormBatasSuhu] = useState(hydroponicSettings.batasSuhu || 30.0);
  const [formTandonDepth, setFormTandonDepth] = useState(hydroponicSettings.tandonDepthCm || 35.0);
  const [formCapacity, setFormCapacity] = useState(hydroponicSettings.tandonCapacityLiters || 50);
  const [formAutoRefill, setFormAutoRefill] = useState(Boolean(hydroponicSettings.autoPumpRefill));
  const [formMinLevel, setFormMinLevel] = useState(hydroponicSettings.autoPumpMinLevel || 25);
  const [formMaxLevel, setFormMaxLevel] = useState(hydroponicSettings.autoPumpMaxLevel || 85);

  // n8n & Telegram Integration State
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(hydroponicSettings.n8nWebhookUrl || '');
  const [telegramChatId, setTelegramChatId] = useState(hydroponicSettings.telegramChatId || '');
  const [n8nSendOnAlarm, setN8nSendOnAlarm] = useState(hydroponicSettings.n8nSendOnAlarm ?? true);
  const [n8nSendOnPumpChange, setN8nSendOnPumpChange] = useState(hydroponicSettings.n8nSendOnPumpChange ?? true);
  const [n8nPeriodicMinutes, setN8nPeriodicMinutes] = useState(hydroponicSettings.n8nPeriodicMinutes || 30);
  const [testWebhookStatus, setTestWebhookStatus] = useState({
    loading: false,
    success: null,
    message: '',
    previewPayload: null
  });

  // Custom MQTT debug publisher
  const [debugTopic, setDebugTopic] = useState('hidroponik/kendali');
  const [debugPayload, setDebugPayload] = useState('{"relay": 1}');

  const handleSaveAutomation = (e) => {
    e.preventDefault();
    updateHydroponicSettings({
      batasJarak: Number(formBatasJarak),
      batasSuhu: Number(formBatasSuhu),
      tandonDepthCm: Number(formTandonDepth),
      tandonCapacityLiters: Number(formCapacity),
      autoPumpRefill: formAutoRefill,
      autoPumpMinLevel: Number(formMinLevel),
      autoPumpMaxLevel: Number(formMaxLevel),
      n8nWebhookUrl,
      telegramChatId,
      n8nSendOnAlarm,
      n8nSendOnPumpChange,
      n8nPeriodicMinutes: Number(n8nPeriodicMinutes)
    });
  };

  const handleSaveN8nSettings = (e) => {
    e.preventDefault();
    updateHydroponicSettings({
      n8nWebhookUrl,
      telegramChatId,
      n8nSendOnAlarm,
      n8nSendOnPumpChange,
      n8nPeriodicMinutes: Number(n8nPeriodicMinutes)
    });
    setTestWebhookStatus(prev => ({
      ...prev,
      success: true,
      message: 'Pengaturan webhook n8n berhasil disimpan!'
    }));
    setTimeout(() => {
      setTestWebhookStatus(prev => ({ ...prev, success: null, message: '' }));
    }, 4000);
  };

  const handleSendTestWebhook = async (eventType = 'ALARM_TRIGGER') => {
    if (!n8nWebhookUrl.trim()) {
      setTestWebhookStatus({
        loading: false,
        success: false,
        message: 'Masukkan URL Webhook n8n terlebih dahulu (contoh: http://localhost:5678/webhook/hidroponik-alert)',
        previewPayload: null
      });
      return;
    }

    setTestWebhookStatus({
      loading: true,
      success: null,
      message: 'Mengirim paket uji coba ke n8n...',
      previewPayload: null
    });

    const isAlarmEvent = eventType === 'ALARM_TRIGGER';
    const samplePayload = {
      event: eventType,
      device: 'ESP32_Hidroponik_PanganSense',
      suhu: isAlarmEvent ? 32.5 : (hydroponicData.suhu || 27.8),
      kelembapan: hydroponicData.kelembapan || 68.5,
      jarak: isAlarmEvent ? 8.2 : (hydroponicData.jarak >= 0 ? hydroponicData.jarak : 18.5),
      relay: eventType === 'PUMP_CHANGE' ? 1 : (hydroponicData.relay ? 1 : 0),
      buzzer: isAlarmEvent ? 1 : 0,
      alarm: isAlarmEvent,
      mode: hydroponicData.mode || 'auto',
      batasJarak: Number(formBatasJarak),
      batasSuhu: Number(formBatasSuhu),
      chatId: telegramChatId.trim() || undefined,
      timestamp: Math.floor(Date.now() / 1000),
      telegram_text: isAlarmEvent
        ? `🚨 *PERINGATAN ALARM HIDROPONIK!*\n⚠️ Jarak: 8.2 cm <= Batas 10 cm (Air Meluap)\n🔥 Suhu: 32.5 °C >= Batas 30 °C (Panas)\n💧 Kelembapan: 68.5 %\n🔊 Buzzer: AKTIF | Pompa: ON`
        : eventType === 'PUMP_CHANGE'
        ? `🔄 *STATUS POMPA BERUBAH*\nPompa Relay (GPIO 26): MENYALA (ON)\nKetinggian Air: 18.5 cm`
        : `🌱 *LAPORAN RUTIN HIDROPONIK*\nSuhu: 27.8 °C | Kelembapan: 68.5 %\nJarak Air: 18.5 cm | Status: Normal`
    };

    try {
      const response = await fetch(n8nWebhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload)
      });

      if (response.ok) {
        setTestWebhookStatus({
          loading: false,
          success: true,
          message: `Berhasil! Webhook n8n merespon dengan status HTTP ${response.status}. Pesan siap diteruskan ke Telegram!`,
          previewPayload: samplePayload
        });
      } else {
        setTestWebhookStatus({
          loading: false,
          success: false,
          message: `Webhook n8n mengembalikan HTTP status ${response.status} (${response.statusText}). Periksa apakah workflow n8n sudah di-Active atau di-Listen.`,
          previewPayload: samplePayload
        });
      }
    } catch (err) {
      setTestWebhookStatus({
        loading: false,
        success: false,
        message: `Koneksi gagal: ${err.message}. Pastikan URL n8n dapat diakses dan CORS tidak memblokir (jika n8n berjalan di localhost, aktifkan webhook di n8n).`,
        previewPayload: samplePayload
      });
    }
  };

  const handleCopyN8nWorkflow = () => {
    const json = getN8nWorkflowJson();
    navigator.clipboard.writeText(json);
    setCopiedN8nJson(true);
    setTimeout(() => setCopiedN8nJson(false), 2500);
  };

  const handleCopyCode = () => {
    const code = getArduinoCode();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadCode = () => {
    const code = getArduinoCode();
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hidroponik_mqtt_esp32.ino';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isConnected = mqttStatus === 'CONNECTED';
  const isAlarm = hydroponicData.alarm;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & System Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#141719] border border-[#22272B]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#0EA5E9]/15 text-[#38BDF8] border border-[#0EA5E9]/30">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#F5F5F5] tracking-tight">
                  Sistem Hidroponik MQTT
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0EA5E9]/15 text-[#38BDF8] border border-[#0EA5E9]/30">
                  ESP32 IoT
                </span>
              </div>
              <p className="text-xs text-[#8A9198] font-mono mt-0.5">
                Monitoring Air (HC-SR04), Tanaman (DHT22), Relay Pompa (GPIO 26) & Buzzer (GPIO 27)
              </p>
            </div>
          </div>
        </div>

        {/* Right Status Bar & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher Auto / Manual */}
          <div className="flex items-center p-1 bg-[#0B0D0E] rounded-xl border border-[#22272B]">
            <button
              onClick={() => setHydroponicMode('auto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                hydroponicData.mode === 'auto'
                  ? 'bg-[#22C55E] text-[#0B0D0E] shadow-sm'
                  : 'text-[#8A9198] hover:text-[#F5F5F5]'
              }`}
            >
              OTOMATIS
            </button>
            <button
              onClick={() => setHydroponicMode('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                hydroponicData.mode === 'manual'
                  ? 'bg-[#FF7A00] text-[#0B0D0E] shadow-sm'
                  : 'text-[#8A9198] hover:text-[#F5F5F5]'
              }`}
            >
              MANUAL
            </button>
          </div>

          {/* MQTT Connection Pill */}
          <button
            onClick={() => setIsMqttModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              isConnected
                ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                : mqttStatus === 'CONNECTING'
                ? 'bg-[#FF7A00]/10 border-[#FF7A00]/30 text-[#FF9A3D] animate-pulse'
                : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="font-bold">MQTT: {mqttStatus}</span>
          </button>

          {/* Test Bench Simulator Toggle */}
          <button
            onClick={toggleHydroDemo}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              isHydroDemo
                ? 'bg-[#38BDF8]/20 border-[#38BDF8]/40 text-[#38BDF8]'
                : 'bg-[#0B0D0E] border-[#22272B] text-[#8A9198] hover:text-[#F5F5F5]'
            }`}
          >
            {isHydroDemo ? 'Simulasi Aktif' : 'Uji Simulator'}
          </button>
        </div>
      </div>

      {/* Global Alarm Alert Banner (if triggered) */}
      {isAlarm && (
        <div className="p-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/50 text-[#F5F5F5] flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EF4444] text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#EF4444]">
                PERINGATAN ALARM SISTEM HIDROPONIK AKTIF!
              </div>
              <div className="text-xs text-[#8A9198] font-mono">
                {hydroponicData.jarak >= 0 && hydroponicData.jarak <= (hydroponicSettings.batasJarak || 10.0)
                  ? `Jarak air ${hydroponicData.jarak} cm <= Batas (${hydroponicSettings.batasJarak} cm). Air meluap/terlalu dekat!`
                  : `Suhu udara ${hydroponicData.suhu}°C >= Batas (${hydroponicSettings.batasSuhu}°C). Suhu panas ekstrem!`
                } Buzzer pada GPIO 27 berbunyi peringatan.
              </div>
            </div>
          </div>

          <button
            onClick={() => toggleHydroponicBuzzer(false)}
            className="px-3.5 py-1.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white font-mono text-xs font-bold shrink-0 cursor-pointer"
          >
            Matikan Bunyi Buzzer
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#22272B] pb-2 overflow-x-auto font-mono text-xs">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'monitoring'
              ? 'bg-[#FF7A00] text-[#0B0D0E] font-bold shadow-md shadow-[#FF7A00]/20'
              : 'text-[#8A9198] hover:text-[#F5F5F5] hover:bg-[#141719]'
          }`}
        >
          <Waves className="w-4 h-4" />
          <span>Monitoring & Kendali</span>
        </button>

        <button
          onClick={() => setActiveTab('automation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'automation'
              ? 'bg-[#FF7A00] text-[#0B0D0E] font-bold shadow-md shadow-[#FF7A00]/20'
              : 'text-[#8A9198] hover:text-[#F5F5F5] hover:bg-[#141719]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Otomatisasi & Batas Alarm</span>
        </button>

        <button
          onClick={() => setActiveTab('wiring')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'wiring'
              ? 'bg-[#FF7A00] text-[#0B0D0E] font-bold shadow-md shadow-[#FF7A00]/20'
              : 'text-[#8A9198] hover:text-[#F5F5F5] hover:bg-[#141719]'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Wiring & Kode ESP32</span>
        </button>

        <button
          onClick={() => setActiveTab('n8n')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'n8n'
              ? 'bg-[#FF7A00] text-[#0B0D0E] font-bold shadow-md shadow-[#FF7A00]/20'
              : 'text-[#8A9198] hover:text-[#F5F5F5] hover:bg-[#141719]'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Integrasi n8n & Telegram</span>
        </button>

        <button
          onClick={() => setActiveTab('console')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'console'
              ? 'bg-[#FF7A00] text-[#0B0D0E] font-bold shadow-md shadow-[#FF7A00]/20'
              : 'text-[#8A9198] hover:text-[#F5F5F5] hover:bg-[#141719]'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Log & Konsol MQTT</span>
        </button>
      </div>

      {/* TAB 1: MONITORING & KENDALI */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Top Sensors: Water Tank & Plant Microclimate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HydroponicWaterTank
              waterLevelPercent={hydroponicData.waterLevelPercent}
              jarakCm={hydroponicData.jarak}
              waterVolumeLiters={hydroponicData.waterVolumeLiters}
              capacityLiters={hydroponicSettings.tandonCapacityLiters || 50}
              batasJarak={hydroponicSettings.batasJarak || 10.0}
              isAlarm={isAlarm}
              isPumpActive={hydroponicData.relay}
            />

            <HydroponicPlantMicroclimate
              suhu={hydroponicData.suhu}
              kelembapan={hydroponicData.kelembapan}
              batasSuhu={hydroponicSettings.batasSuhu || 30.0}
              isAlarm={isAlarm}
            />
          </div>

          {/* Actuator Direct MQTT Control Panel */}
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-4">
            <div className="flex items-center justify-between border-b border-[#22272B] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                  <Power className="w-4 h-4 text-[#FF7A00]" />
                  Kendali On / Off Aktuator via MQTT
                </h3>
                <p className="text-xs text-[#8A9198] font-mono">
                  Mengirim perintah langsung ke pin hardware ESP32 secara instan
                </p>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22272B] text-[#8A9198]">
                Mode: {hydroponicData.mode.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Relay Pompa (GPIO 26) */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  hydroponicData.relay
                    ? 'bg-[#0EA5E9]/10 border-[#0EA5E9]/40'
                    : 'bg-[#0B0D0E] border-[#22272B]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg ${
                        hydroponicData.relay
                          ? 'bg-[#0EA5E9] text-white shadow-md shadow-[#0EA5E9]/30'
                          : 'bg-[#22272B] text-[#8A9198]'
                      }`}
                    >
                      <Waves className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#F5F5F5]">
                        Relay Pompa Air/Nutrisi
                      </div>
                      <div className="text-[10px] text-[#8A9198] font-mono">
                        GPIO 26 &bull; Topik: hidroponik/pompa
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      hydroponicData.relay
                        ? 'bg-[#0EA5E9]/20 text-[#38BDF8] border border-[#0EA5E9]/40 animate-pulse'
                        : 'bg-[#22272B] text-[#8A9198]'
                    }`}
                  >
                    {hydroponicData.relay ? 'ON (MENYALA)' : 'OFF (MATI)'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#22272B]/60">
                  <button
                    onClick={() => toggleHydroponicPump(!hydroponicData.relay)}
                    className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      hydroponicData.relay
                        ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-md'
                        : 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-md shadow-[#0EA5E9]/20'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    {hydroponicData.relay ? 'Matikan Pompa (OFF)' : 'Nyalakan Pompa (ON)'}
                  </button>
                </div>
              </div>

              {/* Card 2: Buzzer Alarm (GPIO 27) */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  hydroponicData.buzzer
                    ? 'bg-[#EF4444]/10 border-[#EF4444]/40'
                    : 'bg-[#0B0D0E] border-[#22272B]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg ${
                        hydroponicData.buzzer
                          ? 'bg-[#EF4444] text-white animate-bounce'
                          : 'bg-[#22272B] text-[#8A9198]'
                      }`}
                    >
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#F5F5F5]">
                        Buzzer Aktif Alarm
                      </div>
                      <div className="text-[10px] text-[#8A9198] font-mono">
                        GPIO 27 &bull; Topik: hidroponik/buzzer
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      hydroponicData.buzzer
                        ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 animate-pulse'
                        : 'bg-[#22272B] text-[#8A9198]'
                    }`}
                  >
                    {hydroponicData.buzzer ? 'BUNYI (ON)' : 'SENYAP (OFF)'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#22272B]/60">
                  <button
                    onClick={() => toggleHydroponicBuzzer(!hydroponicData.buzzer)}
                    className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      hydroponicData.buzzer
                        ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-md'
                        : 'bg-[#22272B] hover:bg-[#2A3136] text-[#F5F5F5]'
                    }`}
                  >
                    {hydroponicData.buzzer ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    {hydroponicData.buzzer ? 'Mute / Hentikan Alarm' : 'Uji Bunyi Buzzer (Test)'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Chart: Telemetry Trends */}
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5]">
                  Tren Telemetri Hidroponik Real-Time
                </h3>
                <p className="text-xs text-[#8A9198] font-mono">
                  Suhu Udara (°C), Kelembapan (% RH), dan Level Air Tandon (%)
                </p>
              </div>

              <span className="text-[10px] font-mono text-[#8A9198]">
                Update setiap 2 detik via MQTT
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hydroponicHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22272B" />
                  <XAxis dataKey="time" stroke="#6E7681" fontSize={10} fontStyle="mono" />
                  <YAxis stroke="#6E7681" fontSize={10} fontStyle="mono" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#141719',
                      border: '1px solid #22272B',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Line
                    type="monotone"
                    dataKey="level"
                    name="Level Air (%)"
                    stroke="#0EA5E9"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="suhu"
                    name="Suhu Udara (°C)"
                    stroke="#FF7A00"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="kelembapan"
                    name="Kelembapan (% RH)"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OTOMATISASI & AMBANG BATAS */}
      {activeTab === 'automation' && (
        <form onSubmit={handleSaveAutomation} className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#FF7A00]" />
                Aturan Otomatisasi & Ambang Batas ESP32
              </h3>
              <p className="text-xs text-[#8A9198] font-mono mt-0.5">
                Nilai ambang batas yang disimpan akan langsung disinkronkan ke ESP32 via topik MQTT <code className="text-[#FF9A3D]">hidroponik/config</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Batas Jarak Alarm HC-SR04 */}
              <div className="p-4 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F5F5F5]">
                    Batas Jarak Alarm HC-SR04 (`BATAS_JARAK`)
                  </span>
                  <span className="text-xs font-mono font-bold text-[#FF9A3D] px-2 py-0.5 rounded bg-[#FF7A00]/15 border border-[#FF7A00]/30">
                    {formBatasJarak} cm
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  step="0.5"
                  value={formBatasJarak}
                  onChange={(e) => setFormBatasJarak(parseFloat(e.target.value))}
                  className="w-full accent-[#FF7A00] cursor-pointer"
                />
                <p className="text-[11px] text-[#8A9198] font-mono">
                  *Alarm buzzer aktif jika jarak air &le; nilai ini (kondisi air tandon meluap atau terlalu dekat dengan sensor).
                </p>
              </div>

              {/* Batas Suhu Alarm DHT22 */}
              <div className="p-4 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F5F5F5]">
                    Batas Suhu Udara Alarm DHT22 (`BATAS_SUHU`)
                  </span>
                  <span className="text-xs font-mono font-bold text-[#EF4444] px-2 py-0.5 rounded bg-[#EF4444]/15 border border-[#EF4444]/30">
                    {formBatasSuhu} °C
                  </span>
                </div>
                <input
                  type="range"
                  min="22"
                  max="45"
                  step="0.5"
                  value={formBatasSuhu}
                  onChange={(e) => setFormBatasSuhu(parseFloat(e.target.value))}
                  className="w-full accent-[#EF4444] cursor-pointer"
                />
                <p className="text-[11px] text-[#8A9198] font-mono">
                  *Alarm buzzer aktif jika suhu udara &ge; nilai ini (kondisi udara panas ekstrem yang mengancam sayuran hidroponik).
                </p>
              </div>

              {/* Kedalaman Tandon Total */}
              <div className="p-4 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#F5F5F5]">
                  Kedalaman Tandon Air Total (cm)
                </label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={formTandonDepth}
                  onChange={(e) => setFormTandonDepth(parseFloat(e.target.value) || 35)}
                  className="w-full bg-[#141719] border border-[#22272B] rounded-lg px-3 py-1.5 text-xs font-mono text-[#F5F5F5] focus:border-[#FF7A00]"
                />
                <p className="text-[11px] text-[#8A9198] font-mono">
                  Jarak dari posisi sensor HC-SR04 ke dasar tandon air saat kosong total.
                </p>
              </div>

              {/* Kapasitas Tandon */}
              <div className="p-4 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#F5F5F5]">
                  Kapasitas Total Tandon (Liter)
                </label>
                <input
                  type="number"
                  min="5"
                  max="5000"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(parseInt(e.target.value, 10) || 50)}
                  className="w-full bg-[#141719] border border-[#22272B] rounded-lg px-3 py-1.5 text-xs font-mono text-[#F5F5F5] focus:border-[#FF7A00]"
                />
                <p className="text-[11px] text-[#8A9198] font-mono">
                  Volume penuh tandon nutrisi hidroponik Anda.
                </p>
              </div>
            </div>

            {/* Otomatisasi Pengisian Pompa Air (Auto Refill) */}
            <div className="p-4 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#F5F5F5] flex items-center gap-2">
                    <Waves className="w-4 h-4 text-[#0EA5E9]" />
                    Otomatisasi Pengisian Tandon (Auto-Refill Pump via Relay GPIO 26)
                  </div>
                  <div className="text-[11px] text-[#8A9198] font-mono">
                    Nyalakan pompa saat air tandon surut dan matikan saat telah terisi penuh
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAutoRefill}
                    onChange={(e) => setFormAutoRefill(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#22272B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0EA5E9]"></div>
                </label>
              </div>

              {formAutoRefill && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#22272B]">
                  <div>
                    <span className="text-xs font-mono text-[#8A9198]">
                      Mulai Isi Pompa jika Level Air &le; : <strong className="text-[#FF9A3D]">{formMinLevel}%</strong>
                    </span>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={formMinLevel}
                      onChange={(e) => setFormMinLevel(parseInt(e.target.value, 10))}
                      className="w-full accent-[#FF7A00] cursor-pointer mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-[#8A9198]">
                      Matikan Pompa jika Level Air &ge; : <strong className="text-[#22C55E]">{formMaxLevel}%</strong>
                    </span>
                    <input
                      type="range"
                      min="60"
                      max="95"
                      value={formMaxLevel}
                      onChange={(e) => setFormMaxLevel(parseInt(e.target.value, 10))}
                      className="w-full accent-[#22C55E] cursor-pointer mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-mono text-xs font-bold bg-[#FF7A00] hover:bg-[#FF9A3D] text-[#0B0D0E] shadow-lg shadow-[#FF7A00]/20 flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Simpan & Sinkronkan ke ESP32 via MQTT
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: WIRING & KODE ESP32 */}
      {activeTab === 'wiring' && (
        <div className="space-y-6">
          {/* Wiring Pinout Table matching user's exact specification */}
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-4">
            <div className="flex items-center justify-between border-b border-[#22272B] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#FF7A00]" />
                  Tabel Wiring Pin Hardware ESP32 Anda
                </h3>
                <p className="text-xs text-[#8A9198] font-mono">
                  Sesuai dengan konfigurasi modul dan catu daya buck converter 5V
                </p>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                100% Sesuai Skema Anda
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border border-[#22272B] rounded-xl overflow-hidden">
                <thead className="bg-[#0B0D0E] text-[#8A9198] border-b border-[#22272B]">
                  <tr>
                    <th className="p-3">Komponen</th>
                    <th className="p-3">Pin Modul</th>
                    <th className="p-3">Pin ESP32</th>
                    <th className="p-3">Fungsi & Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22272B] bg-[#141719]/60">
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">DHT22</td>
                    <td className="p-3 text-[#F5F5F5]">VCC</td>
                    <td className="p-3 text-[#22C55E] font-bold">3.3V</td>
                    <td className="p-3 text-[#8A9198]">Catu daya 3.3V sensor suhu & kelembapan</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">DHT22</td>
                    <td className="p-3 text-[#F5F5F5]">DATA</td>
                    <td className="p-3 text-[#FF9A3D] font-bold">GPIO 4</td>
                    <td className="p-3 text-[#8A9198]">Kabel data pembacaan suhu & kelembapan</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#38BDF8]">DHT22</td>
                    <td className="p-3 text-[#F5F5F5]">GND</td>
                    <td className="p-3 text-[#8A9198]">GND</td>
                    <td className="p-3 text-[#8A9198]">Ground bersama</td>
                  </tr>

                  <tr className="bg-[#0B0D0E]/30">
                    <td className="p-3 font-bold text-[#0EA5E9]">HC-SR04</td>
                    <td className="p-3 text-[#F5F5F5]">VCC</td>
                    <td className="p-3 text-[#EF4444] font-bold">5V</td>
                    <td className="p-3 text-[#8A9198]">Catu daya 5V dari Buck converter</td>
                  </tr>
                  <tr className="bg-[#0B0D0E]/30">
                    <td className="p-3 font-bold text-[#0EA5E9]">HC-SR04</td>
                    <td className="p-3 text-[#F5F5F5]">TRIG</td>
                    <td className="p-3 text-[#FF9A3D] font-bold">GPIO 5</td>
                    <td className="p-3 text-[#8A9198]">Trigger pulsa ultrasonik 10us</td>
                  </tr>
                  <tr className="bg-[#0B0D0E]/30">
                    <td className="p-3 font-bold text-[#0EA5E9]">HC-SR04</td>
                    <td className="p-3 text-[#F5F5F5]">ECHO</td>
                    <td className="p-3 text-[#FF9A3D] font-bold">GPIO 18</td>
                    <td className="p-3 text-[#38BDF8]">
                      Wajib via <strong>Voltage Divider (R 1kΩ & 2kΩ)</strong> agar sinyal 5V turun ke 3.3V aman untuk ESP32!
                    </td>
                  </tr>
                  <tr className="bg-[#0B0D0E]/30">
                    <td className="p-3 font-bold text-[#0EA5E9]">HC-SR04</td>
                    <td className="p-3 text-[#F5F5F5]">GND</td>
                    <td className="p-3 text-[#8A9198]">GND</td>
                    <td className="p-3 text-[#8A9198]">Ground bersama</td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#F59E0B]">Relay Pompa</td>
                    <td className="p-3 text-[#F5F5F5]">VCC</td>
                    <td className="p-3 text-[#EF4444] font-bold">5V</td>
                    <td className="p-3 text-[#8A9198]">Daya koil relay 5V</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#F59E0B]">Relay Pompa</td>
                    <td className="p-3 text-[#F5F5F5]">IN</td>
                    <td className="p-3 text-[#FF9A3D] font-bold">GPIO 26</td>
                    <td className="p-3 text-[#8A9198]">Pemicu ON/OFF Pompa air tandon / nutrisi</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-[#F59E0B]">Relay Pompa</td>
                    <td className="p-3 text-[#F5F5F5]">GND</td>
                    <td className="p-3 text-[#8A9198]">GND</td>
                    <td className="p-3 text-[#8A9198]">Ground bersama</td>
                  </tr>

                  <tr className="bg-[#0B0D0E]/30">
                    <td className="p-3 font-bold text-[#EF4444]">Buzzer Aktif</td>
                    <td className="p-3 text-[#F5F5F5]">(+)</td>
                    <td className="p-3 text-[#FF9A3D] font-bold">GPIO 27</td>
                    <td className="p-3 text-[#8A9198]">Pemicu alarm bunyi peringatan bahaya</td>
                  </tr>
                  <tr className="bg-[#0B0D0E]/30">
                    <td className="p-3 font-bold text-[#EF4444]">Buzzer Aktif</td>
                    <td className="p-3 text-[#F5F5F5]">(-)</td>
                    <td className="p-3 text-[#8A9198]">GND</td>
                    <td className="p-3 text-[#8A9198]">Ground bersama</td>
                  </tr>

                  <tr>
                    <td className="p-3 font-bold text-[#F5F5F5]">Power ESP32</td>
                    <td className="p-3 text-[#F5F5F5]">VIN</td>
                    <td className="p-3 text-[#EF4444] font-bold">5V Buck</td>
                    <td className="p-3 text-[#8A9198]">Tegangan stabil 5V dari DC-DC Buck converter</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Arduino Code Viewer */}
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#22272B] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#FF7A00]" />
                  Kode Lengkap ESP32 Arduino IDE (Siap Flash)
                </h3>
                <p className="text-xs text-[#8A9198] font-mono">
                  Mendukung WiFi, MQTT PubSubClient, JSON Telemetri, dan Kendali Relay & Buzzer
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl border border-[#22272B] bg-[#0B0D0E] hover:border-[#FF7A00] text-xs font-mono text-[#F5F5F5] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                </button>

                <button
                  onClick={handleDownloadCode}
                  className="px-3 py-1.5 rounded-xl bg-[#FF7A00] hover:bg-[#FF9A3D] text-[#0B0D0E] font-bold text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .ino</span>
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div className="p-4 bg-[#0B0D0E] border border-[#22272B] rounded-xl overflow-x-auto max-h-[500px]">
              <pre className="text-xs font-mono text-[#38BDF8] leading-relaxed">
                <code>{getArduinoCode()}</code>
              </pre>
            </div>

            {/* Instruction Checklist */}
            <div className="p-4 bg-[#0B0D0E]/60 border border-[#22272B] rounded-xl space-y-2 text-xs font-mono text-[#8A9198]">
              <div className="font-bold text-[#F5F5F5]">Langkah-Langkah di Arduino IDE:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Buka Arduino IDE &bull; Masuk ke <strong>Tools &rarr; Manage Libraries</strong>.</li>
                <li>Install library: <strong>PubSubClient</strong> (Nick O'Leary), <strong>DHT sensor library</strong> (Adafruit), dan <strong>ArduinoJson</strong> (Benoit Blanchon).</li>
                <li>Ganti <code className="text-[#FF9A3D]">WIFI_SSID</code> dan <code className="text-[#FF9A3D]">WIFI_PASSWORD</code> dengan WiFi Anda di baris konfigurasi atas.</li>
                <li>Pilih Board: <strong>ESP32 Dev Module</strong>, Baud Rate: <strong>115200</strong>, lalu klik <strong>Upload</strong>.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LOG TELEMETRI & MQTT CONSOLE */}
      {activeTab === 'console' && (
        <div className="space-y-6">
          {/* Debug Publisher */}
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-4">
            <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#FF7A00]" />
              Uji Coba Kirim Perintah MQTT (Publisher Test)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-[#8A9198] uppercase mb-1">
                  Topik MQTT
                </label>
                <input
                  type="text"
                  value={debugTopic}
                  onChange={(e) => setDebugTopic(e.target.value)}
                  className="w-full bg-[#0B0D0E] border border-[#22272B] rounded-lg px-3 py-1.5 text-xs font-mono text-[#F5F5F5] focus:border-[#FF7A00]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-mono text-[#8A9198] uppercase mb-1">
                  Payload Pesan (String / JSON)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={debugPayload}
                    onChange={(e) => setDebugPayload(e.target.value)}
                    className="flex-1 bg-[#0B0D0E] border border-[#22272B] rounded-lg px-3 py-1.5 text-xs font-mono text-[#F5F5F5] focus:border-[#FF7A00]"
                  />
                  <button
                    onClick={() => {
                      import('../services/mqttService.js').then(({ mqttService }) => {
                        mqttService.publish(debugTopic, debugPayload);
                      });
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#FF7A00] hover:bg-[#FF9A3D] text-[#0B0D0E] font-mono text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Kirim MQTT
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* MQTT Live Stream Terminal */}
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#38BDF8]" />
                Live Log Aktivitas Paket MQTT
              </h3>
              <span className="text-xs font-mono text-[#8A9198]">
                {mqttLogs.length} paket tercatat
              </span>
            </div>

            <div className="p-4 bg-[#0B0D0E] border border-[#22272B] rounded-xl overflow-y-auto max-h-[400px] font-mono text-xs space-y-1.5">
              {mqttLogs.length === 0 ? (
                <div className="text-[#6E7681] text-center py-8">
                  Menunggu paket masuk dari broker MQTT...
                </div>
              ) : (
                mqttLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 py-1 border-b border-[#22272B]/40 ${
                      log.direction === 'IN'
                        ? 'text-[#22C55E]'
                        : log.direction === 'OUT'
                        ? 'text-[#FF9A3D]'
                        : 'text-[#38BDF8]'
                    }`}
                  >
                    <span className="text-[#6E7681] shrink-0">[{log.timestamp}]</span>
                    <span className="font-bold shrink-0">[{log.direction}]</span>
                    <span className="text-[#8A9198] shrink-0">{log.topic} &rarr;</span>
                    <span className="text-[#F5F5F5] break-all">{log.payload}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INTEGRASI n8n & TELEGRAM BOT */}
      {activeTab === 'n8n' && (
        <div className="space-y-6">
          {/* Header & Status Card */}
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0EA5E9]/15 text-[#38BDF8] border border-[#0EA5E9]/30">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                    Integrasi Otomasi n8n & Notifikasi Bot Telegram
                  </h3>
                  <p className="text-xs text-[#8A9198] font-mono">
                    Teruskan status air tandon, suhu DHT22, peringatan alarm bahaya, dan status pompa langsung ke HP via Telegram.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs font-mono font-bold flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  Telegram Bot Ready
                </span>
              </div>
            </div>
          </div>

          {/* Arsitektur: 2 Pilihan Pengiriman Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Opsi 1: n8n MQTT Trigger (SANGAT DIREKOMENDASIKAN) */}
            <div className="p-5 rounded-2xl bg-[#141719] border border-[#22C55E]/30 hover:border-[#22C55E]/60 transition-all space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#22C55E] text-[#0B0D0E] font-mono text-[10px] font-bold px-3 py-0.5 rounded-bl-lg">
                SANGAT DIREKOMENDASIKAN
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#22C55E]/15 text-[#22C55E]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F5F5F5]">Metode A: Node 'MQTT Trigger' di n8n</h4>
                  <p className="text-[11px] text-[#8A9198] font-mono">ESP32 &rarr; MQTT Broker &rarr; n8n &rarr; Telegram</p>
                </div>
              </div>

              <ul className="text-xs font-mono text-[#8A9198] space-y-1.5 list-disc list-inside">
                <li><strong className="text-[#F5F5F5]">Nol Beban Tambahan di ESP32:</strong> ESP32 tidak butuh HTTPClient atau RAM berlebih untuk TLS/HTTPS.</li>
                <li><strong className="text-[#F5F5F5]">Anti-Spam Telegram:</strong> n8n yang bertugas memfilter: hanya kirim pesan Telegram jika <code className="text-[#38BDF8]">alarm == true</code> atau status pompa berubah.</li>
                <li><strong className="text-[#F5F5F5]">Kendali 2 Arah (Bonus):</strong> Anda bisa kirim chat Telegram <code className="text-[#FF9A3D]">/pompa_on</code> ke bot, lalu n8n publish ke MQTT untuk menyalakan pompa dari chat!</li>
              </ul>
            </div>

            {/* Opsi 2: ESP32 Direct HTTP Webhook */}
            <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#0EA5E9]/15 text-[#38BDF8]">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F5F5F5]">Metode B: Direct HTTP POST dari ESP32</h4>
                  <p className="text-[11px] text-[#8A9198] font-mono">ESP32 &rarr; HTTP POST n8n Webhook &rarr; Telegram</p>
                </div>
              </div>

              <ul className="text-xs font-mono text-[#8A9198] space-y-1.5 list-disc list-inside">
                <li><strong className="text-[#F5F5F5]">Wajib Debounce / Rate Limiting:</strong> Jangan kirim setiap loop 2 detik! Bot Telegram akan error 429 (Too Many Requests).</li>
                <li>Kirim <strong className="text-[#EF4444]">HANYA</strong> saat status alarm berubah (<code className="text-[#EF4444]">ALARM_TRIGGER</code>) atau laporan periodik per 30 menit.</li>
                <li>Gunakan opsi <code className="text-[#FF9A3D]">#define ENABLE_N8N_WEBHOOK true</code> pada tab "Wiring & Kode ESP32" yang sudah kami sediakan.</li>
              </ul>
            </div>
          </div>

          {/* Form Konfigurasi Webhook & Live Test Dispatcher */}
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-5">
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#FF7A00]" />
                Konfigurasi Webhook n8n & Pengujian Langsung
              </h3>
              <p className="text-xs text-[#8A9198] font-mono mt-0.5">
                Simpan URL Webhook n8n dan uji pengiriman paket secara instan langsung dari dashboard ini.
              </p>
            </div>

            <form onSubmit={handleSaveN8nSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-mono font-bold text-[#F5F5F5]">
                    URL Webhook n8n (Production / Test URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://n8n.domainanda.com/webhook/hidroponik-alert"
                    value={n8nWebhookUrl}
                    onChange={(e) => setN8nWebhookUrl(e.target.value)}
                    className="w-full bg-[#0B0D0E] border border-[#22272B] rounded-xl px-3.5 py-2 text-xs font-mono text-[#F5F5F5] focus:border-[#FF7A00] outline-none"
                  />
                  <span className="text-[11px] text-[#8A9198] font-mono block">
                    *Salin path Webhook dari node Webhook di editor n8n Anda (metode POST).
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold text-[#F5F5F5]">
                    Telegram Chat ID (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 123456789 atau @channelname"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full bg-[#0B0D0E] border border-[#22272B] rounded-xl px-3.5 py-2 text-xs font-mono text-[#F5F5F5] focus:border-[#FF7A00] outline-none"
                  />
                  <span className="text-[11px] text-[#8A9198] font-mono block">
                    *Dapatkan ID chat Anda via bot Telegram <code className="text-[#38BDF8]">@userinfobot</code>.
                  </span>
                </div>
              </div>

              {/* Event Triggers Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#0B0D0E] border border-[#22272B] rounded-xl text-xs font-mono">
                <label className="flex items-center gap-2 cursor-pointer text-[#F5F5F5]">
                  <input
                    type="checkbox"
                    checked={n8nSendOnAlarm}
                    onChange={(e) => setN8nSendOnAlarm(e.target.checked)}
                    className="accent-[#FF7A00] rounded"
                  />
                  <span>🚨 Kirim saat Alarm Bahaya (Air/Suhu)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#F5F5F5]">
                  <input
                    type="checkbox"
                    checked={n8nSendOnPumpChange}
                    onChange={(e) => setN8nSendOnPumpChange(e.target.checked)}
                    className="accent-[#FF7A00] rounded"
                  />
                  <span>🔄 Kirim saat Status Pompa Berubah</span>
                </label>

                <div className="flex items-center gap-2 text-[#8A9198]">
                  <span>⏱️ Interval Rutin:</span>
                  <select
                    value={n8nPeriodicMinutes}
                    onChange={(e) => setN8nPeriodicMinutes(Number(e.target.value))}
                    className="bg-[#141719] border border-[#22272B] text-[#F5F5F5] rounded px-2 py-1 text-xs"
                  >
                    <option value={15}>Tiap 15 Menit</option>
                    <option value={30}>Tiap 30 Menit</option>
                    <option value={60}>Tiap 1 Jam</option>
                    <option value={180}>Tiap 3 Jam</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-xs font-mono text-[#8A9198]">
                  Data disimpan lokal di browser & disinkronkan ke preferensi sistem
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#22272B] hover:bg-[#2e343a] text-[#F5F5F5] font-mono text-xs font-bold transition-all cursor-pointer"
                >
                  Simpan Konfigurasi Webhook
                </button>
              </div>
            </form>

            {/* Live Test Dispatcher Buttons */}
            <div className="pt-4 border-t border-[#22272B] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F5F5F5] font-mono">
                  Uji Coba Pengiriman Paket ke n8n (Live Test Simulation):
                </span>
                <span className="text-[11px] font-mono text-[#8A9198]">
                  Uji alur tanpa harus menunggu sensor fisik memicu alarm
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSendTestWebhook('ALARM_TRIGGER')}
                  disabled={testWebhookStatus.loading}
                  className="px-4 py-2 rounded-xl bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 text-[#EF4444] font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Kirim Uji Coba: ALARM BAHAYA (Air 8.2cm & Suhu 32.5°C)
                </button>

                <button
                  type="button"
                  onClick={() => handleSendTestWebhook('PUMP_CHANGE')}
                  disabled={testWebhookStatus.loading}
                  className="px-4 py-2 rounded-xl bg-[#0EA5E9]/20 hover:bg-[#0EA5E9]/30 border border-[#0EA5E9]/40 text-[#38BDF8] font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Power className="w-4 h-4" />
                  Kirim Uji Coba: STATUS POMPA ON
                </button>

                <button
                  type="button"
                  onClick={() => handleSendTestWebhook('PERIODIC_REPORT')}
                  disabled={testWebhookStatus.loading}
                  className="px-4 py-2 rounded-xl bg-[#22C55E]/20 hover:bg-[#22C55E]/30 border border-[#22C55E]/40 text-[#22C55E] font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Kirim Uji Coba: TELEMETRI NORMAL
                </button>
              </div>

              {/* Status Box */}
              {testWebhookStatus.message && (
                <div
                  className={`p-3.5 rounded-xl border font-mono text-xs ${
                    testWebhookStatus.loading
                      ? 'bg-[#0EA5E9]/10 border-[#0EA5E9]/30 text-[#38BDF8] animate-pulse'
                      : testWebhookStatus.success
                      ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                      : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                  }`}
                >
                  <div className="font-bold">{testWebhookStatus.message}</div>
                  {testWebhookStatus.previewPayload && (
                    <details className="mt-2 text-[11px] text-[#8A9198]">
                      <summary className="cursor-pointer text-[#F5F5F5] hover:underline">
                        Lihat JSON Payload yang dikirim
                      </summary>
                      <pre className="mt-1.5 p-2 bg-[#0B0D0E] rounded border border-[#22272B] text-[#38BDF8] overflow-x-auto">
                        {JSON.stringify(testWebhookStatus.previewPayload, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Template Workflow n8n Siap Import (Copy-Paste JSON) */}
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#22272B] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#38BDF8]" />
                  Template Workflow n8n Siap Pakai (Import JSON)
                </h3>
                <p className="text-xs text-[#8A9198] font-mono">
                  Salin JSON ini, buka canvas n8n &rarr; tekan <kbd className="px-1.5 py-0.5 rounded bg-[#0B0D0E] text-[#FF9A3D]">Ctrl + V</kbd> untuk langsung menduplikasi workflow lengkap.
                </p>
              </div>

              <button
                onClick={handleCopyN8nWorkflow}
                className="px-4 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#38BDF8] text-[#0B0D0E] font-mono text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-[#0EA5E9]/20 transition-all shrink-0"
              >
                {copiedN8nJson ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedN8nJson ? 'Workflow Tersalin!' : 'Salin JSON Workflow n8n'}
              </button>
            </div>

            {/* Workflow Diagram & Node Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-1">
                <span className="text-[10px] text-[#38BDF8] font-bold">1. NODE INPUT</span>
                <div className="font-bold text-[#F5F5F5]">Webhook / MQTT Trigger</div>
                <div className="text-[11px] text-[#8A9198]">Menerima event POST atau langganan topik telemetri.</div>
              </div>
              <div className="p-3 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-1">
                <span className="text-[10px] text-[#FF9A3D] font-bold">2. NODE CODE (FILTER)</span>
                <div className="font-bold text-[#F5F5F5]">Format Pesan Markdown</div>
                <div className="text-[11px] text-[#8A9198]">Merapikan teks sensor dengan emoji alarm dan status pompa.</div>
              </div>
              <div className="p-3 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-1">
                <span className="text-[10px] text-[#22C55E] font-bold">3. NODE TELEGRAM</span>
                <div className="font-bold text-[#F5F5F5]">Send Telegram Message</div>
                <div className="text-[11px] text-[#8A9198]">Kirim pesan instan ke HP via Telegram Bot Anda.</div>
              </div>
            </div>

            {/* Raw JSON Preview */}
            <div className="relative">
              <pre className="p-4 bg-[#0B0D0E] border border-[#22272B] rounded-xl font-mono text-[11px] text-[#38BDF8] overflow-x-auto max-h-[280px]">
                {getN8nWorkflowJson()}
              </pre>
            </div>
          </div>

          {/* Panduan 4 Langkah Praktis Konfigurasi Telegram Bot */}
          <div className="p-5 rounded-2xl bg-[#141719] border border-[#22272B] space-y-4">
            <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#22C55E]" />
              Panduan 4 Langkah Menyiapkan Bot Telegram & n8n
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3.5 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-[#38BDF8] font-bold">
                  <span className="w-5 h-5 rounded-full bg-[#0EA5E9]/20 text-center leading-5 text-[11px]">1</span>
                  Buat Bot Telegram di @BotFather
                </div>
                <p className="text-[#8A9198] text-[11px] leading-relaxed">
                  Buka Telegram, cari <strong className="text-[#F5F5F5]">@BotFather</strong>, kirim perintah <code className="text-[#FF9A3D]">/newbot</code>. Beri nama bot (contoh: <em>PanganSense Hidroponik Bot</em>). Anda akan mendapat <strong>Bot Token HTTP API</strong> (contoh: <code>123456789:ABCdefGhI...</code>).
                </p>
              </div>

              <div className="p-3.5 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-[#38BDF8] font-bold">
                  <span className="w-5 h-5 rounded-full bg-[#0EA5E9]/20 text-center leading-5 text-[11px]">2</span>
                  Dapatkan Chat ID Anda via @userinfobot
                </div>
                <p className="text-[#8A9198] text-[11px] leading-relaxed">
                  Cari <strong className="text-[#F5F5F5]">@userinfobot</strong> di Telegram lalu klik <em>Start</em>. Catat angka <strong>Id</strong> Anda (contoh: <code>987654321</code>). Lalu kirim pesan pertama <code className="text-[#FF9A3D]">/start</code> ke bot buatan Anda di Langkah 1.
                </p>
              </div>

              <div className="p-3.5 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-[#38BDF8] font-bold">
                  <span className="w-5 h-5 rounded-full bg-[#0EA5E9]/20 text-center leading-5 text-[11px]">3</span>
                  Paste Workflow di n8n & Sambungkan Kredensial
                </div>
                <p className="text-[#8A9198] text-[11px] leading-relaxed">
                  Buka editor n8n Anda &rarr; buat canvas baru &rarr; tekan <strong className="text-[#F5F5F5]">Ctrl + V</strong>. Dobel klik node <strong>Telegram</strong> &rarr; pilih <em>Create New Credential</em> &rarr; masukkan <strong>Bot Token</strong> dari Langkah 1.
                </p>
              </div>

              <div className="p-3.5 bg-[#0B0D0E] border border-[#22272B] rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-[#22C55E] font-bold">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/20 text-center leading-5 text-[11px]">4</span>
                  Aktifkan Workflow (Active Toggle)
                </div>
                <p className="text-[#8A9198] text-[11px] leading-relaxed">
                  Ubah toggle workflow di pojok kanan atas n8n dari <em>Inactive</em> menjadi <strong className="text-[#22C55E]">Active</strong>. Sekarang sistem Anda siap menerima peringatan saat suhu panas atau air meluap secara otomatis!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfigurasi Broker MQTT */}
      <MqttConfigModal
        isOpen={isMqttModalOpen}
        onClose={() => setIsMqttModalOpen(false)}
      />
    </div>
  );
}

// Function to return ready-to-import n8n workflow JSON
function getN8nWorkflowJson() {
  const workflow = {
    name: "PanganSense Hidroponik Alert & Telegram Bot",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "hidroponik-alert",
          options: {}
        },
        id: "webhook-trigger-node",
        name: "Webhook ESP32 / Web",
        type: "n8n-nodes-base.webhook",
        typeVersion: 1.1,
        position: [240, 300]
      },
      {
        parameters: {
          jsCode: `// n8n Code Node: Format payload telemetri menjadi pesan Telegram
const item = $input.first().json;
const body = item.body || item;

const event = body.event || (body.alarm ? 'ALARM_TRIGGER' : 'UPDATE');
const suhu = body.suhu ?? 'N/A';
const kelembapan = body.kelembapan ?? 'N/A';
const jarak = body.jarak ?? 'N/A';
const relay = (body.relay === 1 || body.relay === true) ? '🟢 MENYALA (ON)' : '⚪ MATI (OFF)';
const buzzer = (body.buzzer === 1 || body.buzzer === true) ? '🔊 AKTIF' : 'SENYAP';
const isAlarm = Boolean(body.alarm);

let text = '';
if (isAlarm || event === 'ALARM_TRIGGER') {
  text = '🚨 *[PERINGATAN] ALARM HIDROPONIK AKTIF!*\\n\\n';
  if (jarak >= 0 && jarak <= (body.batasJarak || 10)) {
    text += \`⚠️ *Tandon Air Meluap / Terlalu Dekat:* \${jarak} cm\\n\`;
  }
  if (suhu >= (body.batasSuhu || 30)) {
    text += \`🔥 *Suhu Udara Panas Ekstrem:* \${suhu} °C\\n\`;
  }
} else if (event === 'PUMP_CHANGE') {
  text = '🔄 *[STATUS POMPA AIR BERUBAH]*\\n\\n';
} else {
  text = '🌱 *[LAPORAN TELEMETRI HIDROPONIK]*\\n\\n';
}

text += \`🌡️ Suhu Udara: *\${suhu} °C*\\n\`;
text += \`💧 Kelembapan: *\${kelembapan} %*\\n\`;
text += \`📏 Ketinggian Air (HC-SR04): *\${jarak} cm*\\n\`;
text += \`⚡ Pompa Nutrisi (GPIO 26): *\${relay}*\\n\`;
text += \`🔔 Buzzer Alarm (GPIO 27): *\${buzzer}*\\n\`;
text += \`⚙️ Mode: *\${body.mode || 'auto'}*\\n\`;
text += \`⏱️ Waktu: \${new Date().toLocaleTimeString('id-ID')}\`;

return [{ json: { text, chatId: body.chatId || '' } }];`
        },
        id: "format-telegram-message",
        name: "Format Pesan Telegram",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [480, 300]
      },
      {
        parameters: {
          chatId: "={{ $json.chatId || 'MASUKKAN_CHAT_ID_TELEGRAM_ANDA' }}",
          text: "={{ $json.text }}",
          additionalFields: {
            parse_mode: "Markdown"
          }
        },
        id: "telegram-bot-send",
        name: "Kirim Telegram",
        type: "n8n-nodes-base.telegram",
        typeVersion: 1.2,
        position: [720, 300]
      }
    ],
    connections: {
      "Webhook ESP32 / Web": {
        main: [
          [
            {
              node: "Format Pesan Telegram",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Format Pesan Telegram": {
        main: [
          [
            {
              node: "Kirim Telegram",
              type: "main",
              index: 0
            }
          ]
        ]
      }
    }
  };
  return JSON.stringify(workflow, null, 2);
}

// Function to return the complete ready-to-flash Arduino code
function getArduinoCode() {
  return `/*
  ==============================================================================
  PANGAN-SENSE: SISTEM HIDROPONIK ESP32 via MQTT & n8n WEBHOOK
  ==============================================================================
  Wiring:
    - DHT22 DATA   -> GPIO 4 (VCC 3.3V)
    - HC-SR04 TRIG -> GPIO 5 (VCC 5V)
    - HC-SR04 ECHO -> GPIO 18 (via voltage divider R1=1k, R2=2k)
    - Relay IN     -> GPIO 26 (VCC 5V)
    - Buzzer (+)   -> GPIO 27
    - ESP32 VIN    -> 5V Buck Converter
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

const char* WIFI_SSID     = "NAMA_WIFI_ANDA";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";

const char* MQTT_BROKER   = "broker.emqx.io";
const int   MQTT_PORT     = 1883;
const char* TOPIC_TELEMETRI = "hidroponik/telemetri";
const char* TOPIC_POMPA     = "hidroponik/pompa";
const char* TOPIC_BUZZER    = "hidroponik/buzzer";
const char* TOPIC_MODE      = "hidroponik/mode";
const char* TOPIC_CONFIG    = "hidroponik/config";
const char* TOPIC_KENDALI   = "hidroponik/kendali";

// Integrasi Langsung n8n Webhook (Opsional)
// Jika menggunakan n8n MQTT Trigger, biarkan false.
// Jika ingin ESP32 kirim HTTP POST langsung, ubah ke true.
#define ENABLE_N8N_WEBHOOK false
const char* N8N_WEBHOOK_URL = "http://192.168.1.100:5678/webhook/hidroponik-alert";

#define DHT_PIN      4
#define DHT_TYPE     DHT22
#define TRIG_PIN     5
#define ECHO_PIN     18
#define RELAY_PIN    26
#define BUZZER_PIN   27

float batasJarak = 10.0; // cm
float batasSuhu  = 30.0; // C
String currentMode = "auto";
bool relayState = false;
bool buzzerState = false;
bool alarmActive = false;

bool previousAlarmState = false;
bool previousRelayState = false;
unsigned long lastWebhookAlertMillis = 0;
const unsigned long MIN_ALERT_INTERVAL = 30000; // Minimal jeda 30 detik antar notifikasi n8n

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
unsigned long lastMillis = 0;

void setRelay(bool state) {
  relayState = state;
  digitalWrite(RELAY_PIN, state ? HIGH : LOW);
}

void setBuzzer(bool state) {
  buzzerState = state;
  digitalWrite(BUZZER_PIN, state ? HIGH : LOW);
}

float readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long durasi = pulseIn(ECHO_PIN, HIGH, 30000);
  if (durasi <= 0) return -1.0;
  return (durasi * 0.0343) / 2.0;
}

void sendN8nAlert(const char* eventType, float suhu, float kelembapan, float jarak) {
#if ENABLE_N8N_WEBHOOK
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(N8N_WEBHOOK_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  StaticJsonDocument<256> doc;
  doc["event"]      = eventType;
  doc["suhu"]       = !isnan(suhu) ? suhu : 0.0;
  doc["kelembapan"]  = !isnan(kelembapan) ? kelembapan : 0.0;
  doc["jarak"]      = jarak;
  doc["relay"]      = relayState ? 1 : 0;
  doc["buzzer"]     = buzzerState ? 1 : 0;
  doc["alarm"]      = alarmActive;

  char buf[256];
  serializeJson(doc, buf);
  http.POST(buf);
  http.end();
#endif
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  msg.trim();

  if (String(topic) == TOPIC_POMPA) {
    setRelay(msg == "1" || msg.equalsIgnoreCase("ON"));
  } else if (String(topic) == TOPIC_BUZZER) {
    setBuzzer(msg == "1" || msg.equalsIgnoreCase("ON"));
  } else if (String(topic) == TOPIC_MODE) {
    currentMode = msg;
  } else if (String(topic) == TOPIC_CONFIG) {
    StaticJsonDocument<256> doc;
    if (!deserializeJson(doc, msg)) {
      if (doc.containsKey("batasJarak")) batasJarak = doc["batasJarak"];
      if (doc.containsKey("batasSuhu"))  batasSuhu  = doc["batasSuhu"];
      if (doc.containsKey("mode"))       currentMode = doc["mode"].as<String>();
    }
  } else if (String(topic) == TOPIC_KENDALI) {
    StaticJsonDocument<256> doc;
    if (!deserializeJson(doc, msg)) {
      if (doc.containsKey("relay"))  setRelay(doc["relay"] == 1);
      if (doc.containsKey("buzzer")) setBuzzer(doc["buzzer"] == 1);
      if (doc.containsKey("mode"))   currentMode = doc["mode"].as<String>();
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(TRIG_PIN, LOW);
  setRelay(false);
  setBuzzer(false);

  dht.begin();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      String id = "ESP32_Hidro_" + String(random(0xffff), HEX);
      if (mqttClient.connect(id.c_str())) {
        mqttClient.subscribe(TOPIC_POMPA);
        mqttClient.subscribe(TOPIC_BUZZER);
        mqttClient.subscribe(TOPIC_MODE);
        mqttClient.subscribe(TOPIC_CONFIG);
        mqttClient.subscribe(TOPIC_KENDALI);
      }
    }
    mqttClient.loop();
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastMillis >= 2000) {
    lastMillis = currentMillis;
    float jarak = readDistance();
    float suhu = dht.readTemperature();
    float kelembapan = dht.readHumidity();

    bool jarakDekat = (jarak >= 0 && jarak <= batasJarak);
    bool suhuTinggi = (!isnan(suhu) && suhu >= batasSuhu);
    alarmActive = (jarakDekat || suhuTinggi);

    if (currentMode == "auto") {
      setBuzzer(alarmActive);
    }

    if (mqttClient.connected()) {
      StaticJsonDocument<256> doc;
      doc["suhu"] = !isnan(suhu) ? suhu : 0.0;
      doc["kelembapan"] = !isnan(kelembapan) ? kelembapan : 0.0;
      doc["jarak"] = jarak;
      doc["relay"] = relayState ? 1 : 0;
      doc["buzzer"] = buzzerState ? 1 : 0;
      doc["alarm"] = alarmActive;
      doc["mode"] = currentMode;

      char buf[256];
      serializeJson(doc, buf);
      mqttClient.publish(TOPIC_TELEMETRI, buf);
    }

    // Debounce Event Alerts untuk n8n / Telegram
    if (alarmActive != previousAlarmState) {
      if (currentMillis - lastWebhookAlertMillis >= MIN_ALERT_INTERVAL) {
        lastWebhookAlertMillis = currentMillis;
        previousAlarmState = alarmActive;
        sendN8nAlert(alarmActive ? "ALARM_TRIGGER" : "ALARM_NORMAL", suhu, kelembapan, jarak);
      }
    }
    if (relayState != previousRelayState) {
      previousRelayState = relayState;
      sendN8nAlert("PUMP_CHANGE", suhu, kelembapan, jarak);
    }
  }
}`;
}
