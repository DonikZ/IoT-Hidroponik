/**
 * MQTT Client Service for Hydroponics System
 * Supports standard MQTT over WebSockets (e.g. wss://broker.emqx.io:8084/mqtt, wss://broker.hivemq.com:8884/mqtt)
 * Connects directly from the browser to receive telemetry and send actuator commands to ESP32
 */
import mqtt from 'mqtt';

export const DEFAULT_MQTT_CONFIG = {
  brokerUrl: 'wss://broker.emqx.io:8084/mqtt',
  fallbackBrokerUrl: 'wss://broker.hivemq.com:8884/mqtt',
  topicTelemetry: 'hidroponik/telemetri',
  topicCommand: 'hidroponik/kendali',
  topicPump: 'hidroponik/pompa',
  topicBuzzer: 'hidroponik/buzzer',
  topicMode: 'hidroponik/mode',
  topicConfig: 'hidroponik/config',
  clientIdPrefix: 'web_hidro_',
  keepalive: 60,
  clean: true,
  reconnectPeriod: 4000,
  connectTimeout: 10000,
};

export const MQTT_STATUS = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
  RECONNECTING: 'RECONNECTING',
};

class MqttService {
  constructor() {
    this.client = null;
    this.status = MQTT_STATUS.DISCONNECTED;
    this.statusListeners = new Set();
    this.messageListeners = new Set();
    this.logListeners = new Set();
    this.lastPacketTime = null;
    this.config = { ...DEFAULT_MQTT_CONFIG };
    this.activityLogs = [];
    this.errorCount = 0;
  }

  // Add event listeners
  onStatusChange(cb) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  onMessage(cb) {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  onLog(cb) {
    this.logListeners.add(cb);
    return () => this.logListeners.delete(cb);
  }

  setStatus(newStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((cb) => cb(this.status));
  }

  addLog(direction, topic, payload, isSuccess = true) {
    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toLocaleTimeString('id-ID'),
      direction, // 'IN' | 'OUT' | 'SYS'
      topic,
      payload: typeof payload === 'object' ? JSON.stringify(payload) : String(payload),
      isSuccess,
    };
    this.activityLogs = [entry, ...this.activityLogs.slice(0, 49)];
    this.logListeners.forEach((cb) => cb(this.activityLogs));
  }

  // Connect to MQTT Broker
  connect(customConfig = {}) {
    this.config = { ...this.config, ...customConfig };

    if (this.client) {
      try {
        this.client.end(true);
      } catch (e) {
        console.warn('Error closing prior MQTT client:', e);
      }
      this.client = null;
    }

    this.setStatus(MQTT_STATUS.CONNECTING);
    this.addLog('SYS', 'connection', `Menghubungkan ke ${this.config.brokerUrl}...`);

    const clientId = `${this.config.clientIdPrefix}${Math.random().toString(16).substring(2, 8)}`;

    try {
      this.client = mqtt.connect(this.config.brokerUrl, {
        clientId,
        clean: this.config.clean,
        keepalive: this.config.keepalive,
        reconnectPeriod: this.config.reconnectPeriod,
        connectTimeout: this.config.connectTimeout,
      });

      this.client.on('connect', () => {
        this.setStatus(MQTT_STATUS.CONNECTED);
        this.errorCount = 0;
        this.addLog('SYS', 'connection', `Terhubung ke broker MQTT (${clientId})`);

        // Subscribe to telemetry and device state
        const topics = [
          this.config.topicTelemetry,
          this.config.topicPump,
          this.config.topicBuzzer,
          this.config.topicMode,
          'hidroponik/status',
        ];

        topics.forEach((t) => {
          this.client.subscribe(t, { qos: 0 }, (err) => {
            if (err) {
              this.addLog('SYS', t, `Gagal subscribe: ${err.message}`, false);
            } else {
              this.addLog('SYS', t, `Subscribed`);
            }
          });
        });
      });

      this.client.on('message', (topic, messageBuffer) => {
        const raw = messageBuffer.toString();
        this.lastPacketTime = Date.now();

        let parsedData = null;
        try {
          parsedData = JSON.parse(raw);
        } catch {
          parsedData = raw;
        }

        this.addLog('IN', topic, raw, true);
        this.messageListeners.forEach((cb) => cb(topic, parsedData, raw));
      });

      this.client.on('reconnect', () => {
        this.setStatus(MQTT_STATUS.RECONNECTING);
        this.addLog('SYS', 'connection', 'Mencoba menghubungkan ulang...');
      });

      this.client.on('close', () => {
        if (this.status !== MQTT_STATUS.DISCONNECTED) {
          this.setStatus(MQTT_STATUS.DISCONNECTED);
          this.addLog('SYS', 'connection', 'Koneksi MQTT terputus');
        }
      });

      this.client.on('error', (err) => {
        console.error('[MQTT Client Error]', err);
        this.setStatus(MQTT_STATUS.ERROR);
        this.errorCount++;
        this.addLog('SYS', 'error', err.message || 'Kesalahan MQTT', false);
      });
    } catch (err) {
      console.error('[MQTT Init Error]', err);
      this.setStatus(MQTT_STATUS.ERROR);
      this.addLog('SYS', 'error', err.message, false);
    }
  }

  // Disconnect cleanly
  disconnect() {
    if (this.client) {
      try {
        this.client.end(true);
      } catch (err) {
        console.warn('Disconnect error:', err);
      }
      this.client = null;
    }
    this.setStatus(MQTT_STATUS.DISCONNECTED);
    this.addLog('SYS', 'connection', 'Diputus secara manual oleh pengguna');
  }

  // Publish helper
  publish(topic, payload, qos = 0) {
    if (!this.client || this.status !== MQTT_STATUS.CONNECTED) {
      this.addLog('OUT', topic, payload, false);
      return false;
    }

    const payloadString = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);

    this.client.publish(topic, payloadString, { qos }, (err) => {
      if (err) {
        this.addLog('OUT', topic, `Gagal publish: ${err.message}`, false);
      } else {
        this.addLog('OUT', topic, payloadString, true);
      }
    });

    return true;
  }

  // Quick command helpers
  publishPump(state) {
    // state: true/false or 1/0 or 'ON'/'OFF'
    const val = state ? 1 : 0;
    const json = JSON.stringify({ relay: val, timestamp: Date.now() });
    this.publish(this.config.topicPump, String(val));
    this.publish(this.config.topicCommand, json);
  }

  publishBuzzer(state) {
    const val = state ? 1 : 0;
    const json = JSON.stringify({ buzzer: val, timestamp: Date.now() });
    this.publish(this.config.topicBuzzer, String(val));
    this.publish(this.config.topicCommand, json);
  }

  publishMode(mode) {
    // mode: 'auto' | 'manual'
    this.publish(this.config.topicMode, mode);
    this.publish(this.config.topicCommand, JSON.stringify({ mode, timestamp: Date.now() }));
  }

  publishConfig(configObj) {
    this.publish(this.config.topicConfig, JSON.stringify(configObj));
  }
}

export const mqttService = new MqttService();
export default mqttService;
