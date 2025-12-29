import { createTheme } from '@mui/material/styles';

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
        // Light Mode Palette
        primary: {
          main: "#e76715",
          contrastText: "#ffffff"
        },
        secondary: {
          main: "#fdf0ed"
        },
        background: {
          default: "#f5f5f5",
          paper: "#ffffff",
          card: "#fdf0ed"
        },
        text: {
          primary: "#121212",
          secondary: "#666666"
        },
        divider: "rgba(0, 0, 0, 0.12)",
        action: {
          active: "rgba(0, 0, 0, 0.54)",
          hover: "rgba(0, 0, 0, 0.04)",
          selected: "rgba(0, 0, 0, 0.08)",
          disabled: "rgba(0, 0, 0, 0.26)",
          disabledBackground: "rgba(0, 0, 0, 0.12)"
        }
      }
      : {
        // Dark Mode Palette
        primary: {
          main: "#e76715",
          contrastText: "#ffffff"
        },
        secondary: {
          main: "#333333ff"  //  #ffcc80
        },
        background: {
          default: "#28282b",
          paper: "#1e1e1e",
          card: "#fdf0ed"
        },
        text: {
          primary: "#ffffff",
          secondary: "#b0b0b0"
        },
        divider: "rgba(255, 255, 255, 0.12)",
        action: {
          active: "#ffffff",
          hover: "rgba(255, 255, 255, 0.08)",
          selected: "rgba(255, 255, 255, 0.16)",
          disabled: "rgba(255, 255, 255, 0.3)",
          disabledBackground: "rgba(255, 255, 255, 0.12)"
        }
      }),
  },
  typography: {
    fontFamily: [
      'Poppins'
    ].join(','),
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          backgroundImage: 'none',
          border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.12)' : 'none'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          backgroundImage: 'none'
        }
      }
    }
  }
});

export default getTheme;