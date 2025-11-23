import { Box, Container, Grid, Typography, Link, Stack, IconButton, useTheme } from "@mui/material";
import { GitHub, Email, LinkedIn, ArrowUpward } from "@mui/icons-material";

const FooterLayout = () => {
    const theme = useTheme();

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <Box
            sx={{
                bgcolor: '#1a1a1a',
                color: 'white',
                py: 6,
                borderTop: `4px solid ${theme.palette.primary.main}`,
                mt: 'auto'
            }}
        >
            <Container maxWidth="lg" sx={{ bgcolor: 'transparent' }}>
                <Grid container spacing={4}>
                    {/* Brand Section */}
                    <Grid item xs={12} md={4}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: theme.palette.primary.main }}>
                            DIGITAL PORTFOLIO
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
                            Showcasing my journey, projects, and skills. Built with passion and modern web technologies.
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                            Version {process.env.REACT_APP_APP_VERSION || '1.0.0'}
                        </Typography>
                    </Grid>

                    {/* Quick Links */}
                    <Grid item xs={12} md={4}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Quick Links
                        </Typography>
                        <Stack spacing={1}>
                            {['Home', 'About', 'Projects', 'Experience'].map((text) => (
                                <Link
                                    key={text}
                                    href={`#${text.toLowerCase()}`} // Assuming section IDs match
                                    underline="none"
                                    sx={{
                                        color: '#b0b0b0',
                                        '&:hover': { color: theme.palette.primary.main, pl: 1 },
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    {text}
                                </Link>
                            ))}
                        </Stack>
                    </Grid>

                    {/* Connect Section */}
                    <Grid item xs={12} md={4}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Connect
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
                            Feel free to reach out for collaborations or just a friendly hello.
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <IconButton
                                component={Link}
                                href="https://github.com/prasanthse/digital-portfolio.git"
                                target="_blank"
                                sx={{
                                    color: 'white',
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    '&:hover': { bgcolor: theme.palette.primary.main }
                                }}
                            >
                                <GitHub />
                            </IconButton>
                            <IconButton
                                component={Link}
                                href="mailto:prasanth@techserw.com"
                                sx={{
                                    color: 'white',
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    '&:hover': { bgcolor: theme.palette.primary.main }
                                }}
                            >
                                <Email />
                            </IconButton>
                            {/* Placeholder for LinkedIn if not found, but adding it for completeness */}
                            <IconButton
                                component={Link}
                                href="#"
                                sx={{
                                    color: 'white',
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    '&:hover': { bgcolor: theme.palette.primary.main }
                                }}
                            >
                                <LinkedIn />
                            </IconButton>
                        </Stack>
                    </Grid>
                </Grid>

                {/* Copyright Bar */}
                <Box
                    sx={{
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        mt: 5,
                        pt: 3,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap'
                    }}
                >
                    <Typography variant="body2" sx={{ color: '#808080' }}>
                        © {new Date().getFullYear()} Minoltan Issack. All rights reserved.
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" sx={{ color: '#808080' }}>
                            Back to Top
                        </Typography>
                        <IconButton
                            onClick={scrollToTop}
                            size="small"
                            sx={{
                                color: theme.palette.primary.main,
                                border: `1px solid ${theme.palette.primary.main}`
                            }}
                        >
                            <ArrowUpward fontSize="small" />
                        </IconButton>
                    </Stack>
                </Box>
            </Container>
        </Box>
    );
}

export default FooterLayout;