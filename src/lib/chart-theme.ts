export const chartTooltipStyle: React.CSSProperties = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  backgroundColor: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
};

export const chartGridProps = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--border))",
} as const;

export const chartAxisTickStyle = {
  fontSize: 12,
  fill: "hsl(var(--muted-foreground))",
};
