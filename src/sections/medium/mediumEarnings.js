import { useState } from "react";
import {
    Box, Card, CardContent, Chip, Divider, Slider, Stack, Typography,
    useTheme, alpha, Tooltip, Grid,
} from "@mui/material";
import AttachMoney from "@mui/icons-material/AttachMoney";
import PeopleAlt from "@mui/icons-material/PeopleAlt";
import TrendingUp from "@mui/icons-material/TrendingUp";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import EmojiEvents from "@mui/icons-material/EmojiEvents";
import Lightbulb from "@mui/icons-material/Lightbulb";
import MenuBook from "@mui/icons-material/MenuBook";
import Timer from "@mui/icons-material/Timer";
import useArticleStats from "../../utils/useArticleStats";
import mediumStats from "../../data/mediumStats";

// Medium partner earnings: ~$0.01–$0.10 per member read depending on reading time
// Community-reported average: ~$4–6 per 1,000 member reads
// Based on: member reading time × Medium's per-minute rate × engagement weight
const RATES = {
    conservative: 2,   // $2 per 1,000 member reads
    average:      5,   // $5 per 1,000 member reads
    optimistic:   10,  // $10 per 1,000 member reads (long-form, high engagement)
};

const AVG_READ_MINUTES = 4; // typical technical article

const fmt = (n) => {
    if (n === 0) return "$0";
    if (n < 1) return `$${n.toFixed(2)}`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
};

const fmtNum = (n) => {
    if (!n) return "—";
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(Math.round(n));
};

// ── Earning Rate Card ────────────────────────────────────────────────────────
const RateCard = ({ label, rate, memberReads, color, active, onClick }) => {
    const theme = useTheme();
    const monthly = (memberReads / 1000) * rate;
    const annual  = monthly * 12;
    return (
        <Card
            onClick={onClick}
            sx={{
                borderRadius: 3, cursor: 'pointer', flex: 1,
                border: `2px solid ${active ? color : alpha(theme.palette.divider, 0.5)}`,
                backgroundColor: active ? alpha(color, 0.06) : 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: color, backgroundColor: alpha(color, 0.04) },
            }}
        >
            <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="caption" fontWeight={700} textTransform="uppercase" sx={{ color }}>
                        {label}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        ${rate}/1K reads
                    </Typography>
                </Stack>
                <Typography variant="h5" fontWeight={800} sx={{ color, lineHeight: 1 }}>
                    {fmt(monthly)}
                    <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>/mo</Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">{fmt(annual)}/year</Typography>
            </CardContent>
        </Card>
    );
};

// ── Growth Projection Bar ────────────────────────────────────────────────────
const ProjectionBar = ({ label, value, max, color, sub }) => {
    const theme = useTheme();
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={500}>{label}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={700} sx={{ color }}>{fmt(value)}</Typography>
                    {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
                </Stack>
            </Stack>
            <Box sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(color, 0.12) }}>
                <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 4, backgroundColor: color, transition: 'width 0.4s ease' }} />
            </Box>
        </Stack>
    );
};

