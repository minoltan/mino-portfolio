import { Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ButtonComponent from "../../components/buttonComponent";
import content from '../../data/profile.json';
import AOS from 'aos';
import 'aos/dist/aos.css';
import ConnectWithMeLogos from "../connectWithMe/connectWithMeLogos";
import './heroGallery.css'; // Import the CSS

const HeroWelcome = () => {
    const { t } = useTranslation();
    const heroLocale = "hero";
    const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

    useEffect(() => {
        AOS.init({ duration: 1000 });
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentRoleIndex((prevIndex) => (prevIndex + 1) % content.hero.job_roles.length);
        }, 4000); // Change role every 4 seconds (3.5s animation + buffer)

        return () => clearInterval(interval);
    }, []);

    const hireMe = useCallback(() => {
        window.location.href = content.hire_me;
    }, []);

    return (
        <>
            <Stack
                direction='column'
                alignItems='start'
                textAlign='left'
                justifyContent='center'
                className='layoutMarginX layoutPaddingX'
                pt={{ xs: 10, md: 5 }}
            >
                {/* Welcome */}
                <Typography
                    fontWeight={500}
                    fontSize={{ xs: 18, md: 20, lg: 24 }}
                    lineHeight={1}
                    pb={{ xs: 1, md: 1, lg: 1 }}
                    data-aos="fade-up"
                >
                    {t(`${heroLocale}.welcome`)}
                </Typography>

                {/* Name */}
                <Typography
                    fontWeight={800}
                    fontSize={{ xs: 40, md: 50, lg: 80 }}
                    lineHeight={1}
                    pb={{ xs: 1, md: 1, lg: 1 }}
                    data-aos="slide-right"
                >
                    {content.hero.name}
                </Typography>

                {/* Job Role */}
                <div className="typewriter">
                    <Typography
                        component="h1"
                        fontWeight={600}
                        fontSize={{ xs: 20, md: 24, lg: 30 }}
                        lineHeight={1}
                        pb={{ xs: 2, md: 2, lg: 3 }}
                        color="text.secondary"
                        key={currentRoleIndex} // Key change triggers re-render and animation restart
                    >
                        {content.hero.job_roles[currentRoleIndex]}
                    </Typography>
                </div>

                {/* Description */}
                {/* <Typography
                        color="#222222"
                        fontWeight={300}
                        fontSize={{ xs: 14, md: 12, lg: 14 }}
                        lineHeight={2}
                        textAlign='justify'
                    >
                        {content.hero.about}
                    </Typography> */}

                {/* Hire Me */}
                <ButtonComponent
                    label={t(`${heroLocale}.hireMe`)}
                    onClick={hireMe}
                    sx={{
                        mt: { xs: 2, md: 2, lg: 5 },
                        mb: { xs: 2, md: 2, lg: 2 }
                    }}
                />

                {/* Connect Logos */}
                <ConnectWithMeLogos
                    sx={{
                        mt: { xs: 5, md: 10, lg: 2 },
                        mb: { xs: 5, md: 5, lg: 5 },
                        width: 'auto'
                    }}
                />
            </Stack>
        </>
    );
}

export default HeroWelcome;