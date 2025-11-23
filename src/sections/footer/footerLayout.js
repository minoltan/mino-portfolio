import { Box, Container, Grid, Typography, Link, Stack, IconButton, useTheme } from "@mui/material";
import { ArrowUpward } from "@mui/icons-material";
import ConnectWithMeLogos from "../connectWithMe/connectWithMeLogos";

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
                <Grid sx={{
                    borderTop: '0px solid rgba(255,255,255,0.1)',
                    mt: 5,
                    pt: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'left',
                    flexWrap: 'wrap'
                }}>

                    {/* Row 1: Brand & Quick Links */}
                    <Grid item xs={6} md={10}>
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

                    <Grid item xs={6} md={2}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Click Quick Links
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


                </Grid>

                <Grid sx={{
                    borderTop: '0px solid rgba(255,255,255,0.1)',
                    mt: 5,
                    pt: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'left',
                    flexWrap: 'wrap'
                }}>

                    {/* Row 2: Connect & AWS Skill Builder */}
                    <Grid item xs={12} md={10}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Connect
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 2 }}>
                            Feel free to reach out for collaborations or just a friendly hello.
                        </Typography>
                        <Stack direction="row" justifyContent="start" alignItems="center">
                            <ConnectWithMeLogos />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={2}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            AWS Skill Builder
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Box
                                component="img"
                                src={`${process.env.PUBLIC_URL}/images/connect me/aws-skill-builder.png`}
                                alt="AWS Skill Builder QR"
                                sx={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: 1,
                                    border: '2px solid white'
                                }}
                            />
                        </Box>
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