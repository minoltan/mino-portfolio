import { useState, useMemo, useCallback } from "react";
import {
    Box, Chip, Collapse, Drawer, FormControl, IconButton, InputAdornment, Stack, Tab, Tabs,
    TextField, Typography, useTheme, alpha, Divider, MenuItem, Select,
    Tooltip, Button, Grid,
} from "@mui/material";
import Close from "@mui/icons-material/Close";
import Search from "@mui/icons-material/Search";
import Article from "@mui/icons-material/Article";
import Drafts from "@mui/icons-material/Drafts";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import Edit from "@mui/icons-material/Edit";
import Check from "@mui/icons-material/Check";
import Visibility from "@mui/icons-material/Visibility";
import MenuBook from "@mui/icons-material/MenuBook";
import ThumbUp from "@mui/icons-material/ThumbUp";
import PeopleAlt from "@mui/icons-material/PeopleAlt";
import PersonOutline from "@mui/icons-material/PersonOutline";
import Delete from "@mui/icons-material/Delete";
import mediumArticles from "../../data/mediumArticles";
import useArticleStats from "../../utils/useArticleStats";

const CATEGORY_COLORS = {
    AWS: "#FF9900", Azure: "#0078D4", "AI/ML": "#7B1FA2",
    Java: "#E53935", "Docker/K8s": "#1565C0", Programming: "#00897B", Other: "#78909C",
};
const ROWS_PER_PAGE = 30;

const fmt = (n) => {
    const num = Number(n);
    if (!num) return "—";
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
};

// ── Stat Entry Form ─────────────────────────────────────────────────────────
const FIELDS = [
    { key: "views",          label: "Views",              icon: <Visibility sx={{ fontSize: 14 }} />,      group: "total" },
    { key: "reads",          label: "Reads",              icon: <MenuBook sx={{ fontSize: 14 }} />,         group: "total" },
    { key: "claps",          label: "Claps",              icon: <ThumbUp sx={{ fontSize: 14 }} />,          group: "total" },
    { key: "memberViews",    label: "Member Views",       icon: <PeopleAlt sx={{ fontSize: 14 }} />,        group: "member" },
    { key: "nonMemberViews", label: "Non-Member Views",   icon: <PersonOutline sx={{ fontSize: 14 }} />,    group: "member" },
    { key: "memberReads",    label: "Member Reads",       icon: <PeopleAlt sx={{ fontSize: 14 }} />,        group: "member" },
    { key: "nonMemberReads", label: "Non-Member Reads",   icon: <PersonOutline sx={{ fontSize: 14 }} />,    group: "member" },
];

