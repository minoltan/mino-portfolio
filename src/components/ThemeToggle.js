import React, { useContext } from 'react';
import { IconButton, useTheme } from '@mui/material';
import { ColorModeContext } from '../theme/ColorModeContext';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

const ThemeToggle = () => {
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);

    return (
        <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
    );
};

export default ThemeToggle;
