import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarGroup, Box, Divider, Drawer, IconButton, Stack, Tooltip, Typography, useTheme, alpha } from "@mui/material";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import LaunchIcon from '@mui/icons-material/Launch';


const carouselSettings = {
    dots: true,
    infinite: true,
    arrows: false,
    centerMode: false,
    pauseOnHover: true,
    swipeToSlide: true,
    vertical: true,
    speed: 1000,
    autoplay: true,
    className: "center",
    slidesToShow: 1,
    slidesToScroll: 1,
    rows: 1,
    className: "slider variable-width"
};

const WorkExperienceListRow = ({ item, lastItem }) => {
    const theme = useTheme();
    const isSenior = (item) => /Senior/i.test(item.role);
    const groupRef = useRef(null);

    const [drawerState, setDrawerState] = useState(false);

    useEffect(() => {
        const groupNode = groupRef.current;

        if (!groupNode) return;

        const handleClick = (e) => {
            const target = e.target;

            if (target?.innerText?.startsWith('+')) {
                setDrawerState(true);
            }
        };

        groupNode.addEventListener('click', handleClick);

        return () => groupNode.removeEventListener('click', handleClick);
    }, []);

    return (
        <>
            <Stack
                direction='column'
                alignItems='start'
                justifyContent='center'
                width='100%'
            >
                {/* Title, Duration and Tech Stacks */}
                <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    width='100%'
                >
                    {/* Title, and Duration */}
                    <Stack
                        direction='column'
                        alignItems='start'
                        justifyContent='center'
                        spacing={0.5}
                    >
                        {/* Title */}
                        <Typography
                            fontWeight={400}
                            fontSize={18}
                        >
                            {item.role}
                        </Typography>

                        {/* Duration */}
                        <Typography
                            fontWeight={400}
                            fontSize={12}
                            color="#666666"
                        >
                            {item.duration}
                        </Typography>
                    </Stack>

                    {/* Tech Stacks */}
                    <AvatarGroup
                        max={4}
                        spacing={6}
                        sx={{
                            '& .MuiAvatar-root': {
                                border: '1px solid #EEEEEE'
                            },
                            '& .MuiAvatarGroup-avatar': {
                                backgroundColor: 'white',
                                color: theme.palette.primary.main,
                                fontWeight: 'bold',
                                "&:hover": {
                                    cursor: 'pointer',
                                    transform: 'scale(1.1)'
                                }
                            }
                        }}
                        ref={groupRef}
                    >
                        {
                            item.teck_stacks.map((logoItem, index) => {
                                return <Tooltip key={index} title={logoItem.label}>
                                    <Avatar
                                        sx={{
                                            backgroundColor: 'white'
                                        }}
                                    >
                                        <img
                                            src={`${process.env.PUBLIC_URL}/${logoItem.path}`}
                                            alt={logoItem.label}
                                            style={{
                                                width: '70%',
                                                height: '70%',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    </Avatar>
                                </Tooltip>
                            })
                        }
                    </AvatarGroup>
                </Stack>

                {/* Images, Description and Link */}
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent={{ xs: 'center', md: 'space-between' }}
                    alignItems='start'
                >
                    {/* Images, and Description */}
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent='start'
                        alignItems={{ xs: 'center', md: 'start' }}
                    >
                        {/* Images */}
                        <Stack
                            direction='row'
                            justifyContent='start'
                            alignItems='center'
                        >
                            {
                                item.company.images.length > 0
                                    ?
                                    <>
                                        {
                                            item.company.images.length === 1
                                                ?
                                                <Box
                                                    width={250}
                                                    height={150}
                                                    my={3}
                                                    sx={{
                                                        overflow: 'hidden',
                                                        borderRadius: '16px'
                                                    }}
                                                >
                                                    <img
                                                        alt='Working still'
                                                        src={`${process.env.PUBLIC_URL}/${item.company.images[0]}`}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            objectPosition: 'center',
                                                            borderRadius: '16px',
                                                            display: 'block'
                                                        }}
                                                    />
                                                </Box>
                                                :
                                                <Box
                                                    my={3}
                                                    sx={{
                                                        width: 250,
                                                        height: 150,
                                                        overflow: 'hidden',
                                                        borderRadius: '16px',
                                                        '& .slick-slider': {
                                                            height: '100%'
                                                        },
                                                        '& .slick-list': {
                                                            height: '100%'
                                                        },
                                                        '& .slick-track': {
                                                            height: '100%'
                                                        },
                                                        '& .slick-slide': {
                                                            height: '150px'
                                                        },
                                                        '& .slick-slide > div': {
                                                            height: '100%'
                                                        }
                                                    }}
                                                >
                                                    <div className="slider-container" style={{ height: '100%' }}>
                                                        <Slider {...carouselSettings}>
                                                            {
                                                                item.company.images.map((companyImg, index) => {
                                                                    return <div key={index} style={{ height: '100%' }}>
                                                                        <Box sx={{ height: '100%', width: '100%' }}>
                                                                            <img
                                                                                alt={`Working still ${index}`}
                                                                                src={`${process.env.PUBLIC_URL}/${companyImg}`}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: '100%',
                                                                                    objectFit: 'cover',
                                                                                    objectPosition: 'center',
                                                                                    borderRadius: '16px',
                                                                                    display: 'block'
                                                                                }}
                                                                            />
                                                                        </Box>
                                                                    </div>
                                                                })
                                                            }
                                                        </Slider>
                                                    </div>
                                                </Box>
                                        }
                                    </>
                                    :
                                    <></>
                            }
                        </Stack>

                        {/* Description */}
                        <Typography
                            fontWeight={300}
                            fontSize={{ xs: 14, md: 12, lg: 14 }}
                            textAlign='justify'
                            lineHeight={2}
                            color="text.secondary"
                            pt={2}
                            pl={{ xs: 0, md: item.company.images.length > 0 ? 4 : 0 }}
                        >
                            {item.description}
                        </Typography>
                    </Stack>

                    {/* Link */}
                    {
                        item.company.link.trim().length > 0
                            ?
                            <Stack
                                direction='column'
                                alignItems='center'
                                justifyContent='center'
                                pl={{ xs: 0, md: 5, lg: 10 }}
                                py={{ xs: 2, md: 0 }}
                                display='flex'
                                margin='auto'
                            >
                                <IconButton
                                    aria-label="navigate"
                                    size="large"
                                    variant="contained"
                                    sx={{
                                        backgroundColor: theme.palette.primary.main,
                                        color: 'white',
                                        "&:hover": {
                                            backgroundColor: theme.palette.primary.main,
                                            transform: 'scale(1.1)'
                                        }
                                    }}
                                    onClick={() => {
                                        window.open(item.company.link, "_blank");
                                    }}
                                >
                                    <LaunchIcon />
                                </IconButton>
                            </Stack>
                            :
                            <></>
                    }
                </Stack>

                {
                    lastItem
                        ?
                        <></>
                        :
                        <Divider sx={{ width: '100%', mt: 2 }} />
                }
            </Stack>

            {/* Tech Stacks List */}
            <Drawer
                anchor="bottom"
                open={drawerState}
                onClose={() => setDrawerState(false)}
                slotProps={{
                    backdrop: {
                        invisible: true
                    },
                    paper: {
                        elevation: 10,
                        square: false,
                        style: {
                            borderRadius: '20px',
                            bottom: 10,
                            marginLeft: 10,
                            marginRight: 10,
                            zIndex: 1
                        }
                    },
                }}
            >
                <Stack
                    direction='row'
                    justifyContent={{ xs: 'start', md: 'center' }}
                    alignItems='center'
                    width='100%'
                    py={2}
                    px={2}
                    spacing={2}
                    borderRadius={5}
                    sx={{
                        backgroundColor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        overflowX: 'scroll',
                        boxShadow: theme.shadows[1]
                    }}
                    className="hideScrollBar"
                >
                    {
                        item.teck_stacks.map((logoItem, index) => {
                            return <Tooltip key={index} title={logoItem.label}>
                                <Avatar
                                    sx={{
                                        backgroundColor: 'white',
                                        width: { xs: 40, md: 60, lg: 80 },
                                        height: { xs: 40, md: 60, lg: 80 },
                                        padding: 1
                                    }}
                                >
                                    <img
                                        src={`${process.env.PUBLIC_URL}/${logoItem.path}`}
                                        alt={logoItem.label}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain',
                                            objectPosition: 'center'
                                        }}
                                    />
                                </Avatar>
                            </Tooltip>
                        })
                    }
                </Stack>
            </Drawer>
        </>
    );
}

export default WorkExperienceListRow;