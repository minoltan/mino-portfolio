import { Box, Card, CardContent, Stack, Typography, useTheme, alpha, Button, Divider, Tooltip } from "@mui/material";
import OpenInNew from "@mui/icons-material/OpenInNew";
import TrendingUp from "@mui/icons-material/TrendingUp";
import Edit from "@mui/icons-material/Edit";
import Visibility from "@mui/icons-material/Visibility";
import MenuBook from "@mui/icons-material/MenuBook";
import PeopleAlt from "@mui/icons-material/PeopleAlt";
import PersonOutline from "@mui/icons-material/PersonOutline";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import mediumStats from "../../data/mediumStats";

const fmt = (n) => {
    const num = Number(n);
    if (!num) return "—";
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
};

const StatCard = ({ label, value, sub, color, icon }) => {
    const theme = useTheme();
    return (
        <Card sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(color, 0.2)}`,
            backgroundColor: alpha(color, 0.04),
            height: '100%',
        }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="h4" fontWeight={800} sx={{ color }}>{value}</Typography>
                        <Typography variant="body2" fontWeight={600} color="text.primary" mt={0.5}>{label}</Typography>
                        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
                    </Box>
                    <Box sx={{ color: alpha(color, 0.6) }}>{icon}</Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

const PostsCard = ({ onViewPublished }) => {
    const theme = useTheme();
    const { overview } = mediumStats;
    return (
        <Card sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            height: '100%',
        }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Typography variant="body2" fontWeight={600} color="text.primary">Articles</Typography>
                    <Edit sx={{ color: alpha(theme.palette.primary.main, 0.6), fontSize: 28 }} />
                </Stack>
                <Stack direction="row" spacing={2} alignItems="flex-end">
                    <Box>
                        <Typography variant="h4" fontWeight={800} sx={{ color: theme.palette.primary.main, lineHeight: 1 }}>
                            {overview.publishedPosts}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Published</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem sx={{ mb: 0.5 }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700} sx={{ color: 'text.secondary', lineHeight: 1 }}>
                            {overview.draftPosts}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">Drafts</Typography>
                    </Box>
                </Stack>
                <Button
                    size="small" variant="outlined" onClick={onViewPublished}
                    sx={{
                        mt: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600,
                        fontSize: '0.72rem', py: 0.4, px: 1.5,
                        borderColor: alpha(theme.palette.primary.main, 0.4),
                        color: theme.palette.primary.main,
                        '&:hover': { borderColor: theme.palette.primary.main },
                    }}
                >
                    View all articles
                </Button>
            </CardContent>
        </Card>
    );
};

// Member/non-member split card — shows live data from entered article stats
const MemberSplitCard = ({ aggregates }) => {
    const theme = useTheme();
    const hasViewSplit = aggregates.totalMemberViews + aggregates.totalNonMemberViews > 0;
    const hasReadSplit = aggregates.totalMemberReads + aggregates.totalNonMemberReads > 0;
    const hasSplit = hasViewSplit || hasReadSplit;

    const memberViewPct = hasViewSplit
        ? Math.round((aggregates.totalMemberViews / (aggregates.totalMemberViews + aggregates.totalNonMemberViews)) * 100)
        : null;
    const memberReadPct = hasReadSplit
        ? Math.round((aggregates.totalMemberReads / (aggregates.totalMemberReads + aggregates.totalNonMemberReads)) * 100)
        : null;

    return (
        <Card sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.secondary.main || theme.palette.primary.main, 0.2)}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.03),
            height: '100%',
            gridColumn: { xs: 'span 2', md: 'span 2' },
        }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Stack>
                        <Typography variant="body2" fontWeight={600} color="text.primary">Member vs Non-Member</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {hasSplit
                                ? `Based on ${aggregates.filledCount} tracked article${aggregates.filledCount !== 1 ? 's' : ''}`
                                : 'Enter article stats to see split'}
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                        <PeopleAlt sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                        <PersonOutline sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </Stack>
                </Stack>

                {!hasSplit ? (
                    <Stack spacing={1}>
                        {[
                            { label: "Member Views", sub: "vs Non-Member Views" },
                            { label: "Member Reads", sub: "vs Non-Member Reads" },
                        ].map(({ label, sub }, i) => (
                            <Stack key={i} spacing={0.4}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="caption" color="text.disabled">{label} / {sub}</Typography>
                                    <Typography variant="caption" color="text.disabled">—</Typography>
                                </Stack>
                                <Box sx={{ height: 6, borderRadius: 3, backgroundColor: alpha(theme.palette.divider, 0.3) }} />
                            </Stack>
                        ))}
                        <Tooltip title="Open 'View all articles', click ✎ on any article, and fill in the member/non-member stats from medium.com/me/stats" placement="bottom" arrow>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ cursor: 'help', width: 'fit-content' }}>
                                <InfoOutlined sx={{ fontSize: 13, color: 'text.disabled' }} />
                                <Typography variant="caption" color="text.disabled">Add article stats to populate</Typography>
                            </Stack>
                        </Tooltip>
                    </Stack>
                ) : (
                    <Stack spacing={1.5}>
                        {hasViewSplit && (
                            <Stack spacing={0.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <Visibility sx={{ fontSize: 13, color: '#FF9900' }} />
                                        <Typography variant="caption" fontWeight={600}>Views</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1.5}>
                                        <Stack direction="row" alignItems="center" spacing={0.3}>
                                            <PeopleAlt sx={{ fontSize: 11, color: theme.palette.primary.main }} />
                                            <Typography variant="caption" fontWeight={700} color="primary">{memberViewPct}%</Typography>
                                            <Typography variant="caption" color="text.disabled">({fmt(aggregates.totalMemberViews)})</Typography>
                                        </Stack>
                                        <Stack direction="row" alignItems="center" spacing={0.3}>
                                            <PersonOutline sx={{ fontSize: 11, color: 'text.secondary' }} />
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">{100 - memberViewPct}%</Typography>
                                            <Typography variant="caption" color="text.disabled">({fmt(aggregates.totalNonMemberViews)})</Typography>
                                        </Stack>
                                    </Stack>
                                </Stack>
                                <Box sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(theme.palette.divider, 0.35), overflow: 'hidden', display: 'flex' }}>
                                    <Box sx={{ height: '100%', width: `${memberViewPct}%`, backgroundColor: theme.palette.primary.main }} />
                                    <Box sx={{ height: '100%', flex: 1, backgroundColor: alpha(theme.palette.divider, 0.5) }} />
                                </Box>
                            </Stack>
                        )}

                        {hasReadSplit && (
                            <Stack spacing={0.5}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <MenuBook sx={{ fontSize: 13, color: '#00897B' }} />
                                        <Typography variant="caption" fontWeight={600}>Reads</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1.5}>
                                        <Stack direction="row" alignItems="center" spacing={0.3}>
                                            <PeopleAlt sx={{ fontSize: 11, color: theme.palette.primary.main }} />
                                            <Typography variant="caption" fontWeight={700} color="primary">{memberReadPct}%</Typography>
                                            <Typography variant="caption" color="text.disabled">({fmt(aggregates.totalMemberReads)})</Typography>
                                        </Stack>
                                        <Stack direction="row" alignItems="center" spacing={0.3}>
                                            <PersonOutline sx={{ fontSize: 11, color: 'text.secondary' }} />
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">{100 - memberReadPct}%</Typography>
                                            <Typography variant="caption" color="text.disabled">({fmt(aggregates.totalNonMemberReads)})</Typography>
                                        </Stack>
                                    </Stack>
                                </Stack>
                                <Box sx={{ height: 8, borderRadius: 4, backgroundColor: alpha(theme.palette.divider, 0.35), overflow: 'hidden', display: 'flex' }}>
                                    <Box sx={{ height: '100%', width: `${memberReadPct}%`, backgroundColor: '#00897B' }} />
                                    <Box sx={{ height: '100%', flex: 1, backgroundColor: alpha(theme.palette.divider, 0.5) }} />
                                </Box>
                            </Stack>
                        )}

                        {/* Totals row */}
                        <Divider />
                        <Stack direction="row" spacing={3} flexWrap="wrap">
                            {aggregates.totalViews > 0 && (
                                <Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#FF9900', lineHeight: 1 }}>{fmt(aggregates.totalViews)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Total Views</Typography>
                                </Box>
                            )}
                            {aggregates.totalReads > 0 && (
                                <Box>
                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#00897B', lineHeight: 1 }}>{fmt(aggregates.totalReads)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Total Reads</Typography>
                                </Box>
                            )}
                            {aggregates.totalClaps > 0 && (
                                <Box>
                                    <Typography variant="h6" fontWeight={800} color="error" sx={{ lineHeight: 1 }}>{fmt(aggregates.totalClaps)}</Typography>
                                    <Typography variant="caption" color="text.secondary">Total Claps</Typography>
                                </Box>
                            )}
                        </Stack>
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
};

const MediumStatsOverview = ({ onViewArticles, aggregates }) => {
    const theme = useTheme();
    const { overview, profile, growthMetrics } = mediumStats;

    const safeAggregates = aggregates ?? {
        totalViews: 0, totalReads: 0, totalClaps: 0,
        totalMemberViews: 0, totalNonMemberViews: 0,
        totalMemberReads: 0, totalNonMemberReads: 0,
        filledCount: 0,
    };

    const topStats = [
        { label: "Monthly Views", value: "10K+", sub: "organic discovery per month", color: "#FF9900", icon: <Visibility fontSize="large" /> },
        { label: "Monthly Reads", value: "1K+", sub: "full reads per month", color: "#00897B", icon: <MenuBook fontSize="large" /> },
        { label: "Read-Through Rate", value: `${growthMetrics.viewsReadRatio}%`, sub: "views that become full reads", color: theme.palette.error.main, icon: <TrendingUp fontSize="large" /> },
    ];

    return (
        <Box sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.03), py: 6 }}>
            <Box className="layoutMarginX">
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={4}>
                    <Typography variant="h5" fontWeight={700}>
                        Detailed <span style={{ color: theme.palette.primary.main }}>Stats</span>
                    </Typography>
                    <Button variant="outlined" size="small" endIcon={<OpenInNew fontSize="small" />}
                        href={profile.url} target="_blank" rel="noopener noreferrer"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                        View on Medium
                    </Button>
                </Stack>

                {/* Top row: Articles card + 3 stat cards */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                    gap: 2, mb: 3,
                }}>
                    <PostsCard onViewPublished={onViewArticles} />
                    {topStats.map((s, i) => <StatCard key={i} {...s} />)}
                </Box>

                {/* Member/non-member split + totals — spans full width */}
                <MemberSplitCard aggregates={safeAggregates} />

                {/* Insight banner */}
                <Card sx={{
                    mt: 3, borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.dark || theme.palette.primary.main, 0.04)})`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                }}>
                    <CardContent>
                        <Stack direction={{ xs: 'column', md: 'row' }}
                            divider={<Divider orientation="vertical" flexItem />}
                            spacing={3} justifyContent="space-around" alignItems="center" sx={{ textAlign: 'center' }}>
                            {[
                                { label: "Active Writing Period", value: `${overview.activeMonths} months`, sub: "consistent content creation" },
                                { label: "Avg Posts / Month", value: `~${growthMetrics.avgPostsPerMonth}`, sub: "during active period" },
                                { label: "Monthly Views", value: "10K+", sub: "organic discovery" },
                                { label: "Monthly Reads", value: "1K+", sub: "engaged audience" },
                            ].map((item, i) => (
                                <Box key={i}>
                                    <Typography variant="h5" fontWeight={800} color="primary">{item.value}</Typography>
                                    <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                                    <Typography variant="caption" color="text.secondary">{item.sub}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default MediumStatsOverview;
