import { Box, Chip, Grid, Stack, Typography, useTheme, alpha, Tooltip } from "@mui/material";
import Article from "@mui/icons-material/Article";
import PeopleAlt from "@mui/icons-material/PeopleAlt";
import Visibility from "@mui/icons-material/Visibility";
import MenuBook from "@mui/icons-material/MenuBook";
import mediumStats from "../../data/mediumStats";

const MetricCard = ({ icon, value, label, color, onClick }) => {
    const theme = useTheme();
    const clickable = !!onClick;
    return (
        <Box
            onClick={onClick}
            sx={{
                textAlign: 'center',
                p: { xs: 2, md: 3 },
                borderRadius: 3,
                backgroundColor: alpha(color, 0.08),
                border: `1px solid ${alpha(color, 0.2)}`,
                flex: 1,
                minWidth: { xs: '140px', md: '160px' },
                cursor: clickable ? 'pointer' : 'default',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                '&:hover': clickable ? {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 6px 20px ${alpha(color, 0.25)}`,
                    borderColor: alpha(color, 0.5),
                } : {},
            }}
        >
            <Box sx={{ color, mb: 1 }}>{icon}</Box>
            <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1 }}>
                {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {label}
            </Typography>
            {clickable && (
                <Typography variant="caption" sx={{ color: alpha(color, 0.7), display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
                    click to view →
                </Typography>
            )}
        </Box>
    );
};

const MediumHero = ({ onViewArticles }) => {
    const theme = useTheme();
    const { overview } = mediumStats;

    const metrics = [
        { icon: <PeopleAlt fontSize="large" />, value: `${overview.followers}+`, label: "Followers", color: theme.palette.primary.main },
        { icon: <MenuBook fontSize="large" />, value: `${overview.subscribers}+`, label: "Subscribers", color: "#00897B" },
        { icon: <Visibility fontSize="large" />, value: "10K+", label: "Monthly Views", color: "#FF9900" },
        { icon: <Article fontSize="large" />, value: `${overview.publishedPosts}`, label: "Published Posts", color: "#7B1FA2", onClick: onViewArticles },
    ];

    return (
        <Box sx={{ backgroundColor: theme.palette.secondary.main, pt: { xs: 12, md: 16 }, pb: { xs: 6, md: 10 } }}>
            <Grid
                container
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="center"
                alignItems="center"
                className="layoutMarginX"
                spacing={4}
            >
                {/* Left: Text */}
                <Grid item xs={12} md={6}>
                    <Stack spacing={2} alignItems={{ xs: 'center', md: 'flex-start' }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" justifyContent={{ xs: 'center', md: 'flex-start' }}>
                            <Box
                                component="img"
                                src="https://upload.wikimedia.org/wikipedia/commons/e/ec/Medium_logo_Monogram.svg"
                                alt="Medium"
                                sx={{ width: 36, height: 36, filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none' }}
                            />
                            <Typography variant="h2" fontWeight={700} textAlign={{ xs: 'center', md: 'left' }}>
                                My <span style={{ color: theme.palette.primary.main }}>Medium</span> Journey
                            </Typography>
                        </Stack>

                        <Typography variant="body1" color="text.secondary" textAlign={{ xs: 'center', md: 'left' }} sx={{ maxWidth: 520 }}>
                            {mediumStats.profile.bio}
                        </Typography>

                        <Stack direction="row" flexWrap="wrap" gap={1} justifyContent={{ xs: 'center', md: 'flex-start' }}>
                            <Chip label="AWS SAA-C03" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
                            <Chip label="Serverless" size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                            <Chip label="AI/ML" size="small" color="secondary" variant="outlined" sx={{ fontWeight: 600 }} />
                            <Chip label="AWS Community Builder" size="small" color="success" variant="filled" sx={{ fontWeight: 600 }} />
                        </Stack>

                        <Typography variant="caption" color="text.disabled">
                            Writing since {mediumStats.profile.memberSince} · {overview.activeMonths} months of active growth
                        </Typography>
                    </Stack>
                </Grid>

                {/* Right: Metric Cards */}
                <Grid item xs={12} md={6}>
                    <Stack
                        direction="row"
                        flexWrap="wrap"
                        gap={2}
                        justifyContent={{ xs: 'center', md: 'flex-end' }}
                    >
                        {metrics.map((m, i) => (
                            <MetricCard key={i} {...m} />
                        ))}
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default MediumHero;
