import { useState } from "react";
import { Box, Card, CardContent, Chip, Collapse, Divider, IconButton, Stack, Typography, useTheme, alpha } from "@mui/material";
import EmojiObjects from "@mui/icons-material/EmojiObjects";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import TrendingUp from "@mui/icons-material/TrendingUp";
import AutoFixHigh from "@mui/icons-material/AutoFixHigh";
import GroupAdd from "@mui/icons-material/GroupAdd";
import Search from "@mui/icons-material/Search";
import Schedule from "@mui/icons-material/Schedule";
import Article from "@mui/icons-material/Article";
import mediumStats from "../../data/mediumStats";

const categoryIcon = {
    "Content Strategy": <AutoFixHigh fontSize="small" />,
    "Reader Retention": <TrendingUp fontSize="small" />,
    "Monetization": <EmojiObjects fontSize="small" />,
    "Audience Growth": <GroupAdd fontSize="small" />,
    "SEO & Discovery": <Search fontSize="small" />,
    "Publishing Cadence": <Schedule fontSize="small" />,
    "Content Format": <Article fontSize="small" />,
};

const priorityColor = {
    High: "error",
    Medium: "warning",
    Low: "default",
};

const RecommendationCard = ({ rec }) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(false);
    const color = priorityColor[rec.priority];

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                '&:hover': {
                    boxShadow: theme.shadows[4],
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                },
            }}
            onClick={() => setExpanded(prev => !prev)}
        >
            <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} mb={1.5}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                            sx={{
                                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            {categoryIcon[rec.category] ?? <EmojiObjects fontSize="small" />}
                        </Box>
                        <Stack>
                            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3}>{rec.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{rec.category}</Typography>
                        </Stack>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
                        <Chip label={rec.priority} size="small" color={color} variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                        <IconButton size="small" sx={{ p: 0 }}>
                            {expanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                        </IconButton>
                    </Stack>
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ pl: { sm: 6.5 } }}>
                    {rec.detail.substring(0, 120)}…
                </Typography>

                <Collapse in={expanded} timeout={300}>
                    <Box sx={{ pl: { sm: 6.5 }, mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" mb={2}>
                            {rec.detail}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <Chip label="Impact" size="small" color="success" variant="outlined" sx={{ flexShrink: 0, fontSize: '0.65rem', height: 20 }} />
                                <Typography variant="caption" color="text.secondary">{rec.impact}</Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <Chip label="Action" size="small" color="primary" variant="outlined" sx={{ flexShrink: 0, fontSize: '0.65rem', height: 20 }} />
                                <Typography variant="caption" color="text.secondary">{rec.action}</Typography>
                            </Stack>
                        </Stack>
                    </Box>
                </Collapse>
            </CardContent>
        </Card>
    );
};

const MediumRecommendations = () => {
    const theme = useTheme();
    const { recommendations } = mediumStats;
    const [filter, setFilter] = useState("All");

    const priorities = ["All", "High", "Medium", "Low"];
    const filtered = filter === "All" ? recommendations : recommendations.filter(r => r.priority === filter);

    return (
        <Box
            className="layoutMarginX"
            sx={{
                py: 6,
                mb: 6,
                borderRadius: 4,
            }}
        >
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={4}>
                <Stack>
                    <Typography variant="h5" fontWeight={700}>
                        Growth <span style={{ color: theme.palette.primary.main }}>Recommendations</span>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Data-driven strategies to grow your Medium presence and income
                    </Typography>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {priorities.map(p => (
                        <Chip
                            key={p}
                            label={p}
                            size="small"
                            onClick={() => setFilter(p)}
                            color={filter === p ? "primary" : "default"}
                            variant={filter === p ? "filled" : "outlined"}
                            sx={{ fontWeight: 600, cursor: 'pointer' }}
                        />
                    ))}
                </Stack>
            </Stack>

            <Stack spacing={2}>
                {filtered.map(rec => (
                    <RecommendationCard key={rec.id} rec={rec} />
                ))}
            </Stack>
        </Box>
    );
};

export default MediumRecommendations;
