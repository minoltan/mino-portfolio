import { Box, Drawer, IconButton, List, ListItem, ListItemButton, Stack, Typography, useTheme, alpha, Badge } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import ButtonComponent from "../../components/buttonComponent";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import MenuIcon from '@mui/icons-material/Menu';
import content from '../../data/profile.json';
import ThemeToggle from '../../components/ThemeToggle';

const TopNavigationBar = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const topNavigationLocale = "top_navigation";

    const navOptions = [
        { label: 'home', to: '/' },
        { label: 'projects', to: '/project' },
        { label: 'blogs', to: '/blogs' },
    ];

    const [drawerState, setDrawerState] = useState(false);

    const [activePage, setActivePage] = useState('/');
    const [scrolled, setScrolled] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 900) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        const location = window.location.href;

        // Projects page
        if (location.endsWith('/project')) {
            setActivePage(navOptions[1].to);
        }
        // Blogs page
        else if (location.endsWith('/blogs')) {
            setActivePage(navOptions[2].to);
        }
        // Landing page
        else {
            setActivePage(navOptions[0].to);
        }
    }, []);

    const clickNavigate = useCallback((redirect) => {
        setActivePage(redirect);
    }, []);

    const contactMe = useCallback(() => {
        window.location.href = content.contact_me;
    }, []);

    const toggleDrawer = useCallback((status) => {
        setDrawerState(status);
    }, []);

    const selectNavOptionInMobile = useCallback((redirect) => {
        toggleDrawer(false);
        clickNavigate(redirect);

        navigate(redirect);
    }, []);

    return (
        <>
            <Box>
                <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    sx={{
                        backgroundColor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: theme.shadows[1]
                    }}
                    py={1}
                    px={2}
                    borderRadius={5}
                    className="layoutMarginX"
                >
                    <Stack direction='row' alignItems='center'>
                        <Link to='/'>
                            <Box
                                sx={{
                                    width: { xs: 60, md: 60 }
                                }}
                            >
                                <img
                                    src={`${process.env.PUBLIC_URL}/logo2.jpg`}
                                    alt="Logo"
                                    width='100%'
                                    style={{
                                        cursor: 'pointer',
                                        borderRadius: '50px',
                                        marginTop: '10px',
                                        padding: '5px'
                                    }}
                                />
                            </Box>
                        </Link>
                        <ThemeToggle />
                    </Stack>

                    {/* PC View */}
                    <Stack
                        direction='row'
                        justifyContent='space-between'
                        alignItems='center'
                        sx={{
                            display: { xs: 'none', md: 'flex' }
                        }}
                    >
                        <Stack
                            direction='row'
                            justifyContent='space-between'
                            alignItems='center'
                        >
                            {
                                navOptions.map((item, index) => {
                                    return <Link
                                        key={index}
                                        onClick={() => clickNavigate(item.to)}
                                        to={item.to}
                                        style={{
                                            textDecoration: 'none',
                                            color: 'inherit'
                                        }}
                                    >
                                        <Badge
                                            badgeContent={item.label === 'blogs' ? 'New' : 0}
                                            color="primary"
                                            sx={{
                                                '& .MuiBadge-badge': {
                                                    right: 10,
                                                    top: 5
                                                }
                                            }}
                                        >
                                            <Typography
                                                px={3}
                                                className="onMouseOver"
                                                fontWeight={activePage == item.to ? 600 : 300}
                                                style={{
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {t(`${topNavigationLocale}.${item.label}`)}
                                            </Typography>
                                        </Badge>
                                    </Link>
                                })
                            }
                        </Stack>

                        <ButtonComponent
                            label={t(`${topNavigationLocale}.contact`)}
                            onClick={contactMe}
                            sx={{
                                ml: 5
                            }}
                        />
                    </Stack>

                    {/* Mobile View */}
                    <IconButton
                        onClick={() => toggleDrawer(true)}
                        sx={{
                            display: { xs: 'flex', md: 'none' }
                        }}
                    >
                        <MenuIcon fontSize='large' />
                    </IconButton>

                    <Drawer
                        anchor="right"
                        open={drawerState}
                        onClose={() => toggleDrawer(false)}
                    >
                        <List>
                            {
                                navOptions.map((item, index) => {
                                    return <ListItem
                                        disablePadding
                                        key={index}
                                    >
                                        <ListItemButton
                                            onClick={() => selectNavOptionInMobile(item.to)}
                                        >
                                            <Badge
                                                badgeContent={item.label === 'blogs' ? 'New' : 0}
                                                color="primary"
                                                sx={{
                                                    width: '100%',
                                                    '& .MuiBadge-badge': {
                                                        right: 40,
                                                        top: 15
                                                    }
                                                }}
                                            >
                                                <Typography
                                                    py={2}
                                                    px={5}
                                                    className="onMouseOver"
                                                    fontWeight={activePage == item.to ? 600 : 300}
                                                    textAlign='center'
                                                    width='100%'
                                                    style={{
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {t(`${topNavigationLocale}.${item.label}`)}
                                                </Typography>
                                            </Badge>
                                        </ListItemButton>
                                    </ListItem>
                                })
                            }

                            <ButtonComponent
                                label={t(`${topNavigationLocale}.contact`)}
                                onClick={contactMe}
                                sx={{
                                    mt: 1,
                                    py: 2,
                                    width: '100%'
                                }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                <ThemeToggle />
                            </Box>
                        </List>
                    </Drawer>
                </Stack>
            </Box>
        </>
    );
}

export default TopNavigationBar;