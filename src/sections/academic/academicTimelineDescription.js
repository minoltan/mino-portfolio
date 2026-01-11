import { Card, Stack, useTheme, Button, useMediaQuery } from "@mui/material";
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useEffect, useState } from "react";

const AcademicTimelineDescription = ({
    major,
    school,
    description,
    date,
    index
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        AOS.init({ duration: 1000 });
    }, []);

    return (
        <>
            <Card
                elevation={0}
                sx={{
                    borderRadius: '16px',
                    p: 5
                }}
                data-aos={index % 2 === 0 ? "flip-left" : "flip-right"}
            >
                <Stack
                    direction='column'
                    justifyContent='start'
                    alignItems='start'
                >
                    <h3
                        style={{
                            fontFamily: theme.typography.fontFamily,
                            fontWeight: 600
                        }}
                    >
                        {major}
                    </h3>

                    {
                        date &&
                        <h4
                            style={{
                                fontFamily: theme.typography.fontFamily,
                                fontWeight: 500,
                                fontSize: 13,
                                color: theme.palette.primary.main,
                                marginTop: -15
                            }}
                        >
                            {date}
                        </h4>
                    }

                    <h4
                        style={{
                            fontFamily: theme.typography.fontFamily,
                            fontWeight: 400,
                            fontSize: 12,
                            color: "#888888",
                            marginTop: -15
                        }}
                    >
                        {school}
                    </h4>

                    <p
                        style={{
                            fontFamily: theme.typography.fontFamily,
                            fontWeight: 300,
                            color: "text.secondary",
                            textAlign: window.innerWidth < 600 ? 'left' : 'justify',
                            fontSize: 14,
                            lineHeight: 2,
                            marginTop: 1
                        }}
                    >
                        {
                            isMobile && !isExpanded ?
                                (description.split(' ').length > 20 ? description.split(' ').slice(0, 20).join(' ') + '...' : description)
                                :
                                description
                        }
                    </p>
                    {
                        isMobile && description.split(' ').length > 20 &&
                        <Button
                            onClick={() => setIsExpanded(!isExpanded)}
                            sx={{
                                p: 0,
                                minWidth: 0,
                                textTransform: 'none',
                                mt: 1,
                                color: theme.palette.primary.main
                            }}
                        >
                            {isExpanded ? "View Less" : "View More"}
                        </Button>
                    }
                </Stack>
            </Card>
        </>
    );
}

export default AcademicTimelineDescription;