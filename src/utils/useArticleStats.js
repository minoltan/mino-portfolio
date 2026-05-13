import { useState, useCallback } from "react";

const STORAGE_KEY = "medium_article_stats";

const load = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const save = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
};

// Returns { statsMap, setArticleStat, clearArticleStat, aggregates }
const useArticleStats = () => {
    const [statsMap, setStatsMap] = useState(load);

    const setArticleStat = useCallback((articleId, fields) => {
        setStatsMap(prev => {
            const next = { ...prev, [articleId]: { ...(prev[articleId] ?? {}), ...fields } };
            save(next);
            return next;
        });
    }, []);

    const clearArticleStat = useCallback((articleId) => {
        setStatsMap(prev => {
            const next = { ...prev };
            delete next[articleId];
            save(next);
            return next;
        });
    }, []);

    // Aggregate totals across all entered articles
    const aggregates = Object.values(statsMap).reduce(
        (acc, s) => ({
            totalViews:          acc.totalViews          + (Number(s.views)          || 0),
            totalReads:          acc.totalReads          + (Number(s.reads)          || 0),
            totalClaps:          acc.totalClaps          + (Number(s.claps)          || 0),
            totalMemberViews:    acc.totalMemberViews    + (Number(s.memberViews)    || 0),
            totalNonMemberViews: acc.totalNonMemberViews + (Number(s.nonMemberViews) || 0),
            totalMemberReads:    acc.totalMemberReads    + (Number(s.memberReads)    || 0),
            totalNonMemberReads: acc.totalNonMemberReads + (Number(s.nonMemberReads) || 0),
            filledCount:         acc.filledCount         + 1,
        }),
        { totalViews: 0, totalReads: 0, totalClaps: 0, totalMemberViews: 0, totalNonMemberViews: 0, totalMemberReads: 0, totalNonMemberReads: 0, filledCount: 0 }
    );

    return { statsMap, setArticleStat, clearArticleStat, aggregates };
};

export default useArticleStats;
