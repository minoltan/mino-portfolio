import { useEffect } from "react";
import { ImageList, ImageListItem, ImageListItemBar, useTheme, useMediaQuery } from "@mui/material";
import { Link } from "react-router-dom";
import AOS from 'aos';
import 'aos/dist/aos.css';

const AllProjectsList = ({ area, imgList }) => {
    useEffect(() => {
        AOS.init({ duration: 500 });
    }, []);

    const theme = useTheme();
    const matchDownMd = useMediaQuery(theme.breakpoints.down('md'));
    const matchDownSm = useMediaQuery(theme.breakpoints.down('sm'));

    const cols = matchDownSm ? 1 : matchDownMd ? 2 : 4;

    return (
        <>
            <ImageList
                sx={{ width: '100%', padding: '16px' }}
                variant="quilted"
                cols={cols}
                gap={16}
                rowHeight={matchDownSm ? 200 : 350}
            >
                {
                    imgList.map((item, index) => (
                        <Link
                            to={`/project/${area}/${index + 1}`}
                            key={index}
                        >
                            <ImageListItem
                                data-aos="zoom-in"
                                data-aos-once={true}
                            >
                                <img
                                    srcSet={`${item.thumbnail}?w=400&h=400&fit=crop&auto=format&dpr=2 2x`}
                                    src={`${item.thumbnail}?w=400&h=400&fit=crop&auto=format`}
                                    alt={item.title}
                                    loading="lazy"
                                    style={{
                                        borderRadius: '16px',
                                        "&:hover": {
                                            transform: 'scale(0.2)'
                                        }
                                    }}
                                />

                                <ImageListItemBar
                                    title={item.title}
                                    subtitle={item.tag_line}
                                    sx={{
                                        borderRadius: '0px 0px 16px 16px'
                                    }}
                                />
                            </ImageListItem>
                        </Link>
                    ))
                }
            </ImageList>
        </>
    );
}

export default AllProjectsList;