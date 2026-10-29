import React from 'react';
import { Thermometer, Wind, Sprout, AlertCircle, CheckCircle2, Flame, Sparkles } from 'lucide-react';

export default function HydroponicPlantMicroclimate({
  suhu = 26.5,
  kelembapan = 70.0,
  batasSuhu = 30.0,
  isAlarm = false
}) {
  const isHighTemp = suhu >= batasSuhu;
  const isLowTemp = suhu < 18.0;
  const isOptimalTemp = !isHighTemp && !isLowTemp;

  // VPD (Vapor Pressure Deficit) Calculation
  // SVP = 0.61078 * exp((17.27 * T) / (T + 237.3)) kPa
  // VPD = SVP * (1 - RH / 100)
  const svp = 0.61078 * Math.exp((17.27 * suhu) / (suhu + 237.3));
  const vpd = Math.max(0, svp * (1 - kelembapan / 100));

  let vpdStatus = 'Optimal Transpirasi';
  let vpdColor = 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/30';
  if (vpd < 0.4) {
    vpdStatus = 'Terlalu Lembap (Risiko Jamur)';
    vpdColor = 'text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/30';
  } else if (vpd > 1.4) {
    vpdStatus = 'Udara Kering (Stres Air)';
    vpdColor = 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30';
  } else if (vpd > 1.1) {
    vpdStatus = 'Agak Kering';
    vpdColor = 'text-[#FF9A3D] bg-[#FF7A00]/10 border-[#FF7A00]/30';
  }

  return (
    <div className="bg-[#141719] border border-[#22272B] rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-lg">
      {/* Alarm glow */}
      {isHighTemp && (
        <div className="absolute inset-0 bg-[#EF4444]/5 pointer-events-none animate-pulse" />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
              Keadaan Iklim Tumbuhan
              {isHighTemp && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 flex items-center gap-1 animate-pulse">
                  <Flame className="w-3 h-3" /> Suhu Tinggi
                </span>
              )}
            </h3>
            <p className="text-xs text-[#8A9198] font-mono">
              Sensor DHT22 (DATA: GPIO 4)
            </p>
          </div>
        </div>

        <span
          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
            isHighTemp
              ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
              : 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
          }`}
        >
          {isHighTemp ? 'Peringatan Panas' : 'Kondisi Prima'}
        </span>
      </div>

      {/* Sensor Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-2">
        {/* Card Suhu DHT22 */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isHighTemp
              ? 'bg-[#EF4444]/10 border-[#EF4444]/40'
              : 'bg-[#0B0D0E]/80 border-[#22272B]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[#8A9198] uppercase font-mono">
              Suhu Udara (DHT22)
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                isHighTemp ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#FF7A00]/15 text-[#FF9A3D]'
              }`}
            >
              <Thermometer className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black font-mono ${
                isHighTemp ? 'text-[#EF4444]' : 'text-[#F5F5F5]'
              }`}
            >
              {suhu.toFixed(1)}
            </span>
            <span className="text-xs text-[#8A9198] font-mono">°C</span>
          </div>

          <div className="mt-2 pt-2 border-t border-[#22272B]/60 flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#8A9198]">Batas Alarm: &ge; {batasSuhu.toFixed(1)}°C</span>
            <span
              className={
                isHighTemp
                  ? 'text-[#EF4444] font-bold'
                  : isOptimalTemp
                  ? 'text-[#22C55E]'
                  : 'text-[#38BDF8]'
              }
            >
              {isHighTemp ? 'PANAS EKSTREM' : isOptimalTemp ? 'SEJUK OPTIMAL' : 'DINGIN'}
            </span>
          </div>
        </div>

        {/* Card Kelembapan DHT22 */}
        <div className="p-3.5 bg-[#0B0D0E]/80 border border-[#22272B] rounded-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[#8A9198] uppercase font-mono">
              Kelembapan Udara (RH)
            </span>
            <div className="p-1.5 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8]">
              <Wind className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-[#38BDF8]">
              {kelembapan.toFixed(1)}
            </span>
            <span className="text-xs text-[#8A9198] font-mono">% RH</span>
          </div>

          <div className="mt-2 pt-2 border-t border-[#22272B]/60 flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#8A9198]">Ideal: 60 - 80%</span>
            <span
              className={
                kelembapan >= 60 && kelembapan <= 80
                  ? 'text-[#22C55E]'
                  : kelembapan > 80
                  ? 'text-[#38BDF8]'
                  : 'text-[#FF9A3D]'
              }
            >
              {kelembapan >= 60 && kelembapan <= 80
                ? 'IDEAL'
                : kelembapan > 80
                ? 'LEMBAP TINGGI'
                : 'KERING'}
            </span>
          </div>
        </div>
      </div>

      {/* Agronomic VPD & Plant Comfort Index */}
      <div className="mt-2 p-3 bg-[#0B0D0E]/60 border border-[#22272B] rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#22C55E]" />
          <div>
            <div className="text-[11px] font-bold text-[#F5F5F5]">
              VPD Transpirasi Daun: <span className="font-mono text-[#38BDF8]">{vpd.toFixed(2)} kPa</span>
            </div>
            <div className="text-[10px] text-[#8A9198] font-mono">
              Indeks laju serapan nutrisi stomata selada / sayuran
            </div>
          </div>
        </div>

        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${vpdColor}`}>
          {vpdStatus}
        </span>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-3 border-t border-[#22272B] flex items-center justify-between text-xs text-[#8A9198] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span>Microclimate Leaf Canopy Protection Active</span>
        </div>
      </div>
    </div>
  );
}
