import { Box, Grid, Stack, Typography, useTheme, alpha, Chip } from "@mui/material";
import { LaptopMac, Article, Code, ChatBubble } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { TypeAnimation } from "react-type-animation";
import content from '../../data/profile.json';

const BlogsHero = ({ selectedCategory, setSelectedCategory, selectedSubCategory, setSelectedSubCategory }) => {
    const { t } = useTranslation();
    const theme = useTheme();

    const subCategories = ['All', 'Hot News', 'SAA C3 Exam', 'Cloud Practitioner Exam', 'AI', 'Use Cases'];

    return (
        <Box
            sx={{
                backgroundColor: theme.palette.secondary.main,
                pt: { xs: 10, md: 15 },
                pb: { xs: 5, md: 10 }
            }}
        >
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
                        <Typography
                            variant="h2"
                            fontWeight={700}
                            textAlign={{ xs: 'center', md: 'left' }}
                        >
                            My <span style={{ color: theme.palette.primary.main }}>Blogs</span>
                        </Typography>

                        <Typography
                            variant="body1"
                            textAlign={{ xs: 'center', md: 'left' }}
                            color="text.secondary"
                            sx={{ maxWidth: '600px' }}
                        >
                            Sharing my thoughts, experiences, and knowledge about software engineering, game development, and technology trends.
                        </Typography>

                        <Stack direction="row" spacing={1} mt={2}>
                            {['All', 'AWS', 'ML/AI', 'Other'].map((category, index) => (
                                <Chip
                                    key={index}
                                    label={category}
                                    variant={selectedCategory === category ? "filled" : "outlined"}
                                    color="primary"
                                    onClick={() => setSelectedCategory(category)}
                                    sx={{
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </Stack>

                        {selectedCategory === 'AWS' && (
                            <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" rowGap={1}>
                                {subCategories.map((subCategory, index) => (
                                    <Chip
                                        key={index}
                                        label={subCategory}
                                        variant={selectedSubCategory === subCategory ? "filled" : "outlined"}
                                        color="secondary"
                                        onClick={() => setSelectedSubCategory(subCategory)}
                                        sx={{
                                            fontWeight: 400,
                                            cursor: 'pointer',
                                            height: '28px',
                                            border: selectedSubCategory === subCategory ? 'none' : `1px solid ${theme.palette.text.secondary}`,
                                            color: selectedSubCategory === subCategory ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                                            backgroundColor: selectedSubCategory === subCategory ? theme.palette.text.primary : 'transparent',
                                            '&:hover': {
                                                backgroundColor: selectedSubCategory === subCategory ? theme.palette.text.primary : alpha(theme.palette.text.primary, 0.1),
                                            }
                                        }}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Box
                        sx={{
                            position: 'relative',
                            height: '300px',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        {/* Abstract Background Shapes */}
                        <Box
                            sx={{
                                position: 'absolute',
                                width: '200px',
                                height: '200px',
                                borderRadius: '50%',
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                top: '10%',
                                right: '20%',
                                zIndex: 0
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                width: '150px',
                                height: '150px',
                                borderRadius: '50%',
                                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                                bottom: '10%',
                                left: '20%',
                                zIndex: 0
                            }}
                        />

                        {/* Main Icon */}
                        <LaptopMac
                            sx={{
                                fontSize: '200px',
                                color: theme.palette.primary.main,
                                zIndex: 1,
                                filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.15))'
                            }}
                        />

                        {/* Floating Icons */}
                        <Article
                            sx={{
                                position: 'absolute',
                                fontSize: '50px',
                                color: theme.palette.text.secondary,
                                top: '20%',
                                left: '15%',
                                animation: 'float 3s ease-in-out infinite'
                            }}
                        />
                        <Code
                            sx={{
                                position: 'absolute',
                                fontSize: '50px',
                                color: theme.palette.text.secondary,
                                bottom: '20%',
                                right: '15%',
                                animation: 'float 4s ease-in-out infinite',
                                animationDelay: '1s'
                            }}
                        />
                        <ChatBubble
                            sx={{
                                position: 'absolute',
                                fontSize: '40px',
                                color: theme.palette.primary.light,
                                top: '10%',
                                right: '30%',
                                animation: 'float 3.5s ease-in-out infinite',
                                animationDelay: '0.5s'
                            }}
                        />

                        <style>
                            {`
                                @keyframes float {
                                    0% { transform: translateY(0px); }
                                    50% { transform: translateY(-15px); }
                                    100% { transform: translateY(0px); }
                                }
                            `}
                        </style>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}

export default BlogsHero;
