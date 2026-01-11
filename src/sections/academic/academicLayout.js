import { Stack, useTheme, useMediaQuery } from "@mui/material";
import { VerticalTimeline } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import TitleComponent from "../../components/titleComponent";
import { useTranslation } from "react-i18next";
import AcademicTimelineElement from "./academicTimelineElement";
import AcademicTimelineDescription from "./academicTimelineDescription";
import content from '../../data/profile.json';

const AcademicLayout = () => {
    const { t } = useTranslation();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <>
            <div className="layoutPaddingTop"></div>

            <Stack
                pt={{ xs: 5, md: 10 }}
                pb={5}
                className="layoutMarginX"
                borderRadius={8}
                sx={{
                    backgroundColor: theme.components.MuiContainer.styleOverrides.root.backgroundColor
                }}
            >
                <TitleComponent
                    title={t('academic')}
                    richText={true}
                    px={1}
                />

                <Stack
                    mt={{ xs: 0, md: 5 }}
                >
                    {
                        isMobile ?
                            <Stack spacing={3} px={2}>
                                {
                                    content.academic.map((item, index) => (
                                        <AcademicTimelineDescription
                                            key={index}
                                            date={item.date}
                                            major={item.major}
                                            school={item.school}
                                            description={item.description}
                                            index={index}
                                        />
                                    ))
                                }
                            </Stack> :
                            <VerticalTimeline
                                lineColor='white'
                                animate={false}
                            >
                                {
                                    content.academic.map((item, index) => {
                                        return <AcademicTimelineElement
                                            key={index}
                                            date={item.date}
                                            major={item.major}
                                            school={item.school}
                                            description={item.description}
                                            index={index}
                                        />
                                    })
                                }
                            </VerticalTimeline>
                    }
                </Stack>
            </Stack>
        </>
    );
}

export default AcademicLayout;