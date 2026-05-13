import { Box, Card, CardContent, Stack, Typography, useTheme, alpha } from "@mui/material";
import mediumStats from "../../data/mediumStats";

// ─── Bar Chart (Monthly Trend) ───────────────────────────────────────────────
const BAR_AREA_HEIGHT = 220; // px — space bars can grow into
const LABEL_HEIGHT    = 36;  // px — space for value label above + month label below

const BarChart = ({ data, valueKey, labelKey, color }) => {
    const theme = useTheme();
    const max = Math.max(...data.map(d => d[valueKey]));

    return (
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '6px',
                    height: BAR_AREA_HEIGHT + LABEL_HEIGHT,
                    minWidth: data.length * 46,
                    px: 1,
                }}
            >
                {data.map((item, i) => {
                    const barPx  = max > 0 ? Math.max((item[valueKey] / max) * BAR_AREA_HEIGHT, 6) : 6;
                    const isMax  = item[valueKey] === max;
                    return (
                        <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 36 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: isMax ? color : 'text.secondary', mb: 0.5, fontSize: '0.65rem' }}>
                                {item[valueKey]}
                            </Typography>
                            <Box
                                sx={{
                                    width: '100%',
                                    height: barPx,
                                    backgroundColor: isMax ? color : alpha(color, 0.55),
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.3s ease',
                                    cursor: 'default',
                                    '&:hover': { backgroundColor: color, transform: 'scaleY(1.03)', transformOrigin: 'bottom' },
                                }}
                            />
                            <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ mt: 0.5, fontSize: '0.6rem', textAlign: 'center', lineHeight: 1.2 }}
                            >
                                {item[labelKey]}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

// ─── Horizontal Bar (Category) ────────────────────────────────────────────────
const HorizontalBar = ({ label, count, total, color }) => {
    const theme = useTheme();
    const pct = Math.round((count / total) * 100);

    return (
        <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                    <Typography variant="body2" fontWeight={500}>{label}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" color="text.secondary">{count} posts</Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color, minWidth: 36, textAlign: 'right' }}>{pct}%</Typography>
                </Stack>
            </Stack>
            <Box sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(color, 0.15) }}>
                <Box
                    sx={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 4,
                        backgroundColor: color,
                        transition: 'width 0.6s ease',
                    }}
                />
            </Box>
        </Stack>
    );
};

// ─── Donut Chart (SVG) ────────────────────────────────────────────────────────
const DonutChart = ({ data, total }) => {
    const theme = useTheme();
    const size = 160;
    const r = 60;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const gap = 2;

    let offset = 0;
    const segments = data.map(item => {
        const pct = item.count / total;
        const dashLen = pct * circumference - gap;
        const seg = { ...item, dashLen, dashOffset: -offset };
        offset += pct * circumference;
        return seg;
    });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box sx={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size}>
                    {segments.map((seg, i) => (
                        <circle
                            key={i}
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={22}
                            strokeDasharray={`${seg.dashLen} ${circumference - seg.dashLen}`}
                            strokeDashoffset={seg.dashOffset}
                            transform={`rotate(-90 ${cx} ${cy})`}
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                    ))}
                </svg>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h5" fontWeight={800}>{total}</Typography>
                    <Typography variant="caption" color="text.secondary">posts</Typography>
                </Box>
            </Box>
        </Box>
    );
};

// ─── Year Activity (bubble-style) ─────────────────────────────────────────────
const YearBubbles = ({ data }) => {
    const theme = useTheme();
    const max = Math.max(...data.map(d => d.count));

    return (
        <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center" alignItems="flex-end">
            {data.map((item, i) => {
                const sizePct = item.count / max;
                const diameter = 40 + sizePct * 80;
                return (
                    <Stack key={i} alignItems="center" spacing={0.5}>
                        <Box
                            sx={{
                                width: diameter,
                                height: diameter,
                                borderRadius: '50%',
                                backgroundColor: alpha(theme.palette.primary.main, 0.1 + sizePct * 0.6),
                                border: `2px solid ${alpha(theme.palette.primary.main, 0.3 + sizePct * 0.5)}`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Typography variant="h6" fontWeight={800} sx={{ color: theme.palette.primary.main, fontSize: `${0.7 + sizePct * 0.5}rem` }}>
                                {item.count}
                            </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{item.year}</Typography>
                    </Stack>
                );
            })}
        </Stack>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const MediumCharts = () => {
    const theme = useTheme();
    const { postsByCategory, postsByYear, monthlyTrend, overview } = mediumStats;
    const total = overview.publishedPosts;

    return (
        <Box className="layoutMarginX" sx={{ py: 6 }}>
            <Typography variant="h5" fontWeight={700} mb={4}>
                Content <span style={{ color: theme.palette.primary.main }}>Analytics</span>
            </Typography>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '2fr 1fr' },
                    gap: 3,
                }}
            >
                {/* Monthly Publishing Trend */}
                <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Monthly Publishing Trend</Typography>
                        <Typography variant="caption" color="text.secondary" mb={2} display="block">
                            Posts published per month (active period)
                        </Typography>
                        <BarChart
                            data={monthlyTrend}
                            valueKey="posts"
                            labelKey="month"
                            color={theme.palette.primary.main}
                        />
                    </CardContent>
                </Card>

                {/* Posts by Year */}
                <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Posts by Year</Typography>
                        <Typography variant="caption" color="text.secondary" mb={3} display="block">
                            Publishing volume across all years
                        </Typography>
                        <YearBubbles data={postsByYear} />
                    </CardContent>
                </Card>

                {/* Category Distribution — Horizontal Bars */}
                <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Content by Topic</Typography>
                        <Typography variant="caption" color="text.secondary" mb={2.5} display="block">
                            Breakdown of {total} published posts by subject
                        </Typography>
                        <Stack spacing={2}>
                            {postsByCategory.map((item, i) => (
                                <HorizontalBar
                                    key={i}
                                    label={item.category}
                                    count={item.count}
                                    total={total}
                                    color={item.color}
                                />
                            ))}
                        </Stack>
                    </CardContent>
                </Card>

                {/* Donut + Engagement */}
                <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
                    <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Topic Distribution</Typography>
                        <Typography variant="caption" color="text.secondary" mb={2} display="block">
                            Visual share of content categories
                        </Typography>
                        <DonutChart data={postsByCategory} total={total} />

                        <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                            <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">
                                Engagement Snapshot
                            </Typography>
                            {[
                                { label: "Read-Through Rate", value: "~10%", color: theme.palette.error.main },
                                { label: "Avg Posts / Month", value: `~${mediumStats.growthMetrics.avgPostsPerMonth}`, color: theme.palette.primary.main },
                                { label: "Active Months", value: `${mediumStats.overview.activeMonths}`, color: "#00897B" },
                            ].map((item, i) => (
                                <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" py={0.5}>
                                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                                    <Typography variant="caption" fontWeight={700} sx={{ color: item.color }}>{item.value}</Typography>
                                </Stack>
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default MediumCharts;
