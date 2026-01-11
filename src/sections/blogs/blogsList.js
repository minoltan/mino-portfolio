import { Box, Card, CardContent, CardMedia, Grid, Typography, Button, useTheme, Stack } from "@mui/material";
import content from '../../data/profile.json';

const BlogsList = ({ selectedCategory, selectedSubCategory = 'All' }) => {
    const theme = useTheme();

    const filteredBlogs = content.blogs.filter(blog => {
        const categoryMatch = selectedCategory === 'All' || blog.category === selectedCategory;

        if (selectedCategory === 'AWS' && selectedSubCategory !== 'All') {
            return categoryMatch && blog.sub_category && blog.sub_category.includes(selectedSubCategory);
        }

        return categoryMatch;
    });

    return (
        <Box className="layoutMarginX" sx={{ py: 8 }}>
            <Grid container spacing={2}>
                {filteredBlogs.map((blog, index) => (
                    <Grid size={{ xs: 12, sm: 4, md: 4, lg: 4 }} key={index}>
                        <Card
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 4,
                                boxShadow: theme.shadows[2],
                                transition: 'transform 0.3s ease-in-out',
                                '&:hover': {
                                    transform: 'scale(1.02)',
                                    boxShadow: theme.shadows[6]
                                }
                            }}
                        >
                            <CardMedia
                                component="img"
                                height="300"
                                image={`${process.env.PUBLIC_URL}/${blog.thumbnail}`}
                                alt={blog.title}
                            />
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Typography gutterBottom variant="h5" component="div" fontWeight={600}>
                                    {blog.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" mb={2}>
                                    {blog.date}
                                </Typography>
                                <Typography variant="body2" color="text.primary">
                                    {blog.description}
                                </Typography>
                            </CardContent>
                            <Box sx={{ p: 2 }}>
                                <Button
                                    size="small"
                                    variant="contained"
                                    href={blog.link}
                                    target="_blank"
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none'
                                    }}
                                >
                                    Read More
                                </Button>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}

export default BlogsList;
