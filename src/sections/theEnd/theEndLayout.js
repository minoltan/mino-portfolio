import { Stack, Typography } from "@mui/material";
import content from '../../data/profile.json';
import CircleIcon from '@mui/icons-material/Circle';
import './theEnd.css';
import preloaderGif from '../../assets/images/preloader.gif';

const TheEnd = () => {
    return (
        <>
            <Stack
                direction='row'
                justifyContent='center'
                alignItems='center'
                position='relative'
                className="layoutMarginX"
                py={{ xs: 15, md: 20 }}
            >
                {/* <img
                    src={preloaderGif}
                    alt="Infinity Loader"
                    style={{
                        width: '200px',
                        height: 'auto',
                        opacity: 1
                    }}
                /> */}

                <Typography
                    fontWeight={300}
                    fontSize={{ xs: 20, md: 20, lg: 30 }}
                    lineHeight={1.25}
                    textAlign='center'
                >
                    {content.end}
                </Typography>
            </Stack>
        </>
    );
}

export default TheEnd;