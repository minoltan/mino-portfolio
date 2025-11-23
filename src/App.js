import { BrowserRouter } from "react-router-dom";
import Router from "./routes/router";
import getTheme from "./theme/theme";
import { ThemeProvider } from "@emotion/react";
import { useState, useMemo } from "react";
import { ColorModeContext } from "./theme/ColorModeContext";
import { CssBaseline } from "@mui/material";

function App() {
  const [mode, setMode] = useState('dark');

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter basename={process.env.PUBLIC_URL}>
          <Router />
        </BrowserRouter>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;