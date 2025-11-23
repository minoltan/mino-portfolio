import { useState } from "react";
import { Helmet } from "react-helmet";
import TopNavigationLayout from "../sections/topNavigation/topNavigationLayout";
import BlogsHero from "../sections/blogs/blogsHero";
import BlogsList from "../sections/blogs/blogsList";
import SpeedScroll from "../components/speedScroll";

const BlogsPage = () => {
    const [selectedCategory, setSelectedCategory] = useState('All');

    return (
        <>
            <Helmet>
                <title>Blogs</title>
            </Helmet>

            <TopNavigationLayout />

            <BlogsHero
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
            />

            <BlogsList selectedCategory={selectedCategory} />

            <SpeedScroll />
        </>
    );
}

export default BlogsPage;