const StatEntryForm = ({ article, existing, onSave, onClear, onCancel }) => {
    const theme = useTheme();
    const [vals, setVals] = useState({
        views: existing?.views ?? "",
        reads: existing?.reads ?? "",
        claps: existing?.claps ?? "",
        memberViews: existing?.memberViews ?? "",
        nonMemberViews: existing?.nonMemberViews ?? "",
        memberReads: existing?.memberReads ?? "",
        nonMemberReads: existing?.nonMemberReads ?? "",
    });

    const handleChange = (key) => (e) => {
        const v = e.target.value.replace(/[^0-9]/g, "");
        setVals(prev => ({ ...prev, [key]: v }));
    };

    const handleSave = () => {
        const cleaned = {};
        FIELDS.forEach(({ key }) => { if (vals[key] !== "") cleaned[key] = Number(vals[key]); });
        onSave(cleaned);
    };

    const hasValues = FIELDS.some(({ key }) => vals[key] !== "");

    return (
        <Box
            sx={{
                px: 2, pt: 1.5, pb: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.03),
                borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            }}
        >
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1.5 }}>
                Enter stats from{" "}
                <Box component="span" sx={{ color: theme.palette.primary.main }}>medium.com/me/stats</Box>
                {" "}→ click article → copy numbers below
            </Typography>

            {/* Total stats row */}
            <Typography variant="caption" fontWeight={700} color="text.disabled" textTransform="uppercase" sx={{ mb: 0.75, display: 'block' }}>
                Overall
            </Typography>
            <Grid container spacing={1} mb={1.5}>
                {FIELDS.filter(f => f.group === "total").map(({ key, label, icon }) => (
                    <Grid item xs={4} key={key}>
                        <TextField
                            size="small"
                            label={label}
                            value={vals[key]}
                            onChange={handleChange(key)}
                            inputProps={{ inputMode: "numeric" }}
                            InputProps={{ startAdornment: <InputAdornment position="start">{icon}</InputAdornment> }}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.78rem' } }}
                            fullWidth
                        />
                    </Grid>
                ))}
            </Grid>

            {/* Member/non-member */}
            <Typography variant="caption" fontWeight={700} color="text.disabled" textTransform="uppercase" sx={{ mb: 0.75, display: 'block' }}>
                Member vs Non-Member
            </Typography>
            <Grid container spacing={1} mb={1.5}>
                {FIELDS.filter(f => f.group === "member").map(({ key, label, icon }) => (
                    <Grid item xs={6} key={key}>
                        <TextField
                            size="small"
                            label={label}
                            value={vals[key]}
                            onChange={handleChange(key)}
                            inputProps={{ inputMode: "numeric" }}
                            InputProps={{ startAdornment: <InputAdornment position="start">{icon}</InputAdornment> }}
                            sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.78rem' } }}
                            fullWidth
                        />
                    </Grid>
                ))}
            </Grid>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
                {existing && (
                    <Button size="small" color="error" startIcon={<Delete fontSize="small" />}
                        onClick={onClear} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                        Clear
                    </Button>
                )}
                <Button size="small" onClick={onCancel} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                    Cancel
                </Button>
                <Button
                    size="small" variant="contained" disabled={!hasValues}
                    startIcon={<Check fontSize="small" />}
                    onClick={handleSave}
                    sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 2 }}
                >
                    Save
                </Button>
            </Stack>
        </Box>
    );
};

// ── Stat Pills ───────────────────────────────────────────────────────────────
const StatPill = ({ icon, value, color }) => {
    const theme = useTheme();
    if (!value) return null;
    return (
        <Stack direction="row" alignItems="center" spacing={0.3}
            sx={{ color: color ?? 'text.secondary', fontSize: '0.7rem' }}>
            {icon}
            <Typography variant="caption" fontWeight={600} sx={{ color: 'inherit' }}>{fmt(value)}</Typography>
        </Stack>
    );
};

// ── Article Row ──────────────────────────────────────────────────────────────
const ArticleRow = ({ article, articleStat, onEdit, isEditing, index }) => {
    const theme = useTheme();
    const color = CATEGORY_COLORS[article.category] ?? "#78909C";
    const hasStats = !!articleStat;

    return (
        <Box sx={{ borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 1,
                    alignItems: 'center',
                    px: 2,
                    py: 1.25,
                    backgroundColor: isEditing
                        ? alpha(theme.palette.primary.main, 0.05)
                        : index % 2 === 0 ? 'transparent' : alpha(theme.palette.action.hover, 0.03),
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
                }}
                onClick={onEdit}
            >
                <Stack spacing={0.4}>
                    <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.4 }}>
                        {article.title}
                    </Typography>

                    <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
                        <Typography variant="caption" color="text.disabled">{article.date}</Typography>
                        <Chip label={article.category} size="small" sx={{
                            backgroundColor: alpha(color, 0.12), color, fontWeight: 600,
                            fontSize: '0.62rem', height: 18,
                        }} />
                        {hasStats && (
                            <>
                                <StatPill icon={<Visibility sx={{ fontSize: 11 }} />} value={articleStat.views} color="#FF9900" />
                                <StatPill icon={<MenuBook sx={{ fontSize: 11 }} />} value={articleStat.reads} color="#00897B" />
                                <StatPill icon={<ThumbUp sx={{ fontSize: 11 }} />} value={articleStat.claps} color={theme.palette.error.main} />
                                {(articleStat.memberReads || articleStat.nonMemberReads) && (
                                    <Stack direction="row" alignItems="center" spacing={0.3}>
                                        <PeopleAlt sx={{ fontSize: 11, color: theme.palette.primary.main }} />
                                        <Typography variant="caption" fontWeight={600} color="primary">
                                            {fmt(articleStat.memberReads)}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">/</Typography>
                                        <PersonOutline sx={{ fontSize: 11, color: 'text.secondary' }} />
                                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                                            {fmt(articleStat.nonMemberReads)}
                                        </Typography>
                                    </Stack>
                                )}
                            </>
                        )}
                    </Stack>
                </Stack>

                <Tooltip title={hasStats ? "Edit stats" : "Add stats"} placement="left">
                    <IconButton size="small" sx={{
                        color: hasStats ? theme.palette.primary.main : 'text.disabled',
                        backgroundColor: hasStats ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    }}>
                        <Edit sx={{ fontSize: 15 }} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
};

