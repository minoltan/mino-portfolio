import { Stack, useTheme } from "@mui/material";
import './heroGallery.css';
import HeroCard from "./heroCard";
import { useTranslation } from "react-i18next";
import content from '../../data/profile.json';

const HeroGallery = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const heroLocale = "hero";

    const isLightMode = theme.palette.mode === 'light';
    const tertiaryImg = isLightMode
        ? content.hero.tech_stacks.tertiary_light
        : content.hero.tech_stacks.tertiary;

    return (
        <>
            <Stack
                className='layoutMarginX'
                position='relative'
            >
                {/* Tech stack 01 */}
                <img
                    src={`${process.env.PUBLIC_URL}/${content.hero.tech_stacks.primary}`}
                    alt="Tech stack"
                    className="techStackOne"
                />

                {/* Tech stack 02 */}
                <img
                    src={`${process.env.PUBLIC_URL}/${content.hero.tech_stacks.secondary}`}
                    alt="Tech stack"
                    className="techStackTwo"
                />

                {/* Tech stack 03 */}
                <img
                    src={`${process.env.PUBLIC_URL}/${tertiaryImg}`}
                    alt="Tech stack"
                    className="techStackThree"

                />

                {/* My Image */}
                <img
                    src={`${process.env.PUBLIC_URL}/${content.my_images.hero_section}`}
                    alt="My image"
                    style={{
                        width: '100%'
                    }}
                />

                {/* Degree */}
                <HeroCard
                    logo={`${process.env.PUBLIC_URL}/images/icons/graduation.png`}
                    label={t(`${heroLocale}.degree`)}
                    value={content.hero.degree}
                    cardSX={{
                        position: 'absolute',
                        right: '10%',
                        top: '50%'
                    }}
                />

                {/* Job Role */}
                <HeroCard
                    logo={`${process.env.PUBLIC_URL}/images/icons/role-model.png`}
                    label={t(`${heroLocale}.job_role`)}
                    value={content.hero.job_role}
                    cardSX={{
                        position: 'absolute',
                        bottom: -35,
                        left: '10%',
                    }}
                />
            </Stack>
        </>
    );
}

export default HeroGallery;