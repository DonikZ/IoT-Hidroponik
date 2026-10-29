import React from 'react';
import { Droplet, AlertTriangle, CheckCircle, Waves, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function HydroponicWaterTank({
  waterLevelPercent = 65,
  jarakCm = 18.0,
  waterVolumeLiters = 32.5,
  capacityLiters = 50,
  batasJarak = 10.0,
  isAlarm = false,
  isPumpActive = false,
  onRefillClick = null
}) {
  const isTooClose = jarakCm >= 0 && jarakCm <= batasJarak;
  const isCriticallyLow = waterLevelPercent <= 20;
  const isLow = waterLevelPercent > 20 && waterLevelPercent <= 35;
  const isOptimal = waterLevelPercent > 35 && !isTooClose;

  let statusBg = 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]';
  let statusText = 'Normal & Terpenuhi';
  let statusBadge = 'Aman';

  if (isTooClose) {
    statusBg = 'bg-[#EF4444]/20 border-[#EF4444]/60 text-[#EF4444]';
    statusText = `Peringatan: Jarak sensor ${jarakCm.toFixed(1)} cm <= Batas (${batasJarak} cm). Air meluap/terlalu dekat!`;
    statusBadge = 'Meluap / Kritis';
  } else if (isCriticallyLow) {
    statusBg = 'bg-[#EF4444]/20 border-[#EF4444]/60 text-[#EF4444]';
    statusText = 'Level air kritis (< 20%). Tandon segera butuh pengisian!';
    statusBadge = 'Kritis Rendah';
  } else if (isLow) {
    statusBg = 'bg-[#FF7A00]/20 border-[#FF7A00]/50 text-[#FF9A3D]';
    statusText = 'Level air mendekati batas bawah tandon.';
    statusBadge = 'Perlu Refill';
  }

  // Water fill color
  const fillColor = isTooClose || isCriticallyLow
    ? '#EF4444'
    : isLow
    ? '#FF7A00'
    : '#0EA5E9';

  const clampedLevel = Math.max(0, Math.min(100, waterLevelPercent));

  return (
    <div className="bg-[#141719] border border-[#22272B] rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-lg">
      {/* Background glow on alarm */}
      {isAlarm && (
        <div className="absolute inset-0 bg-[#EF4444]/5 pointer-events-none animate-pulse" />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0EA5E9]/15 text-[#38BDF8] border border-[#0EA5E9]/30">
            <Droplet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F5F5F5] flex items-center gap-2">
              Keadaan Air Tandon Hidroponik
              {isPumpActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0EA5E9]/20 text-[#38BDF8] border border-[#0EA5E9]/40 flex items-center gap-1 animate-pulse">
                  <Waves className="w-3 h-3" /> Pompa Mengisi
                </span>
              )}
            </h3>
            <p className="text-xs text-[#8A9198] font-mono">
              Sensor Ultrasonic HC-SR04 (TRIG: GPIO 5, ECHO: GPIO 18)
            </p>
          </div>
        </div>

        <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${statusBg}`}>
          {statusBadge}
        </span>
      </div>

      {/* Main Tank Visual and Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center my-2">
        {/* Animated Cylindrical Tank */}
        <div className="sm:col-span-5 flex flex-col items-center">
          <div className="w-32 h-44 rounded-2xl border-2 border-[#2A3136] bg-[#0B0D0E] relative overflow-hidden flex flex-col justify-end shadow-inner p-1">
            {/* Measurement lines */}
            <div className="absolute inset-x-2 top-2 border-b border-[#2A3136]/60 text-[9px] text-[#6E7681] font-mono flex justify-between">
              <span>Full (100%)</span>
              <span>Min Dist</span>
            </div>
            <div className="absolute inset-x-2 top-1/2 border-b border-dashed border-[#2A3136]/50 text-[9px] text-[#6E7681] font-mono flex justify-between">
              <span>50%</span>
            </div>
            <div className="absolute inset-x-2 bottom-3 border-t border-[#EF4444]/40 text-[9px] text-[#EF4444]/80 font-mono flex justify-between">
              <span>Batas Kritis (20%)</span>
            </div>

            {/* Ultrasonic sensor beam indicator */}
            <div className="absolute top-0 inset-x-0 h-4 bg-[#FF7A00]/20 flex items-center justify-center border-b border-[#FF7A00]/40 text-[8px] font-mono text-[#FF9A3D]">
              HC-SR04 BEAM
            </div>

            {/* Water Column */}
            <div
              className="w-full rounded-b-xl transition-all duration-700 ease-out relative overflow-hidden"
              style={{
                height: `${clampedLevel}%`,
                background: `linear-gradient(180deg, ${fillColor}CC 0%, ${fillColor} 100%)`,
                boxShadow: `0 0 16px ${fillColor}40`
              }}
            >
              {/* Wave surface shimmer */}
              <div className="absolute top-0 inset-x-0 h-2 bg-white/30 animate-pulse" />
              
              {/* Internal percentage text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-black font-mono text-white drop-shadow">
                  {clampedLevel}%
                </span>
              </div>
            </div>
          </div>

          <span className="text-[11px] text-[#8A9198] font-mono mt-2 text-center">
            Kapasitas: {capacityLiters} Liter
          </span>
        </div>

        {/* Detailed Metrics Panel */}
        <div className="sm:col-span-7 space-y-3">
          {/* Card: Jarak Sensor */}
          <div className="p-3 bg-[#0B0D0E]/80 border border-[#22272B] rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#8A9198] uppercase font-mono">
                Jarak Sensor ke Permukaan Air
              </div>
              <div className="text-lg font-black font-mono text-[#F5F5F5] flex items-baseline gap-1">
                {jarakCm >= 0 ? jarakCm.toFixed(1) : 'Sensor Lepas'}
                <span className="text-xs text-[#8A9198] font-normal">cm</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#8A9198] font-mono">Batas Alarm</div>
              <span className="text-xs font-mono font-bold text-[#FF9A3D] bg-[#FF7A00]/10 px-2 py-0.5 rounded border border-[#FF7A00]/30">
                &le; {batasJarak.toFixed(1)} cm
              </span>
            </div>
          </div>

          {/* Card: Volume Tersisa */}
          <div className="p-3 bg-[#0B0D0E]/80 border border-[#22272B] rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#8A9198] uppercase font-mono">
                Estimasi Volume Air Nutrisi
              </div>
              <div className="text-lg font-black font-mono text-[#38BDF8] flex items-baseline gap-1">
                {waterVolumeLiters.toFixed(1)}
                <span className="text-xs text-[#8A9198] font-normal">/ {capacityLiters} L</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#38BDF8]/10 text-[#38BDF8]">
              <Waves className="w-4 h-4" />
            </div>
          </div>

          {/* Card: Status Air */}
          <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2.5 ${statusBg}`}>
            {isTooClose || isCriticallyLow ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusText}</span>
          </div>
        </div>
      </div>

      {/* Footer Info / Action */}
      <div className="mt-3 pt-3 border-t border-[#22272B] flex items-center justify-between text-xs text-[#8A9198] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0EA5E9]" />
          <span>Ultrasonic Time-of-Flight pulsa suara 343 m/s</span>
        </div>
      </div>
    </div>
  );
}
