"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { RoutePoint } from "@/lib/types";

interface ElevationProfileProps {
  points: RoutePoint[];
  activeIndex: number | null;
  focusedDistanceKm: number | null;
  onHoverIndex: (index: number | null) => void;
  compact?: boolean;
}

export function ElevationProfile({
  points,
  activeIndex,
  focusedDistanceKm,
  onHoverIndex,
  compact = false
}: ElevationProfileProps) {
  const activeDistance =
    activeIndex !== null && points[activeIndex] ? Number(points[activeIndex].distKm.toFixed(2)) : null;

  return (
    <div className="profile-wrap" data-testid="elevation-profile">
      <ResponsiveContainer width="100%" height={compact ? 180 : 260}>
        <LineChart
          data={points}
          margin={{ top: 10, right: 20, left: 8, bottom: 10 }}
          onMouseMove={(state) => {
            if (typeof state.activeTooltipIndex === "number") {
              onHoverIndex(state.activeTooltipIndex);
            }
          }}
          onMouseLeave={() => onHoverIndex(null)}
          onClick={(state) => {
            if (typeof state.activeTooltipIndex === "number") {
              onHoverIndex(state.activeTooltipIndex);
            }
          }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.22)" />
          <XAxis
            dataKey="distKm"
            tickFormatter={(value: number) => `${Math.round(value)} km`}
            stroke="#c7d2fe"
            tick={{ fill: "#c7d2fe", fontSize: 11 }}
          />
          <YAxis dataKey="ele" unit=" m" stroke="#c7d2fe" width={48} tick={{ fill: "#c7d2fe", fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => [`${Number(value).toFixed(0)} m`, "Altitude"]}
            labelFormatter={(label: number) => `Distance ${Number(label).toFixed(1)} km`}
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.92)",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              borderRadius: "10px",
              color: "#f8fafc"
            }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Line
            type="monotone"
            dataKey="ele"
            dot={false}
            stroke="#22d3ee"
            strokeWidth={compact ? 2 : 2.4}
            isAnimationActive={false}
          />
          {activeDistance !== null ? <ReferenceLine x={activeDistance} stroke="#f43f5e" /> : null}
          {focusedDistanceKm !== null ? (
            <ReferenceLine x={focusedDistanceKm} stroke="#a78bfa" strokeDasharray="5 5" />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
