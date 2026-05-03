import { useState } from "react";
import { Box, Card, CardContent, Chip, Collapse, Grid, Stack, Typography, Button, useTheme, alpha, Badge, Divider } from "@mui/material";
import { Cloud, School, WorkspacePremium, EmojiEvents, CheckCircleOutline, KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import { Helmet } from "react-helmet";
import TopNavigationLayout from "../sections/topNavigation/topNavigationLayout";
import SpeedScroll from "../components/speedScroll";
import content from "../data/profile.json";
import IamScenariosSection from "../sections/awsExam/iamScenariosSection";
import ec2Scenarios from "../data/aws-exam/ec2/scenarios";
import ec2Matrices from "../data/aws-exam/ec2/matrices";

const EXAM_CATEGORIES = ['All', 'SAA-C03', 'Cloud Practitioner'];
const TOPIC_SCENARIO_IDS = new Set([1, 2]);

const renderTopicScenarioMap = (topicId) => {
    if (topicId === 2) {
        return (
            <IamScenariosSection
                hideHeader
                title="EC2"
                scenarios={ec2Scenarios}
                matrices={ec2Matrices}
                showStudyTabs={false}
            />
        );
    }

    return <IamScenariosSection hideHeader />;
};

const SaaCTopicsList = () => {
    const theme = useTheme();
    const [expandedTopicId, setExpandedTopicId] = useState(null);
    const topics = content.aws_exam?.saa_c03?.topics ?? [];

    if (topics.length === 0) return null;

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                <Typography variant="h5" fontWeight={700}>
                    SAA-C03 <span style={{ color: theme.palette.primary.main }}>Study Topics</span>
                </Typography>
                <Chip
                    label={`${topics.length} topic${topics.length !== 1 ? 's' : ''}`}
                    size="small" color="primary" variant="outlined"
                />
            </Stack>

            <Stack spacing={2}>
                {topics.map((topic) => {
                    const isExpanded = expandedTopicId === topic.id;
                    const hasScenarioMap = TOPIC_SCENARIO_IDS.has(topic.id);
                    const isClickable = hasScenarioMap && !topic.blog_link;

                    return (
                        <Card
                            key={topic.id}
                            onClick={isClickable ? () => setExpandedTopicId(isExpanded ? null : topic.id) : undefined}
                            sx={{
                                borderRadius: 3,
                                cursor: isClickable ? 'pointer' : 'default',
                                border: `1px solid ${isExpanded
                                    ? theme.palette.primary.main
                                    : alpha(theme.palette.primary.main, 0.15)}`,
                                boxShadow: isExpanded ? theme.shadows[6] : theme.shadows[1],
                                transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                                '&:hover': isClickable ? { boxShadow: theme.shadows[5] } : {},
                            }}
                        >
                            <CardContent>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    justifyContent="space-between"
                                    spacing={1}
                                    mb={1}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                        <Box sx={{
                                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                            backgroundColor: isExpanded
                                                ? theme.palette.primary.main
                                                : alpha(theme.palette.primary.main, 0.12),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'background-color 0.25s ease',
                                        }}>
                                            <Typography variant="body2" fontWeight={700}
                                                sx={{ color: isExpanded ? '#fff' : theme.palette.primary.main }}>
                                                {String(topic.id).padStart(2, '0')}
                                            </Typography>
                                        </Box>
                                        <Typography variant="h6" fontWeight={600}>{topic.title}</Typography>
                                    </Stack>

                                    {topic.blog_link ? (
                                        <Button
                                            size="small" variant="contained"
                                            href={topic.blog_link} target="_blank"
                                            onClick={e => e.stopPropagation()}
                                            sx={{ borderRadius: 2, textTransform: 'none', flexShrink: 0 }}
                                        >
                                            Read Blog
                                        </Button>
                                    ) : hasScenarioMap ? (
                                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                                            <Typography variant="caption" fontWeight={600} color="primary">
                                                {isExpanded ? "Hide map" : "Scenario Map"}
                                            </Typography>
                                            {isExpanded
                                                ? <KeyboardArrowUp fontSize="small" color="primary" />
                                                : <KeyboardArrowDown fontSize="small" color="primary" />
                                            }
                                        </Stack>
                                    ) : (
                                        <Chip label="Coming Soon" size="small" variant="outlined"
                                            sx={{ color: 'text.secondary', borderColor: 'divider', flexShrink: 0 }} />
                                    )}
                                </Stack>

                                <Typography variant="body2" color="text.secondary" mb={2} sx={{ pl: { sm: 6.5 } }}>
                                    {topic.description}
                                </Typography>

                                <Divider sx={{ mb: 1.5 }} />

                                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ pl: { sm: 6.5 } }}>
                                    {topic.key_topics.map((item, i) => (
                                        <Stack key={i} direction="row" alignItems="center" spacing={0.5}>
                                            <CheckCircleOutline sx={{ fontSize: 14, color: theme.palette.primary.main }} />
                                            <Typography variant="caption" color="text.secondary">{item}</Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </CardContent>

                            {/* Inline expanded scenario map */}
                            {hasScenarioMap && (
                                <Collapse in={isExpanded} timeout={350}>
                                    <Box onClick={e => e.stopPropagation()} sx={{
                                        borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                        backgroundColor: theme.palette.mode === 'dark'
                                            ? alpha('#000', 0.18)
                                            : alpha(theme.palette.primary.main, 0.025),
                                        px: { xs: 2, md: 3 },
                                        pt: 3,
                                        pb: 3,
                                    }}>
                                        {renderTopicScenarioMap(topic.id)}
                                    </Box>
                                </Collapse>
                            )}
                        </Card>
                    );
                })}
            </Stack>
        </Box>
    );
};

const AwsExamPage = () => {
    const theme = useTheme();
    const [selectedExam, setSelectedExam] = useState('All');

    return (
        <>
            <Helmet>
                <title>AWS Exam Prep</title>
            </Helmet>

            <TopNavigationLayout />

            {/* Hero Section */}
            <Box sx={{ backgroundColor: theme.palette.secondary.main, pt: { xs: 10, md: 15 }, pb: { xs: 5, md: 10 } }}>
                <Grid
                    container
                    direction={{ xs: 'column-reverse', md: 'row' }}
                    justifyContent='center'
                    alignItems='center'
                    className="layoutMarginX"
                >
                    <Grid item xs={12} md={7}>
                        <Stack
                            direction='column'
                            justifyContent='center'
                            alignItems={{ xs: 'center', md: 'flex-start' }}
                            spacing={2}
                        >
                            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                                <Typography variant="h2" fontWeight={700} textAlign={{ xs: 'center', md: 'left' }}>
                                    AWS <span style={{ color: theme.palette.primary.main }}>Exam</span> Prep
                                </Typography>
                                <Badge
                                    badgeContent="🔥 Hot"
                                    sx={{
                                        '& .MuiBadge-badge': {
                                            backgroundColor: theme.palette.error.main,
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                            px: 1,
                                            borderRadius: 1,
                                            position: 'relative',
                                            transform: 'none',
                                            mt: { xs: 0, md: 1 }
                                        }
                                    }}
                                />
                            </Stack>

                            <Typography
                                variant="body1"
                                textAlign={{ xs: 'center', md: 'left' }}
                                color="text.secondary"
                                sx={{ maxWidth: '600px' }}
                            >
                                Curated exam preparation resources, practice questions, and study guides for
                                AWS certifications — from Cloud Practitioner to Solutions Architect.
                            </Typography>

                            <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" rowGap={1}>
                                {EXAM_CATEGORIES.map((exam, index) => (
                                    <Chip
                                        key={index}
                                        label={exam}
                                        variant={selectedExam === exam ? "filled" : "outlined"}
                                        color="primary"
                                        onClick={() => setSelectedExam(exam)}
                                        sx={{ fontWeight: 500, cursor: 'pointer' }}
                                    />
                                ))}
                            </Stack>
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <Box sx={{ position: 'relative', height: '300px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Box sx={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: alpha(theme.palette.primary.main, 0.1), top: '10%', right: '20%', zIndex: 0 }} />
                            <Box sx={{ position: 'absolute', width: '150px', height: '150px', borderRadius: '50%', backgroundColor: alpha(theme.palette.primary.main, 0.2), bottom: '10%', left: '20%', zIndex: 0 }} />
                            <Cloud sx={{ fontSize: '200px', color: theme.palette.primary.main, zIndex: 1, filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.15))' }} />
                            <School sx={{ position: 'absolute', fontSize: '50px', color: 'text.secondary', top: '20%', left: '15%', animation: 'float 3s ease-in-out infinite' }} />
                            <WorkspacePremium sx={{ position: 'absolute', fontSize: '50px', color: 'text.secondary', bottom: '20%', right: '15%', animation: 'float 4s ease-in-out infinite', animationDelay: '1s' }} />
                            <EmojiEvents sx={{ position: 'absolute', fontSize: '40px', color: 'primary.light', top: '10%', right: '30%', animation: 'float 3.5s ease-in-out infinite', animationDelay: '0.5s' }} />
                            <style>{`@keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-15px) } }`}</style>
                        </Box>
                    </Grid>
                </Grid>
            </Box>

            {/* Content Section */}
            <Box className="layoutMarginX" sx={{ py: 8 }}>
                {(selectedExam === 'SAA-C03' || selectedExam === 'All') && (
                    <SaaCTopicsList />
                )}

                {selectedExam === 'Cloud Practitioner' && (
                    <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
                        <Typography variant="h5" color="text.secondary" fontWeight={600}>
                            Cloud Practitioner content coming soon
                        </Typography>
                        <Typography variant="body2" color="text.disabled">
                            Check back for practice questions and study guides.
                        </Typography>
                    </Stack>
                )}
            </Box>

            <SpeedScroll />
        </>
    );
};

export default AwsExamPage;