// ── Aggregate Banner ─────────────────────────────────────────────────────────
const AggregateBanner = ({ aggregates }) => {
    const theme = useTheme();
    if (aggregates.filledCount === 0) return null;

    const memberViewPct = aggregates.totalMemberViews + aggregates.totalNonMemberViews > 0
        ? Math.round((aggregates.totalMemberViews / (aggregates.totalMemberViews + aggregates.totalNonMemberViews)) * 100)
        : null;
    const memberReadPct = aggregates.totalMemberReads + aggregates.totalNonMemberReads > 0
        ? Math.round((aggregates.totalMemberReads / (aggregates.totalMemberReads + aggregates.totalNonMemberReads)) * 100)
        : null;

    return (
        <Box sx={{
            px: 2, py: 1.5, flexShrink: 0,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                    Totals across {aggregates.filledCount} tracked article{aggregates.filledCount !== 1 ? "s" : ""}
                </Typography>
            </Stack>

            {/* Row 1: Views / Reads / Claps */}
            <Stack direction="row" spacing={3} flexWrap="wrap" mb={1}>
                {[
                    { label: "Views", value: aggregates.totalViews, color: "#FF9900", icon: <Visibility sx={{ fontSize: 13 }} /> },
                    { label: "Reads", value: aggregates.totalReads, color: "#00897B", icon: <MenuBook sx={{ fontSize: 13 }} /> },
                    { label: "Claps", value: aggregates.totalClaps, color: theme.palette.error.main, icon: <ThumbUp sx={{ fontSize: 13 }} /> },
                ].map(({ label, value, color, icon }) => value > 0 && (
                    <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ color }}>{icon}</Box>
                        <Typography variant="body2" fontWeight={800} sx={{ color }}>{fmt(value)}</Typography>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                    </Stack>
                ))}
            </Stack>

            {/* Row 2: Member split */}
            {(memberViewPct !== null || memberReadPct !== null) && (
                <Stack spacing={0.75}>
                    {memberViewPct !== null && (
                        <Stack spacing={0.4}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary">
                                    Views: <b style={{ color: theme.palette.primary.main }}>{memberViewPct}% Member</b> / {100 - memberViewPct}% Non-Member
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    {fmt(aggregates.totalMemberViews)} / {fmt(aggregates.totalNonMemberViews)}
                                </Typography>
                            </Stack>
                            <Box sx={{ height: 6, borderRadius: 3, backgroundColor: alpha(theme.palette.divider, 0.4), overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', width: `${memberViewPct}%`, backgroundColor: theme.palette.primary.main, borderRadius: 3 }} />
                            </Box>
                        </Stack>
                    )}
                    {memberReadPct !== null && (
                        <Stack spacing={0.4}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption" color="text.secondary">
                                    Reads: <b style={{ color: "#00897B" }}>{memberReadPct}% Member</b> / {100 - memberReadPct}% Non-Member
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    {fmt(aggregates.totalMemberReads)} / {fmt(aggregates.totalNonMemberReads)}
                                </Typography>
                            </Stack>
                            <Box sx={{ height: 6, borderRadius: 3, backgroundColor: alpha(theme.palette.divider, 0.4), overflow: 'hidden' }}>
                                <Box sx={{ height: '100%', width: `${memberReadPct}%`, backgroundColor: "#00897B", borderRadius: 3 }} />
                            </Box>
                        </Stack>
                    )}
                </Stack>
            )}
        </Box>
    );
};

// ── Draft Row ────────────────────────────────────────────────────────────────
const DraftRow = ({ draft, index }) => {
    const theme = useTheme();
    const color = CATEGORY_COLORS[draft.category] ?? "#78909C";
    return (
        <Box sx={{
            display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
            gap: 2, alignItems: 'center', px: 2, py: 1.25,
            backgroundColor: index % 2 === 0 ? 'transparent' : alpha(theme.palette.action.hover, 0.03),
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
        }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Drafts sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
                <Typography variant="body2" fontWeight={500} color="text.secondary"
                    sx={{ fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {draft.title}
                </Typography>
            </Stack>
            <Chip label={draft.category} size="small"
                sx={{ backgroundColor: alpha(color, 0.12), color, fontWeight: 600, fontSize: '0.65rem', height: 20, display: { xs: 'none', sm: 'flex' } }} />
        </Box>
    );
};

// ── Main Drawer ──────────────────────────────────────────────────────────────
const MediumArticleDrawer = ({ open, onClose }) => {
    const theme = useTheme();
    const { statsMap, setArticleStat, clearArticleStat, aggregates } = useArticleStats();

    const [tab, setTab] = useState(0);
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterYear, setFilterYear] = useState("All");
    const [page, setPage] = useState(0);
    const [editingId, setEditingId] = useState(null);

    const categories = ["All", "AWS", "Azure", "AI/ML", "Java", "Docker/K8s", "Programming", "Other"];
    const years = ["All", "2026", "2025", "2022", "2020"];

    const filteredPublished = useMemo(() => {
        let list = [...mediumArticles.published].reverse();
        if (filterCategory !== "All") list = list.filter(a => a.category === filterCategory);
        if (filterYear !== "All") list = list.filter(a => a.year === parseInt(filterYear));
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(a => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
        }
        return list;
    }, [search, filterCategory, filterYear]);

    const filteredDrafts = useMemo(() => {
        let list = mediumArticles.drafts;
        if (filterCategory !== "All") list = list.filter(d => d.category === filterCategory);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(d => d.title.toLowerCase().includes(q));
        }
        return list;
    }, [search, filterCategory]);

    const visiblePublished = filteredPublished.slice(0, (page + 1) * ROWS_PER_PAGE);
    const hasMore = visiblePublished.length < filteredPublished.length;

    const handleEdit = useCallback((id) => setEditingId(prev => prev === id ? null : id), []);

    const handleSave = useCallback((id, fields) => {
        setArticleStat(id, fields);
        setEditingId(null);
    }, [setArticleStat]);

    const handleClear = useCallback((id) => {
        clearArticleStat(id);
        setEditingId(null);
    }, [clearArticleStat]);

    const handleCategoryChange = (cat) => { setFilterCategory(cat); setPage(0); };
    const handleYearChange = (e) => { setFilterYear(e.target.value); setPage(0); };
    const handleSearch = (e) => { setSearch(e.target.value); setPage(0); };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: '100vw', sm: 580, md: 700 },
                    display: 'flex', flexDirection: 'column',
                    backgroundColor: theme.palette.background.default,
                }
            }}
        >
            {/* ── Header ── */}
            <Box sx={{
                px: 3, py: 2, flexShrink: 0,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                backgroundColor: theme.palette.background.paper,
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Article sx={{ color: theme.palette.primary.main }} />
                        <Typography variant="h6" fontWeight={700}>All Articles</Typography>
                        <Tooltip title="Click the edit icon on any article to enter its stats from medium.com/me/stats" placement="bottom" arrow>
                            <InfoOutlined sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                        </Tooltip>
                    </Stack>
                    <IconButton onClick={onClose} size="small"><Close /></IconButton>
                </Stack>

                <Tabs
                    value={tab}
                    onChange={(_, v) => { setTab(v); setEditingId(null); }}
                    sx={{ mb: 1.5, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' } }}
                >
                    <Tab label={`Published (${mediumArticles.published.length})`} />
                    <Tab label={`Drafts (${mediumArticles.drafts.length})`} />
                </Tabs>

                <TextField
                    size="small" fullWidth
                    placeholder="Search by title or category…"
                    value={search}
                    onChange={handleSearch}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                        sx: { borderRadius: 2, fontSize: '0.85rem' }
                    }}
                    sx={{ mb: 1.5 }}
                />

                {tab === 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} alignItems="center">
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5}>
                            {categories.map(cat => (
                                <Chip key={cat} label={cat} size="small"
                                    onClick={() => handleCategoryChange(cat)}
                                    sx={{
                                        fontWeight: 600, fontSize: '0.65rem', cursor: 'pointer', height: 22,
                                        backgroundColor: filterCategory === cat ? alpha(CATEGORY_COLORS[cat] ?? theme.palette.primary.main, 0.18) : 'transparent',
                                        color: filterCategory === cat ? (CATEGORY_COLORS[cat] ?? theme.palette.primary.main) : 'text.secondary',
                                        border: `1px solid ${filterCategory === cat ? (CATEGORY_COLORS[cat] ?? theme.palette.primary.main) : alpha(theme.palette.divider, 0.5)}`,
                                    }}
                                />
                            ))}
                        </Stack>
                        <FormControl size="small" sx={{ minWidth: 90 }}>
                            <Select value={filterYear} onChange={handleYearChange} displayEmpty
                                sx={{ fontSize: '0.75rem', height: 28, borderRadius: 2 }}>
                                {years.map(y => <MenuItem key={y} value={y} sx={{ fontSize: '0.8rem' }}>{y === "All" ? "All Years" : y}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                )}
            </Box>

            {/* ── Aggregate banner (published tab only) ── */}
            {tab === 0 && <AggregateBanner aggregates={aggregates} />}

            {/* ── Scrollable list ── */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {tab === 0 && (
                    <>
                        {filteredPublished.length === 0 ? (
                            <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
                                <Typography color="text.secondary">No articles match your filters</Typography>
                            </Stack>
                        ) : (
                            <>
                                {visiblePublished.map((article, i) => (
                                    <Box key={article.id}>
                                        <ArticleRow
                                            article={article}
                                            index={i}
                                            articleStat={statsMap[article.id]}
                                            isEditing={editingId === article.id}
                                            onEdit={() => handleEdit(article.id)}
                                        />
                                        <Collapse in={editingId === article.id} timeout={200}>
                                            <StatEntryForm
                                                article={article}
                                                existing={statsMap[article.id]}
                                                onSave={(fields) => handleSave(article.id, fields)}
                                                onClear={() => handleClear(article.id)}
                                                onCancel={() => setEditingId(null)}
                                            />
                                        </Collapse>
                                    </Box>
                                ))}
                                {hasMore && (
                                    <Box sx={{
                                        textAlign: 'center', py: 2, cursor: 'pointer',
                                        color: theme.palette.primary.main, fontWeight: 600, fontSize: '0.85rem',
                                        '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.04) },
                                    }}
                                        onClick={() => setPage(p => p + 1)}>
                                        Load more ({filteredPublished.length - visiblePublished.length} remaining)
                                    </Box>
                                )}
                            </>
                        )}
                    </>
                )}

                {tab === 1 && (
                    <>
                        <Box sx={{ px: 2, py: 1.5, backgroundColor: alpha(theme.palette.warning.main, 0.06), borderBottom: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <InfoOutlined sx={{ fontSize: 15, color: 'warning.main', mt: 0.2, flexShrink: 0 }} />
                                <Typography variant="caption" color="text.secondary">
                                    Unpublished drafts — dates not available in export.
                                </Typography>
                            </Stack>
                        </Box>
                        {filteredDrafts.length === 0
                            ? <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}><Typography color="text.secondary">No drafts match your search</Typography></Stack>
                            : filteredDrafts.map((draft, i) => <DraftRow key={i} draft={draft} index={i} />)
                        }
                    </>
                )}
            </Box>

            {/* ── Footer ── */}
            <Box sx={{
                px: 3, py: 1.5, flexShrink: 0,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                backgroundColor: theme.palette.background.paper,
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                        {tab === 0
                            ? `${Math.min(visiblePublished.length, filteredPublished.length)} of ${filteredPublished.length} articles · ${aggregates.filledCount} with stats`
                            : `${filteredDrafts.length} draft${filteredDrafts.length !== 1 ? 's' : ''}`
                        }
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        Stats saved to browser · click ✎ to edit
                    </Typography>
                </Stack>
            </Box>
        </Drawer>
    );
};

export default MediumArticleDrawer;