// ── Main Component ───────────────────────────────────────────────────────────
const MediumEarnings = () => {
    const theme = useTheme();
    const { aggregates } = useArticleStats();
    const [activeRate, setActiveRate] = useState("average");
    const [memberReadPct, setMemberReadPct] = useState(30); // adjustable assumption

    const rate = RATES[activeRate];

    // From entered article stats (actual data)
    const trackedMemberReads    = aggregates.totalMemberReads;
    const trackedNonMemberReads = aggregates.totalNonMemberReads;
    const trackedTotalReads     = trackedMemberReads + trackedNonMemberReads;
    const actualMemberPct = trackedTotalReads > 0
        ? Math.round((trackedMemberReads / trackedTotalReads) * 100)
        : null;

    // Use actual % if available, otherwise use the slider assumption
    const effectiveMemberPct = actualMemberPct !== null ? actualMemberPct : memberReadPct;

    // Monthly projection (based on 1K reads/month from profile stats)
    const monthlyReads        = mediumStats.overview.monthlyReads;
    const monthlyMemberReads  = Math.round(monthlyReads * (effectiveMemberPct / 100));
    const monthlyEarnings     = (monthlyMemberReads / 1000) * rate;
    const annualEarnings      = monthlyEarnings * 12;

    // Projections at different member read growth targets
    const projections = [
        { label: "Current (est.)",    pct: effectiveMemberPct, reads: monthlyMemberReads },
        { label: "At 40% member",     pct: 40,  reads: Math.round(monthlyReads * 0.40) },
        { label: "At 60% member",     pct: 60,  reads: Math.round(monthlyReads * 0.60) },
        { label: "At 2× monthly reads (2K)", pct: effectiveMemberPct, reads: Math.round(2000 * (effectiveMemberPct / 100)) },
        { label: "At 5× monthly reads (5K)", pct: effectiveMemberPct, reads: Math.round(5000 * (effectiveMemberPct / 100)) },
    ].map(p => ({ ...p, monthly: (p.reads / 1000) * rate, annual: (p.reads / 1000) * rate * 12 }));

    const maxProjection = Math.max(...projections.map(p => p.monthly), 1);

    const hasActualData = aggregates.filledCount > 0;

    return (
        <Box
            sx={{
                backgroundColor: alpha(theme.palette.success.main || '#2e7d32', 0.03),
                py: 6,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
            }}
        >
            <Box className="layoutMarginX">
                {/* Header */}
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={4}>
                    <Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <AttachMoney sx={{ color: '#2e7d32' }} />
                            <Typography variant="h5" fontWeight={700}>
                                Earnings <span style={{ color: '#2e7d32' }}>Estimator</span>
                            </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            Medium Partner Program pays per <b>member reading time</b> only — non-member reads earn $0
                        </Typography>
                    </Stack>
                    <Chip
                        label="Partner Program"
                        icon={<EmojiEvents fontSize="small" />}
                        color="success"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 600 }}
                    />
                </Stack>

                {/* How it works banner */}
                <Card sx={{ borderRadius: 3, mb: 4, border: `1px solid ${alpha('#FF9900', 0.3)}`, backgroundColor: alpha('#FF9900', 0.04) }}>
                    <CardContent>
                        <Stack direction="row" spacing={1} alignItems="flex-start" mb={2}>
                            <InfoOutlined sx={{ color: '#FF9900', fontSize: 18, mt: 0.2, flexShrink: 0 }} />
                            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                                How Medium Partner earnings work
                            </Typography>
                        </Stack>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                            gap: 2,
                        }}>
                            {[
                                {
                                    icon: <PeopleAlt sx={{ color: theme.palette.primary.main, fontSize: 22 }} />,
                                    title: "Member reads only",
                                    desc: "Only reads by paying Medium subscribers ($5/month) contribute to earnings. Non-member reads = $0.",
                                },
                                {
                                    icon: <Timer sx={{ color: '#FF9900', fontSize: 22 }} />,
                                    title: "Reading time matters",
                                    desc: "Payment scales with how long a member spends reading. Longer, deeper articles earn more per read.",
                                },
                                {
                                    icon: <AttachMoney sx={{ color: '#2e7d32', fontSize: 22 }} />,
                                    title: "~$2–10 per 1K reads",
                                    desc: "Community-reported rates. Technical articles (longer read time) tend to earn toward the higher end.",
                                },
                            ].map((item, i) => (
                                <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                                    <Box sx={{ flexShrink: 0, mt: 0.3 }}>{item.icon}</Box>
                                    <Box>
                                        <Typography variant="body2" fontWeight={700}>{item.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                                    </Box>
                                </Stack>
                            ))}
                        </Box>
                    </CardContent>
                </Card>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>

                    {/* Left: Inputs + result */}
                    <Stack spacing={3}>
                        {/* Member read % */}
                        <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <PeopleAlt sx={{ color: theme.palette.primary.main, fontSize: 18 }} />
                                        <Typography variant="subtitle2" fontWeight={700}>Member Read %</Typography>
                                    </Stack>
                                    {actualMemberPct !== null ? (
                                        <Chip
                                            label={`${actualMemberPct}% — from your data`}
                                            size="small"
                                            color="primary"
                                            variant="filled"
                                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                                        />
                                    ) : (
                                        <Chip
                                            label="Assumption (adjust)"
                                            size="small"
                                            color="default"
                                            variant="outlined"
                                            sx={{ fontSize: '0.7rem' }}
                                        />
                                    )}
                                </Stack>

                                {actualMemberPct !== null ? (
                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">
                                                Member reads from {aggregates.filledCount} tracked articles
                                            </Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={3}>
                                            <Box>
                                                <Typography variant="h5" fontWeight={800} color="primary">{fmtNum(trackedMemberReads)}</Typography>
                                                <Typography variant="caption" color="text.secondary">Member reads</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="h5" fontWeight={800} color="text.secondary">{fmtNum(trackedNonMemberReads)}</Typography>
                                                <Typography variant="caption" color="text.secondary">Non-member reads</Typography>
                                            </Box>
                                        </Stack>
                                        <Box sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(theme.palette.divider, 0.3), overflow: 'hidden', display: 'flex' }}>
                                            <Box sx={{ height: '100%', width: `${actualMemberPct}%`, backgroundColor: theme.palette.primary.main }} />
                                        </Box>
                                        <Typography variant="caption" color="text.disabled">
                                            Enter more article stats in the article list for a more accurate figure
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary">
                                                of your 1K monthly reads are by Medium members
                                            </Typography>
                                            <Typography variant="h6" fontWeight={800} color="primary">
                                                {memberReadPct}%
                                            </Typography>
                                        </Stack>
                                        <Slider
                                            value={memberReadPct}
                                            onChange={(_, v) => setMemberReadPct(v)}
                                            min={5} max={80} step={5}
                                            marks={[
                                                { value: 20, label: '20%' },
                                                { value: 40, label: '40%' },
                                                { value: 60, label: '60%' },
                                            ]}
                                            sx={{ color: theme.palette.primary.main }}
                                        />
                                        <Typography variant="caption" color="text.disabled">
                                            Typical range: 20–40% for non-Partner writers. Add article stats for actual figure.
                                        </Typography>
                                    </Stack>
                                )}
                            </CardContent>
                        </Card>

                        {/* Rate selector */}
                        <Box>
                            <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">
                                Select earning rate scenario
                            </Typography>
                            <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5}>
                                {Object.entries(RATES).map(([key, val]) => (
                                    <RateCard
                                        key={key}
                                        label={key}
                                        rate={val}
                                        memberReads={monthlyMemberReads}
                                        color={key === 'conservative' ? theme.palette.warning.main : key === 'average' ? theme.palette.primary.main : '#2e7d32'}
                                        active={activeRate === key}
                                        onClick={() => setActiveRate(key)}
                                    />
                                ))}
                            </Stack>
                        </Box>

                        {/* Current estimate result */}
                        <Card sx={{
                            borderRadius: 3,
                            background: `linear-gradient(135deg, ${alpha('#2e7d32', 0.08)}, ${alpha('#2e7d32', 0.03)})`,
                            border: `1px solid ${alpha('#2e7d32', 0.25)}`,
                        }}>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={700} mb={1} display="block">
                                    Current monthly estimate
                                </Typography>
                                <Stack direction="row" alignItems="flex-end" spacing={1} mb={0.5}>
                                    <Typography variant="h3" fontWeight={900} sx={{ color: '#2e7d32', lineHeight: 1 }}>
                                        {fmt(monthlyEarnings)}
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" mb={0.5}>/month</Typography>
                                </Stack>
                                <Typography variant="body2" color="text.secondary" mb={2}>
                                    {fmt(annualEarnings)}/year · based on {fmtNum(monthlyMemberReads)} member reads/month ({effectiveMemberPct}% of 1K)
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Stack direction="row" spacing={0.5} alignItems="flex-start">
                                    <InfoOutlined sx={{ fontSize: 13, color: 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                                    <Typography variant="caption" color="text.disabled">
                                        You must join the <b>Medium Partner Program</b> to monetise. Earnings require an active membership application at medium.com/creator-program.
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>

                    {/* Right: Growth projections + tips */}
                    <Stack spacing={3}>
                        <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                                    <TrendingUp sx={{ color: '#2e7d32', fontSize: 18 }} />
                                    <Typography variant="subtitle2" fontWeight={700}>Growth Projections</Typography>
                                    <Tooltip title="Monthly earnings if you hit these targets, using the selected rate scenario" placement="top" arrow>
                                        <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
                                    </Tooltip>
                                </Stack>
                                <Stack spacing={2}>
                                    {projections.map((p, i) => (
                                        <ProjectionBar
                                            key={i}
                                            label={p.label}
                                            value={p.monthly}
                                            max={maxProjection * 1.15}
                                            color={i === 0 ? theme.palette.primary.main : '#2e7d32'}
                                            sub={`${fmtNum(p.reads)} member reads`}
                                        />
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>

                        {/* What increases earnings */}
                        <Card sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                    <Lightbulb sx={{ color: '#FF9900', fontSize: 18 }} />
                                    <Typography variant="subtitle2" fontWeight={700}>How to increase earnings</Typography>
                                </Stack>
                                <Stack spacing={1.5}>
                                    {[
                                        {
                                            title: "Join Partner Program",
                                            desc: "Required first step — non-members earn $0 regardless of reads.",
                                            impact: "Unlocks earnings",
                                            color: theme.palette.error.main,
                                        },
                                        {
                                            title: "Grow member readers",
                                            desc: "Promote on LinkedIn/Twitter targeting tech professionals (more likely to be members).",
                                            impact: "+% member ratio",
                                            color: theme.palette.primary.main,
                                        },
                                        {
                                            title: "Write longer articles",
                                            desc: "Medium pays by reading time. A 10-min AWS deep-dive earns ~3× more than a 3-min quick tip.",
                                            impact: "+reading time",
                                            color: "#00897B",
                                        },
                                        {
                                            title: "Grow total reads",
                                            desc: "Every 1K extra monthly reads (at 30% member ratio) adds ~$1.50–$3/month at current rates.",
                                            impact: "+volume",
                                            color: "#FF9900",
                                        },
                                    ].map((tip, i) => (
                                        <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                                            <Box sx={{
                                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, mt: 0.2,
                                                backgroundColor: alpha(tip.color, 0.12),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Typography variant="caption" fontWeight={800} sx={{ color: tip.color }}>{i + 1}</Typography>
                                            </Box>
                                            <Stack>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography variant="body2" fontWeight={700}>{tip.title}</Typography>
                                                    <Chip label={tip.impact} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, backgroundColor: alpha(tip.color, 0.1), color: tip.color }} />
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary">{tip.desc}</Typography>
                                            </Stack>
                                        </Stack>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
};

export default MediumEarnings;
