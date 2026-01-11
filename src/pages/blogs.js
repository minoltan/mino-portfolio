import { useState } from "react";
import { Helmet } from "react-helmet";
import TopNavigationLayout from "../sections/topNavigation/topNavigationLayout";
import BlogsHero from "../sections/blogs/blogsHero";
import BlogsList from "../sections/blogs/blogsList";
import SpeedScroll from "../components/speedScroll";

const BlogsPage = () => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSubCategory, setSelectedSubCategory] = useState('All');

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        setSelectedSubCategory('All');
    };

    return (
        <>
            <Helmet>
                <title>Blogs</title>
            </Helmet>

            <TopNavigationLayout />

            <BlogsHero
                selectedCategory={selectedCategory}
                setSelectedCategory={handleCategoryChange}
                selectedSubCategory={selectedSubCategory}
                setSelectedSubCategory={setSelectedSubCategory}
            />

            <BlogsList
                selectedCategory={selectedCategory}
                selectedSubCategory={selectedSubCategory}
            />

            <SpeedScroll />
        </>
    );
}

export default BlogsPage;
