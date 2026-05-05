import { useState } from "react";
import { useTheme, alpha, useMediaQuery } from "@mui/material";
import {
    Box, Typography, Stack, Chip, Card, CardContent, Divider,
    Dialog, DialogContent, IconButton, Button
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import { ACCENT } from "../../data/aws-exam/constants";
import iamScenarios from "../../data/aws-exam/iam/scenarios";
import evalSteps from "../../data/aws-exam/iam/evalSteps";
import stsApis from "../../data/aws-exam/iam/stsApis";
import keyNumbers from "../../data/aws-exam/iam/keyNumbers";

/* ── Compact scenario card — click opens modal ── */
function ScenarioCard({ s, onOpen }) {
    return (
        <Card
            onClick={() => onOpen(s)}
            sx={{
                borderRadius: 3,
                cursor: 'pointer',
                borderLeft: `4px solid ${s.color}`,
                border: `1px solid ${alpha(s.color, 0.25)}`,
                borderLeftWidth: 4,
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 32px ${alpha(s.color, 0.22)}`,
                    borderColor: s.color,
                },
            }}
        >
            <CardContent sx={{ pb: '14px !important' }}>
                <Stack direction="row" alignItems="flex-start" spacing={1.5} mb={1.25}>
                    <Typography fontSize={26} lineHeight={1.1}>{s.icon}</Typography>
                    <Box flex={1} minWidth={0}>
                        <Typography variant="caption" fontWeight={700}
                            sx={{ color: s.color, letterSpacing: '0.08em', display: 'block', mb: 0.25 }}>
                            {s.tag}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                            {s.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{s.subtitle}</Typography>
                    </Box>
                </Stack>

                <Stack direction="row" flexWrap="wrap" gap={0.5} mb={1.5}>
                    {s.flow.map((step, i) => (
                        <Stack key={i} direction="row" alignItems="center" gap={0.4}>
                            <Chip label={step} size="small" sx={{
                                fontSize: 9, fontWeight: 600, height: 20,
                                backgroundColor: alpha(s.color, 0.12),
                                color: s.color,
                                border: `1px solid ${alpha(s.color, 0.3)}`,
                            }} />
                            {i < s.flow.length - 1 && (
                                <Typography sx={{ color: alpha(s.color, 0.5), fontSize: 10, lineHeight: 1 }}>→</Typography>
                            )}
                        </Stack>
                    ))}
                </Stack>

                <Typography variant="caption" sx={{ color: s.color, fontWeight: 600 }}>
                    View details →
                </Typography>
            </CardContent>
        </Card>
    );
}

function MatrixSections({ matrices }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Stack spacing={2}>
            <Typography variant="caption" color="text.disabled"
                sx={{ letterSpacing: '0.08em', display: 'block' }}>
                MATRIX NOTES, LIMITS, AND SCENARIO LINKS
            </Typography>

            {matrices.map((matrix) => (
                <Card key={matrix.id} sx={{
                    borderRadius: 3,
                    border: `1px solid ${alpha(matrix.color, 0.28)}`,
                    borderLeft: `4px solid ${matrix.color}`,
                    overflow: 'hidden',
                }}>
                    <CardContent>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} mb={1.5}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: matrix.color }}>
                                    {matrix.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {matrix.subtitle}
                                </Typography>
                            </Box>
                            <Chip
                                label={`${matrix.rows.length} row${matrix.rows.length !== 1 ? 's' : ''}`}
                                size="small"
                                variant="outlined"
                                sx={{ color: matrix.color, borderColor: alpha(matrix.color, 0.45), alignSelf: { xs: 'flex-start', sm: 'center' } }}
                            />
                        </Stack>

                        <Box sx={{ overflowX: 'auto' }}>
                            <Box component="table" sx={{
                                width: '100%',
                                borderCollapse: 'separate',
                                borderSpacing: 0,
                                minWidth: 680,
                            }}>
                                <Box component="thead">
                                    <Box component="tr">
                                        {matrix.columns.map((column) => (
                                            <Box component="th" key={column} sx={{
                                                textAlign: 'left',
                                                fontSize: 11,
                                                letterSpacing: '0.06em',
                                                color: matrix.color,
                                                backgroundColor: alpha(matrix.color, isDark ? 0.14 : 0.08),
                                                borderBottom: `1px solid ${alpha(matrix.color, 0.25)}`,
                                                p: 1.25,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {column}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                                <Box component="tbody">
                                    {matrix.rows.map((row, rowIndex) => (
                                        <Box component="tr" key={`${matrix.id}-${rowIndex}`}>
                                            {row.map((cell, cellIndex) => (
                                                <Box component="td" key={`${matrix.id}-${rowIndex}-${cellIndex}`} sx={{
                                                    p: 1.25,
                                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                                    verticalAlign: 'top',
                                                    backgroundColor: rowIndex % 2 === 0
                                                        ? alpha(theme.palette.background.default, isDark ? 0.25 : 0.55)
                                                        : 'transparent',
                                                }}>
                                                    <Typography
                                                        variant="caption"
                                                        color={cellIndex === 0 ? "text.primary" : "text.secondary"}
                                                        fontWeight={cellIndex === 0 ? 700 : 500}
                                                        sx={{ lineHeight: 1.55 }}
                                                    >
                                                        {cell}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}

/* ── Modal popup with full scenario details ── */
function ScenarioModal({ scenario: s, onClose }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [expanded, setExpanded] = useState(false);
    const [activeCode, setActiveCode] = useState(null); // null | 'cli' | 'cdk'
    const isFullScreen = isMobile || expanded;
    const subBg = isDark ? alpha('#000', 0.35) : theme.palette.grey[50];
    const codeBg = isDark ? '#0d1117' : '#1a1f2e';

    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isFullScreen}
            PaperProps={{
                sx: {
                    borderRadius: isFullScreen ? 0 : 3,
                    border: isFullScreen ? 'none' : `1px solid ${alpha(s.color, 0.3)}`,
                    overflow: 'hidden',
                    maxHeight: isFullScreen ? '100vh' : '92vh',
                    transition: 'all 0.25s ease',
                },
            }}
        >
            {/* Coloured header */}
            <Box sx={{
                background: `linear-gradient(135deg, ${alpha(s.color, isDark ? 0.28 : 0.13)} 0%, ${alpha(s.color, isDark ? 0.08 : 0.04)} 100%)`,
                borderBottom: `3px solid ${s.color}`,
                p: { xs: 2, md: 3 },
                position: 'relative',
            }}>
                {/* Action buttons: expand + close */}
                <Stack direction="row" spacing={0.75} sx={{ position: 'absolute', top: 10, right: 10 }}>
                    {!isMobile && (
                        <IconButton
                            onClick={() => setExpanded(prev => !prev)}
                            size="small"
                            aria-label={expanded ? "exit fullscreen" : "expand"}
                            sx={{
                                color: 'text.secondary',
                                backgroundColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                                '&:hover': { backgroundColor: isDark ? alpha('#fff', 0.12) : alpha('#000', 0.1) },
                            }}
                        >
                            {expanded ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
                        </IconButton>
                    )}
                    <IconButton
                        onClick={onClose}
                        size="small"
                        aria-label="close"
                        sx={{
                            color: 'text.secondary',
                            backgroundColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                            '&:hover': { backgroundColor: isDark ? alpha('#fff', 0.12) : alpha('#000', 0.1) },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>

                <Stack direction="row" alignItems="flex-start" spacing={2} pr={5}>
                    <Typography fontSize={{ xs: 34, md: 42 }} lineHeight={1}>{s.icon}</Typography>
                    <Box>
                        <Typography variant="caption" fontWeight={700}
                            sx={{ color: s.color, letterSpacing: '0.1em', display: 'block', mb: 0.25 }}>
                            {s.tag}
                        </Typography>
                        <Typography variant="h5" fontWeight={700} lineHeight={1.2}>{s.title}</Typography>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>{s.subtitle}</Typography>
                    </Box>
                </Stack>

                <Stack direction="row" flexWrap="wrap" gap={0.5} mt={2}>
                    {s.flow.map((step, i) => (
                        <Stack key={i} direction="row" alignItems="center" gap={0.5}>
                            <Chip label={step} size="small" sx={{
                                fontSize: 11, fontWeight: 600, height: 24,
                                backgroundColor: alpha(s.color, isDark ? 0.2 : 0.12),
                                color: s.color,
                                border: `1px solid ${alpha(s.color, 0.4)}`,
                            }} />
                            {i < s.flow.length - 1 && (
                                <Typography variant="caption" color="text.disabled" fontSize={12}>→</Typography>
                            )}
                        </Stack>
                    ))}
                </Stack>
            </Box>

            {/* Scrollable content */}
            <DialogContent sx={{ p: { xs: 2, md: 3 }, overflowY: 'auto' }}>

                {/* ── Real World Analogy ── */}
                {s.analogy && (
                    <Box mb={3} sx={{
                        background: isDark
                            ? `linear-gradient(135deg, ${alpha(s.color, 0.12)} 0%, ${alpha(s.color, 0.05)} 100%)`
                            : `linear-gradient(135deg, ${alpha(s.color, 0.08)} 0%, ${alpha(s.color, 0.03)} 100%)`,
                        border: `1px solid ${alpha(s.color, 0.25)}`,
                        borderLeft: `4px solid ${s.color}`,
                        borderRadius: '0 12px 12px 0',
                        p: { xs: 1.75, md: 2.25 },
                    }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                            <Typography fontSize={18} lineHeight={1}>🧠</Typography>
                            <Typography variant="caption" fontWeight={700}
                                sx={{ color: s.color, letterSpacing: '0.1em' }}>
                                THINK OF IT LIKE THIS
                            </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{
                            lineHeight: 1.85,
                            fontStyle: 'italic',
                            color: isDark ? alpha('#fff', 0.82) : 'text.primary',
                        }}>
                            {s.analogy}
                        </Typography>
                    </Box>
                )}

                {/* ── Use Case ── */}
                <Box mb={3}>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: s.color, letterSpacing: '0.12em', display: 'block', mb: 1 }}>
                        🌍 Real-World Use Case
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={600} mb={1}>{s.useCase.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.85 }}>
                        {s.useCase.story}
                    </Typography>

                    {/* Architecture diagram */}
                    <Box sx={{
                        backgroundColor: subBg,
                        borderRadius: 2, p: { xs: 1.5, md: 2 }, mt: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        overflowX: 'auto',
                    }}>
                        <Typography variant="caption" color="text.disabled" fontWeight={700}
                            display="block" mb={1.5} sx={{ letterSpacing: '0.1em' }}>
                            ARCHITECTURE FLOW
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1.5}>
                            {s.useCase.diagram.map((node, i) => {
                                if (node.actor) return (
                                    <Stack key={i} alignItems="center" spacing={0.75} sx={{ minWidth: 72, maxWidth: 100 }}>
                                        <Box sx={{
                                            width: 50, height: 50, borderRadius: 2.5,
                                            backgroundColor: alpha(s.color, isDark ? 0.15 : 0.1),
                                            border: `1px solid ${alpha(s.color, 0.3)}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Typography fontSize={24}>{node.icon}</Typography>
                                        </Box>
                                        <Typography variant="caption" textAlign="center"
                                            sx={{ fontSize: 10, lineHeight: 1.35, color: 'text.secondary' }}>
                                            {node.actor}
                                        </Typography>
                                    </Stack>
                                );
                                if (node.arrow) return (
                                    <Stack key={i} alignItems="center" spacing={0.25} sx={{ minWidth: 48, maxWidth: 80 }}>
                                        <Typography sx={{ color: s.color, fontSize: 18, lineHeight: 1 }}>→</Typography>
                                        <Typography variant="caption" color="text.disabled" textAlign="center"
                                            sx={{ fontSize: 9, lineHeight: 1.3 }}>
                                            {node.arrow}
                                        </Typography>
                                    </Stack>
                                );
                                return null;
                            })}
                        </Stack>
                    </Box>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* ── Build Steps + JSON Toggle ── */}
                <Box mb={3}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                        <Typography variant="overline" fontWeight={700}
                            sx={{ color: s.color, letterSpacing: '0.12em' }}>
                            🛠️ How to Build This System
                        </Typography>
                        {(s.roleJson?.length > 0 || s.cdkCode?.length > 0) && (
                            <Stack direction="row" gap={0.75}>
                                {s.roleJson && s.roleJson.length > 0 && (
                                    <Button
                                        size="small"
                                        variant={activeCode === 'cli' ? "contained" : "outlined"}
                                        onClick={() => setActiveCode(prev => prev === 'cli' ? null : 'cli')}
                                        sx={{
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                                            px: 1.5, py: 0.5,
                                            minWidth: 'unset',
                                            borderColor: s.color,
                                            color: activeCode === 'cli' ? '#fff' : s.color,
                                            backgroundColor: activeCode === 'cli' ? s.color : 'transparent',
                                            '&:hover': {
                                                backgroundColor: activeCode === 'cli' ? alpha(s.color, 0.85) : alpha(s.color, 0.1),
                                                borderColor: s.color,
                                            },
                                        }}
                                    >
                                        {'$ CLI'}
                                    </Button>
                                )}
                                {s.cdkCode && s.cdkCode.length > 0 && (
                                    <Button
                                        size="small"
                                        variant={activeCode === 'cdk' ? "contained" : "outlined"}
                                        onClick={() => setActiveCode(prev => prev === 'cdk' ? null : 'cdk')}
                                        sx={{
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                                            px: 1.5, py: 0.5,
                                            minWidth: 'unset',
                                            borderColor: activeCode === 'cdk' ? s.color : alpha(s.color, 0.55),
                                            color: activeCode === 'cdk' ? '#fff' : alpha(s.color, 0.8),
                                            backgroundColor: activeCode === 'cdk' ? s.color : 'transparent',
                                            '&:hover': {
                                                backgroundColor: activeCode === 'cdk' ? alpha(s.color, 0.85) : alpha(s.color, 0.1),
                                                borderColor: s.color,
                                            },
                                        }}
                                    >
                                        {'◆ CDK'}
                                    </Button>
                                )}
                            </Stack>
                        )}
                    </Stack>

                    <Stack spacing={1.25}>
                        {s.buildSystem.map((step, i) => (
                            <Stack key={i} direction="row" gap={1.5} alignItems="flex-start">
                                <Box sx={{
                                    width: 26, height: 26, borderRadius: 1.5, flexShrink: 0,
                                    backgroundColor: alpha(s.color, 0.15),
                                    border: `1px solid ${alpha(s.color, 0.4)}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: s.color }}>{i + 1}</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ lineHeight: 1.75, pt: '2px' }}>{step}</Typography>
                            </Stack>
                        ))}
                    </Stack>

                    {/* ── CLI Commands ── */}
                    {activeCode === 'cli' && s.roleJson && (
                        <Box mt={2.5}>
                            <Typography variant="caption" color="text.disabled" fontWeight={700}
                                sx={{ letterSpacing: '0.1em', display: 'block', mb: 2 }}>
                                AWS CLI COMMANDS
                            </Typography>
                            <Stack spacing={2}>
                                {s.roleJson.map((entry, i) => (
                                    <Box key={i}>
                                        <Typography variant="caption" fontWeight={700}
                                            sx={{ color: s.color, letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
                                            {entry.label}
                                        </Typography>
                                        <Box component="pre" sx={{
                                            fontSize: 11.5,
                                            color: '#86efac',
                                            backgroundColor: codeBg,
                                            p: { xs: 1.5, md: 2 },
                                            borderRadius: 2,
                                            overflowX: 'auto',
                                            lineHeight: 1.7,
                                            m: 0,
                                            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                                            border: `1px solid ${alpha(s.color, 0.2)}`,
                                        }}>
                                            {entry.code}
                                        </Box>
                                        {entry.note && (
                                            <Stack direction="row" spacing={0.75} mt={0.75} alignItems="flex-start">
                                                <Typography sx={{ color: ACCENT.amber, fontSize: 13, flexShrink: 0, mt: '1px' }}>💡</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                                    {entry.note}
                                                </Typography>
                                            </Stack>
                                        )}
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {/* ── CDK (TypeScript) ── */}
                    {activeCode === 'cdk' && s.cdkCode && (
                        <Box mt={2.5}>
                            <Typography variant="caption" color="text.disabled" fontWeight={700}
                                sx={{ letterSpacing: '0.1em', display: 'block', mb: 2 }}>
                                CDK (TYPESCRIPT) — AWS CDK v2
                            </Typography>
                            <Stack spacing={2}>
                                {s.cdkCode.map((entry, i) => (
                                    <Box key={i}>
                                        <Typography variant="caption" fontWeight={700}
                                            sx={{ color: s.color, letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
                                            {entry.label}
                                        </Typography>
                                        <Box component="pre" sx={{
                                            fontSize: 11.5,
                                            color: '#93c5fd',
                                            backgroundColor: codeBg,
                                            p: { xs: 1.5, md: 2 },
                                            borderRadius: 2,
                                            overflowX: 'auto',
                                            lineHeight: 1.7,
                                            m: 0,
                                            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                                            border: `1px solid ${alpha(s.color, 0.2)}`,
                                        }}>
                                            {entry.code}
                                        </Box>
                                        {entry.note && (
                                            <Stack direction="row" spacing={0.75} mt={0.75} alignItems="flex-start">
                                                <Typography sx={{ color: ACCENT.amber, fontSize: 13, flexShrink: 0, mt: '1px' }}>💡</Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                                    {entry.note}
                                                </Typography>
                                            </Stack>
                                        )}
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* ── Exam Tips ── */}
                <Box>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: ACCENT.amber, letterSpacing: '0.12em', display: 'block', mb: 2 }}>
                        💡 Exam Tips
                    </Typography>
                    <Stack spacing={1}>
                        {s.examTips.map((tip, i) => (
                            <Stack key={i} direction="row" gap={1.25} alignItems="flex-start" sx={{
                                backgroundColor: alpha(ACCENT.amber, isDark ? 0.08 : 0.06),
                                borderLeft: `3px solid ${ACCENT.amber}`,
                                borderRadius: '0 8px 8px 0',
                                pl: 1.5, py: 1, pr: 1.5,
                            }}>
                                <Typography sx={{ color: ACCENT.amber, fontSize: 14, flexShrink: 0, mt: '1px' }}>💡</Typography>
                                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{tip}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>
            </DialogContent>
        </Dialog>
    );
}

/* ── Eval step detail popup ── */
function EvalStepModal({ step: s, onClose }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const stepColor = s.type === 'allow' ? ACCENT.green : s.type === 'check' ? ACCENT.amber : ACCENT.red;
    const codeBg = isDark ? '#0d1117' : '#1a1f2e';

    return (
        <Dialog
            open
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 3,
                    border: isMobile ? 'none' : `1px solid ${alpha(stepColor, 0.35)}`,
                    overflow: 'hidden',
                    maxHeight: isMobile ? '100vh' : '90vh',
                },
            }}
        >
            {/* Header */}
            <Box sx={{
                background: `linear-gradient(135deg, ${alpha(stepColor, isDark ? 0.28 : 0.12)} 0%, ${alpha(stepColor, isDark ? 0.06 : 0.03)} 100%)`,
                borderBottom: `3px solid ${stepColor}`,
                p: { xs: 2, md: 2.5 },
                position: 'relative',
            }}>
                <IconButton
                    onClick={onClose}
                    size="small"
                    aria-label="close"
                    sx={{
                        position: 'absolute', top: 10, right: 10,
                        color: 'text.secondary',
                        backgroundColor: isDark ? alpha('#fff', 0.05) : alpha('#000', 0.05),
                        '&:hover': { backgroundColor: isDark ? alpha('#fff', 0.12) : alpha('#000', 0.1) },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>

                <Stack direction="row" alignItems="center" spacing={1.5} pr={5}>
                    <Box sx={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        backgroundColor: alpha(stepColor, 0.2),
                        border: `2px solid ${stepColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: stepColor }}>{s.step}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" fontWeight={700}
                            sx={{ color: stepColor, letterSpacing: '0.1em', display: 'block', mb: 0.25 }}>
                            DECISION STEP {s.step}
                        </Typography>
                        <Typography variant="h6" fontWeight={700} lineHeight={1.25}>{s.label}</Typography>
                    </Box>
                </Stack>

                {/* Outcome chips */}
                <Stack direction="row" spacing={1} mt={1.75} flexWrap="wrap" rowGap={0.75}>
                    <Chip label={`✓ YES → ${s.yes}`} size="small" sx={{
                        fontSize: 10, fontWeight: 600, height: 'auto',
                        backgroundColor: alpha(s.type === 'allow' ? ACCENT.green : ACCENT.red, isDark ? 0.18 : 0.1),
                        color: s.type === 'allow' ? ACCENT.green : ACCENT.red,
                        border: `1px solid ${alpha(s.type === 'allow' ? ACCENT.green : ACCENT.red, 0.4)}`,
                        '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5, lineHeight: 1.4 },
                    }} />
                    {s.no && (
                        <Chip label={`✗ NO → ${s.no}`} size="small" sx={{
                            fontSize: 10, fontWeight: 600, height: 'auto',
                            border: `1px dashed ${theme.palette.divider}`,
                            color: 'text.disabled',
                            '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                        }} />
                    )}
                </Stack>
            </Box>

            <DialogContent sx={{ p: { xs: 2, md: 2.5 }, overflowY: 'auto' }}>

                {/* What it means */}
                <Box mb={2.5}>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: stepColor, letterSpacing: '0.12em', display: 'block', mb: 1 }}>
                        🔍 What This Means
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.85 }}>
                        {s.details.what}
                    </Typography>
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {/* Where configured */}
                <Box mb={2.5}>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: stepColor, letterSpacing: '0.12em', display: 'block', mb: 1 }}>
                        ⚙️ Where It's Configured
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.85 }}>
                        {s.details.where}
                    </Typography>
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {/* Sample policy */}
                <Box mb={2.5}>
                    <Typography variant="overline" fontWeight={700}
                        sx={{ color: stepColor, letterSpacing: '0.12em', display: 'block', mb: 1.25 }}>
                        📋 Sample Policy / Config
                    </Typography>
                    <Box component="pre" sx={{
                        fontSize: 11.5, color: '#86efac',
                        backgroundColor: codeBg,
                        p: { xs: 1.5, md: 2 }, borderRadius: 2,
                        overflowX: 'auto', lineHeight: 1.7, m: 0,
                        fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                        border: `1px solid ${alpha(stepColor, 0.2)}`,
                    }}>
                        {s.details.sample}
                    </Box>
                    {s.details.sampleNote && (
                        <Stack direction="row" spacing={1} mt={1} alignItems="flex-start">
                            <Typography sx={{ color: ACCENT.amber, fontSize: 14, flexShrink: 0, mt: '1px' }}>💡</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                {s.details.sampleNote}
                            </Typography>
                        </Stack>
                    )}
                </Box>

                <Divider sx={{ mb: 2.5 }} />

                {/* Pro tip */}
                <Box sx={{
                    backgroundColor: alpha(ACCENT.amber, isDark ? 0.08 : 0.06),
                    borderLeft: `3px solid ${ACCENT.amber}`,
                    borderRadius: '0 8px 8px 0',
                    pl: 1.5, py: 1.25, pr: 1.5,
                }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: ACCENT.amber, display: 'block', mb: 0.5 }}>
                        💡 Pro Tip
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                        {s.details.tip}
                    </Typography>
                </Box>

            </DialogContent>
        </Dialog>
    );
}

