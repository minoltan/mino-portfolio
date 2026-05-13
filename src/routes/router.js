import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import Layout from "../layouts/layout";
import LandingPage from "../pages/landingPage";

const NotFound = lazy(() => import("../pages/notFound"));
const ProjectsPage = lazy(() => import("../pages/projects"));
const ProjectDetailsPage = lazy(() => import("../pages/projectDetails"));
const BlogsPage = lazy(() => import("../pages/blogs"));
const AwsExamPage = lazy(() => import("../pages/awsExam"));
const MediumPage = lazy(() => import("../pages/medium"));

const Router = () => {
    return (
        <Suspense fallback={null}>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<LandingPage />} />
                    <Route path="project" element={<ProjectsPage />} />
                    <Route path="project/:area/:id" element={<ProjectDetailsPage />} />
                    <Route path="blogs" element={<BlogsPage />} />
                    <Route path="aws-exam" element={<AwsExamPage />} />
                    <Route path="medium" element={<MediumPage />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </Suspense>
    );
}

export default Router;
