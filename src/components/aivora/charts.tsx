import { ClientOnly } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 10,
  fontFamily: "var(--font-mono)",
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-surface-2)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--color-foreground)",
  },
  labelStyle: { color: "var(--color-muted-foreground)", fontSize: "11px" },
};

function ChartFrame({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <ClientOnly
      fallback={
        <div className="flex items-center justify-center rounded-md bg-muted/40" style={{ height }}>
          <span className="data-label animate-pulse">Rendering chart…</span>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </ClientOnly>
  );
}

export interface SeriesPoint {
  label: string;
  [key: string]: string | number | null;
}

export function RealtimeAreaChart({
  data,
  series,
  height = 200,
  domain,
}: {
  data: SeriesPoint[];
  series: Array<{ key: string; name: string; color: string }>;
  height?: number;
  domain?: [number, number];
}) {
  return (
    <ChartFrame height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axis} tickLine={false} axisLine={false} />
        <YAxis {...axis} tickLine={false} axisLine={false} domain={domain ?? [0, "auto"]} />
        <Tooltip {...tooltipStyle} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            fill={`url(#grad-${s.key})`}
            strokeWidth={2}
            isAnimationActive={false}
            dot={false}
          />
        ))}
      </AreaChart>
    </ChartFrame>
  );
}

export function RealtimeLineChart({
  data,
  series,
  height = 200,
  legend,
}: {
  data: SeriesPoint[];
  series: Array<{ key: string; name: string; color: string; dashed?: boolean }>;
  height?: number;
  legend?: boolean;
}) {
  return (
    <ChartFrame height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axis} tickLine={false} axisLine={false} />
        <YAxis {...axis} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} />
        {legend && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "5 4" : undefined}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

export function HorizontalContributionChart({
  data,
  height = 210,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <XAxis type="number" {...axis} hide domain={[0, 100]} />
        <YAxis type="category" dataKey="label" {...axis} width={132} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

export function CategoryBarChart({
  data,
  color = "var(--color-primary)",
  height = 220,
}: {
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...axis} tickLine={false} axisLine={false} interval={0} />
        <YAxis {...axis} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartFrame>
  );
}
