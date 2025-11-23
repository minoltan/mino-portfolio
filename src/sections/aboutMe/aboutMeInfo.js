import { Box, Stack, useTheme } from "@mui/material";
import content from '../../data/profile.json';
import AboutMeInfoCard from "./aboutMeInfoCard";
import { Male, Cake, LocationOn } from "@mui/icons-material";

const AboutMeInfo = () => {
    const theme = useTheme();

    const getIcon = (label) => {
        switch (label) {
            case 'Gender':
                return Male;
            case 'Date of Birth':
                return Cake;
            case 'Address':
                return LocationOn;
            default:
                return null;
        }
    }

    return (
        <>
            <Box
                sx={{
                    bgcolor: theme.palette.secondary.main,
                    width: { xs: '100%', md: '75%' },
                    borderRadius: 4
                }}
            >
                <Stack
                    direction='column'
                    spacing={2}
                    p={{ xs: 3, md: 5 }}
                >
                    {
                        content.about_me.info.map((item, index) => {
                            return <AboutMeInfoCard
                                key={index}
                                label={item.label}
                                value={item.value}
                                logo={`${process.env.PUBLIC_URL}/${item.path}`}
                                icon={getIcon(item.label)}
                                width='100%'
                                elevation={0}
                                index={index}
                                cardSX={{
                                    width: '100%'
                                }}
                            />
                        })
                    }
                </Stack>
            </Box>
        </>
    );
}

export default AboutMeInfo;