/* ── Main exported section ── */
export default function IamScenariosSection({
    hideHeader,
    title = "IAM",
    scenarioMapTitle = "Scenario Map",
    scenarios = iamScenarios,
    showStudyTabs = true,
    matrices = [],
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [openScenario, setOpenScenario] = useState(null);
    const [openEvalStep, setOpenEvalStep] = useState(null);
    const [tab, setTab] = useState("scenarios");

    const codeBg = isDark ? '#0d1117' : '#1a1f2e';
    const subBg = isDark ? alpha(theme.palette.background.default, 0.6) : theme.palette.grey[50];

    const tabs = showStudyTabs ? [
        { id: "scenarios", label: "🎯 Scenarios" },
        ...(matrices.length > 0 ? [{ id: "matrices", label: "📊 Matrices" }] : []),
        { id: "eval", label: "⚖️ Policy Eval" },
        { id: "sts", label: "🔐 STS APIs" },
        { id: "numbers", label: "🔢 Key Numbers" },
    ] : [
        { id: "scenarios", label: "🎯 Scenarios" },
        ...(matrices.length > 0 ? [{ id: "matrices", label: "📊 Matrices" }] : []),
    ];

    return (
        <Box>
            {!hideHeader && (
                <Stack direction="row" alignItems="center" spacing={1} mb={3} flexWrap="wrap" rowGap={1}>
                    <Typography variant="h5" fontWeight={700}>
                        {title} <span style={{ color: theme.palette.primary.main }}>{scenarioMapTitle}</span>
                    </Typography>
                    <Chip label="SAA-C03" size="small" color="primary" variant="outlined" />
                    <Chip label="Interactive" size="small" variant="outlined"
                        sx={{ color: ACCENT.green, borderColor: ACCENT.green }} />
                </Stack>
            )}

            {/* Tab bar */}
            <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
                {tabs.map(t => (
                    <Chip
                        key={t.id}
                        label={t.label}
                        onClick={() => setTab(t.id)}
                        variant={tab === t.id ? "filled" : "outlined"}
                        color={tab === t.id ? "primary" : "default"}
                        sx={{ fontWeight: 600, cursor: 'pointer' }}
                    />
                ))}
            </Stack>

            {/* ── SCENARIOS TAB ── */}
            {tab === "scenarios" && (
                <>
                    <Typography variant="caption" color="text.disabled"
                        sx={{ letterSpacing: '0.08em', display: 'block', mb: 2 }}>
                        CLICK ANY CARD TO VIEW FULL SCENARIO DETAILS
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
                        {scenarios.map(s => (
                            <ScenarioCard key={s.id} s={s} onOpen={setOpenScenario} />
                        ))}
                    </Box>
                </>
            )}

            {tab === "matrices" && matrices.length > 0 && (
                <MatrixSections matrices={matrices} />
            )}

            {/* ── POLICY EVAL TAB ── */}
            {tab === "eval" && (
                <>
                    <Typography variant="caption" color="text.disabled"
                        sx={{ letterSpacing: '0.08em', display: 'block', mb: 2 }}>
                        EVERY API CALL GOES THROUGH THIS EXACT WATERFALL — MOST TESTED IAM TOPIC
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary"
                                    sx={{ letterSpacing: '0.08em' }}>
                                    DECISION WATERFALL
                                </Typography>
                                <Chip label="every API call" size="small" variant="outlined"
                                    sx={{ fontSize: 9, height: 18, color: 'text.disabled', borderColor: 'divider' }} />
                            </Stack>

                            {/* Start marker */}
                            <Stack direction="row" alignItems="center" spacing={1} mb={0.5} sx={{ pl: 1 }}>
                                <Box sx={{
                                    px: 1.25, py: 0.4, borderRadius: 5,
                                    backgroundColor: alpha(ACCENT.primary, 0.12),
                                    border: `1px solid ${alpha(ACCENT.primary, 0.4)}`,
                                }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: ACCENT.primary }}>
                                        ▶ API CALL RECEIVED
                                    </Typography>
                                </Box>
                            </Stack>

                            {evalSteps.map((s, i) => {
                                const isLast = i === evalSteps.length - 1;
                                const stepColor = s.type === 'allow' ? ACCENT.green : s.type === 'check' ? ACCENT.amber : ACCENT.red;
                                const yesColor = s.type === 'allow' ? ACCENT.green : ACCENT.red;

                                return (
                                    <Box key={i}>
                                        {/* Connector */}
                                        <Stack alignItems="flex-start" sx={{ pl: '19px', py: '2px' }}>
                                            <Box sx={{ width: 2, height: 14, backgroundColor: theme.palette.divider }} />
                                            <Typography sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1, ml: '-4px' }}>▼</Typography>
                                        </Stack>

                                        {/* Decision card */}
                                        <Box
                                            onClick={() => setOpenEvalStep(s)}
                                            sx={{
                                                borderLeft: `4px solid ${stepColor}`,
                                                border: `1px solid ${alpha(stepColor, isDark ? 0.28 : 0.2)}`,
                                                borderLeftWidth: 4,
                                                borderRadius: '0 8px 8px 0',
                                                backgroundColor: alpha(stepColor, isDark ? 0.07 : 0.04),
                                                p: '10px 12px',
                                                cursor: 'pointer',
                                                transition: 'box-shadow 0.18s ease, background-color 0.18s ease',
                                                '&:hover': {
                                                    backgroundColor: alpha(stepColor, isDark ? 0.13 : 0.08),
                                                    boxShadow: `0 4px 16px ${alpha(stepColor, 0.2)}`,
                                                },
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" spacing={1.25} mb={1.25}>
                                                <Box sx={{
                                                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                                    backgroundColor: alpha(stepColor, 0.18),
                                                    border: `1.5px solid ${stepColor}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: stepColor, lineHeight: 1 }}>
                                                        {s.step}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3, flex: 1 }}>
                                                    {s.label}
                                                </Typography>
                                                <Typography variant="caption"
                                                    sx={{ color: alpha(stepColor, 0.6), fontSize: 9, flexShrink: 0, alignSelf: 'center' }}>
                                                    tap for details →
                                                </Typography>
                                            </Stack>

                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} sx={{ pl: '36px' }}>
                                                <Box sx={{
                                                    flex: 1,
                                                    backgroundColor: alpha(yesColor, isDark ? 0.14 : 0.09),
                                                    border: `1px solid ${alpha(yesColor, 0.45)}`,
                                                    borderRadius: 1.5, px: 1.25, py: 0.6,
                                                }}>
                                                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: yesColor, display: 'block', mb: 0.2, letterSpacing: '0.04em' }}>
                                                        ✓ YES
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: yesColor, lineHeight: 1.45, fontSize: 10 }}>
                                                        {s.yes}
                                                    </Typography>
                                                </Box>

                                                {s.no && (
                                                    <Box sx={{
                                                        flex: 1,
                                                        border: `1px dashed ${theme.palette.divider}`,
                                                        borderRadius: 1.5, px: 1.25, py: 0.6,
                                                    }}>
                                                        <Typography sx={{ fontSize: 9, fontWeight: 800, color: 'text.disabled', display: 'block', mb: 0.2, letterSpacing: '0.04em' }}>
                                                            ✗ NO
                                                        </Typography>
                                                        <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.45, fontSize: 10 }}>
                                                            {s.no}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Stack>
                                        </Box>

                                        {isLast && (
                                            <Stack alignItems="flex-start" sx={{ pl: '19px', pt: '4px' }}>
                                                <Box sx={{ width: 2, height: 10, backgroundColor: theme.palette.divider }} />
                                                <Box sx={{
                                                    px: 1.25, py: 0.4, borderRadius: 5, mt: '2px',
                                                    backgroundColor: alpha(ACCENT.red, 0.12),
                                                    border: `1px solid ${alpha(ACCENT.red, 0.4)}`,
                                                }}>
                                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: ACCENT.red }}>
                                                        ■ ACCESS DENIED
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>

                        <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary"
                                display="block" mb={1.5} sx={{ letterSpacing: '0.08em' }}>
                                CRITICAL RULES
                            </Typography>
                            <Stack spacing={1}>
                                {[
                                    { icon: "🚫", title: "Explicit DENY always wins", body: "Even if 10 other policies allow it — one explicit deny cancels everything." },
                                    { icon: "🏢", title: "SCPs are a ceiling, not a floor", body: "SCPs limit max permissions in AWS Orgs. They don't grant permissions by themselves." },
                                    { icon: "🔒", title: "Permission Boundaries — limits, not grants", body: "A boundary restricts what an identity policy CAN grant. It never grants access on its own." },
                                    { icon: "🔄", title: "Same vs Cross-Account", body: "Same account: identity OR resource policy = allow. Cross-account: BOTH required." },
                                    { icon: "🛡️", title: "Session policies", body: "Limit what a federated/assumed-role session can do — most restrictive of identity+session wins." },
                                ].map((r, i) => (
                                    <Card key={i} sx={{ borderRadius: 2 }}>
                                        <CardContent sx={{ py: '10px !important', px: '12px !important' }}>
                                            <Typography variant="body2" fontWeight={600} mb={0.5}>{r.icon} {r.title}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>{r.body}</Typography>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Stack>
                        </Box>
                    </Box>
                </>
            )}

            {/* ── STS APIS TAB ── */}
            {tab === "sts" && (
                <>
                    <Typography variant="caption" color="text.disabled"
                        sx={{ letterSpacing: '0.08em', display: 'block', mb: 2 }}>
                        STS = SECURITY TOKEN SERVICE — ISSUES TEMPORARY CREDENTIALS
                    </Typography>
                    <Stack spacing={1.5} mb={2}>
                        {stsApis.map((api, i) => (
                            <Card key={i} sx={{ borderRadius: 3, border: `1px solid ${alpha(api.color, 0.35)}` }}>
                                <CardContent>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={700} sx={{ color: api.color, mb: 0.25 }}>
                                                {api.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                WHO CALLS IT: <span style={{ color: theme.palette.text.primary }}>{api.who}</span>
                                            </Typography>
                                        </Box>
                                        <Box sx={{
                                            backgroundColor: alpha(api.color, 0.08),
                                            border: `1px solid ${alpha(api.color, 0.25)}`,
                                            borderRadius: 2, p: 1.5, flex: 1, maxWidth: { sm: 420 }
                                        }}>
                                            <Typography variant="caption" color="text.disabled" display="block" mb={0.5} sx={{ letterSpacing: '0.06em' }}>
                                                MARKETPLACE USE CASE
                                            </Typography>
                                            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{api.useCase}</Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>

                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="body2" fontWeight={700} mb={1.5} sx={{ color: ACCENT.amber }}>
                                🔑 Role Trust Policy — Who Can Assume the Role?
                            </Typography>
                            <Box component="pre" sx={{
                                fontSize: 11, color: '#86efac',
                                backgroundColor: codeBg, p: 1.5, borderRadius: 2,
                                overflowX: 'auto', lineHeight: 1.7, m: 0,
                                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                            }}>
                                {`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::MARKETPLACE-ACCT:role/Marketplace-DeploymentAgent-Role"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "sts:ExternalId": "marketplace-deploy-secret-token-xyz"
      }
    }
  }]
}`}
                            </Box>
                            <Typography variant="caption" color="text.secondary" mt={1} display="block">
                                For services: Principal would be{" "}
                                <span style={{ color: ACCENT.teal }}>"Service": "ec2.amazonaws.com"</span>
                                {" "}or{" "}
                                <span style={{ color: ACCENT.teal }}>"lambda.amazonaws.com"</span>
                            </Typography>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── KEY NUMBERS TAB ── */}
            {tab === "numbers" && (
                <>
                    <Typography variant="caption" color="text.disabled"
                        sx={{ letterSpacing: '0.08em', display: 'block', mb: 2 }}>
                        MEMORIZE THESE — THEY APPEAR DIRECTLY IN EXAM QUESTIONS
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 1.5, mb: 3 }}>
                        {keyNumbers.map((k, i) => (
                            <Card key={i} sx={{ borderRadius: 3, border: `1px solid ${alpha(k.color, 0.35)}`, textAlign: 'center' }}>
                                <CardContent sx={{ py: '14px !important' }}>
                                    <Typography variant="h5" fontWeight={700}
                                        sx={{ color: k.color, letterSpacing: '-0.5px', mb: 0.25 }}>
                                        {k.num}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>{k.label}</Typography>
                                    <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.5 }}>{k.note}</Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>

                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="body2" fontWeight={700} mb={1.5} sx={{ color: ACCENT.amber }}>
                                🔍 Audit Tools — Know Which Tool For Which Job
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                                {[
                                    { icon: "🧪", name: "IAM Policy Simulator", use: "Test policies BEFORE deploying. Confirm allow/deny for any principal+action combination." },
                                    { icon: "📊", name: "Credential Report", use: "CSV of all users + credential ages, last login, MFA status. Generate once per 4 hours." },
                                    { icon: "🎭", name: "Access Advisor", use: "Shows last service access time per user/role. Remove unused permissions = least privilege." },
                                    { icon: "🔍", name: "Access Analyzer", use: "Finds resources shared externally (cross-account or public). Flags overly-permissive policies." },
                                ].map((t, i) => (
                                    <Stack key={i} direction="row" gap={1.5} alignItems="flex-start"
                                        sx={{ backgroundColor: subBg, borderRadius: 2, p: 1.5 }}>
                                        <Typography fontSize={22} flexShrink={0}>{t.icon}</Typography>
                                        <Box>
                                            <Typography variant="body2" fontWeight={700} mb={0.5}>{t.name}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>{t.use}</Typography>
                                        </Box>
                                    </Stack>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ── Scenario modal ── */}
            {openScenario && (
                <ScenarioModal scenario={openScenario} onClose={() => setOpenScenario(null)} />
            )}

            {/* ── Eval step detail modal ── */}
            {openEvalStep && (
                <EvalStepModal step={openEvalStep} onClose={() => setOpenEvalStep(null)} />
            )}
        </Box>
    );
}
