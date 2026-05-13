const mediumStats = {
    profile: {
        name: "Minoltan Issack",
        url: "https://medium.com/@issackpaul95",
        memberSince: "March 2018",
        bio: "Senior Software Engineer | AWS Community Builder | Cloud & Serverless enthusiast. Writing about AWS, Serverless architectures, and AI/ML fundamentals.",
    },
    overview: {
        followers: 250,
        subscribers: 160,
        monthlyViews: 10000,
        monthlyReads: 1000,
        publishedPosts: 270,
        draftPosts: 22,
        clapsGiven: 5270,           // claps Minoltan gave to other articles (from export)
        clapsGivenArticles: 117,    // number of other articles clapped on
        activeMonths: 10,
    },
    postsByYear: [
        { year: "2020", count: 20 },
        { year: "2022", count: 5 },
        { year: "2025", count: 127 },
        { year: "2026", count: 118 },
    ],
    postsByCategory: [
        { category: "AWS", count: 219, color: "#FF9900" },
        { category: "Other", count: 26, color: "#78909C" },
        { category: "Azure", count: 10, color: "#0078D4" },
        { category: "AI/ML", count: 5, color: "#7B1FA2" },
        { category: "Programming", count: 5, color: "#00897B" },
        { category: "Java", count: 4, color: "#E53935" },
        { category: "Docker/K8s", count: 1, color: "#1565C0" },
    ],
    // Monthly publishing trend (active months only, last 14 months)
    monthlyTrend: [
        { month: "May '25", posts: 21 },
        { month: "Jun '25", posts: 12 },
        { month: "Jul '25", posts: 18 },
        { month: "Aug '25", posts: 6 },
        { month: "Sep '25", posts: 13 },
        { month: "Oct '25", posts: 26 },
        { month: "Nov '25", posts: 15 },
        { month: "Dec '25", posts: 15 },
        { month: "Jan '26", posts: 21 },
        { month: "Feb '26", posts: 25 },
        { month: "Mar '26", posts: 34 },
        { month: "Apr '26", posts: 32 },
        { month: "May '26", posts: 6 },
    ],
    growthMetrics: {
        viewsReadRatio: 10,     // 10K views / 1K reads = 10% read rate
        avgPostsPerMonth: 24,   // ~270 posts / ~11 active months
    },
    recommendations: [
        {
            id: 1,
            priority: "High",
            category: "Content Strategy",
            title: "Diversify Beyond AWS — Add AI/ML Series",
            detail:
                "You have only 5 AI/ML posts but the demand for AI content is at an all-time high. A weekly 'AI for Cloud Engineers' series bridging AWS services (SageMaker, Bedrock) with LLM fundamentals would attract a new readership segment and align with your portfolio.",
            impact: "Could double monthly views within 3 months",
            action: "Publish 1 AI/ML post per week targeting AWS Bedrock, Claude API, or LangChain on AWS.",
        },
        {
            id: 2,
            priority: "High",
            category: "Reader Retention",
            title: "Improve 10% Read-Through Rate",
            detail:
                "Your 10K views vs 1K reads means 90% of visitors leave without finishing. Stronger article hooks (first 2 sentences must answer 'why should I read this?'), subheadings every 200 words, and code snippets with real outputs will increase read completion significantly.",
            impact: "Improving to 20% read rate = 2K reads/month without new posts",
            action: "Audit your top 5 most-viewed posts and rewrite the introduction and add pull-quotes/callouts.",
        },
        {
            id: 3,
            priority: "High",
            category: "Monetization",
            title: "Join Medium Partner Program",
            detail:
                "With 250+ followers, 10K monthly views, and consistent publishing history, you meet all eligibility requirements. Medium Partner Program pays based on member read time. Your AWS exam prep content (consistently high read intent) is ideal for monetisation.",
            impact: "Estimated $50–$200/month initially, scaling with follower growth",
            action: "Apply at medium.com/creator-program. Tag all posts with 'AWS', 'Cloud Computing', and 'Software Engineering'.",
        },
        {
            id: 4,
            priority: "Medium",
            category: "Audience Growth",
            title: "Convert GitHub & Portfolio Visitors to Followers",
            detail:
                "Your portfolio site gets traffic but Medium isn't prominently linked. Add a 'Latest Articles' widget on your landing page and include your Medium profile link in every project's README on GitHub. Cross-promotion from your existing audience is free growth.",
            impact: "Can add 30–50 new followers per month from existing traffic",
            action: "Add a 'Latest on Medium' section to your portfolio homepage with 3 recent post cards.",
        },
        {
            id: 5,
            priority: "Medium",
            category: "SEO & Discovery",
            title: "Optimise Tags for Search Discovery",
            detail:
                "Medium's internal discovery algorithm heavily weights tags. Use all 5 allowed tags per post: combine specific (e.g., 'AWS SAA-C03') with broad popular tags ('Cloud Computing', 'AWS', 'DevOps', 'Software Engineering'). This increases your posts' chance of appearing in curated topics.",
            impact: "15–25% increase in organic views per post",
            action: "Go back and re-tag your 20 most popular posts with the optimal 5-tag strategy.",
        },
        {
            id: 6,
            priority: "Medium",
            category: "Publishing Cadence",
            title: "Maintain Consistent Publishing Rhythm",
            detail:
                "Your publishing surged to 34 posts in March and 32 in April but dropped to 6 in May. Irregular bursts hurt subscriber retention. The algorithm rewards consistent publishers. Aim for 4–6 posts per week rather than marathon weeks followed by quiet periods.",
            impact: "Consistent creators see 40% higher follower growth rate",
            action: "Schedule posts using Medium's draft queue — write in batches, publish on a schedule.",
        },
        {
            id: 7,
            priority: "Low",
            category: "Content Format",
            title: "Create Listicle and Cheatsheet Posts",
            detail:
                "Your exam-prep content is scenario-based, which is great but requires deep reading. Complement these with '10 AWS Services Every Developer Must Know' or 'AWS SAA-C03 Cheatsheet' style posts. These get shared heavily on LinkedIn and Twitter, driving top-of-funnel discovery.",
            impact: "Shareable content can generate 3–5x normal views per post",
            action: "Create one 'ultimate cheatsheet' post per major AWS topic you've already covered.",
        },
    ],
};

export default mediumStats;
