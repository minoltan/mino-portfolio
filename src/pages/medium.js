import { useState } from "react";
import { Helmet } from "react-helmet";
import TopNavigationLayout from "../sections/topNavigation/topNavigationLayout";
import MediumHero from "../sections/medium/mediumHero";
import MediumStatsOverview from "../sections/medium/mediumStatsOverview";
import MediumCharts from "../sections/medium/mediumCharts";
import MediumRecommendations from "../sections/medium/mediumRecommendations";
import MediumEarnings from "../sections/medium/mediumEarnings";
import MediumArticleDrawer from "../sections/medium/mediumArticleDrawer";
import SpeedScroll from "../components/speedScroll";
import useArticleStats from "../utils/useArticleStats";

const MediumPage = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { aggregates } = useArticleStats();

    return (
        <>
            <Helmet>
                <title>Medium Stats</title>
            </Helmet>

            <TopNavigationLayout />
            <MediumHero onViewArticles={() => setDrawerOpen(true)} />
            <MediumStatsOverview
                onViewArticles={() => setDrawerOpen(true)}
                aggregates={aggregates}
            />
            <MediumCharts />
            <MediumEarnings />
            <MediumRecommendations />
            <MediumArticleDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
            <SpeedScroll />
        </>
    );
};

export default MediumPage;
