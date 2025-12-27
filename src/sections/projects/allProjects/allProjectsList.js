import { useEffect } from "react";
import { ImageList, ImageListItem, ImageListItemBar, useTheme, useMediaQuery } from "@mui/material";
import { Link } from "react-router-dom";
import AOS from 'aos';
import 'aos/dist/aos.css';

const AllProjectsList = ({ area, imgList }) => {
    const theme = useTheme();
    const matchDownMd = useMediaQuery(theme.breakpoints.down('md'));
    const matchDownSm = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        AOS.init({ duration: 500 });
    }, []);

    const cols = matchDownSm ? 1 : matchDownMd ? 2 : 4;

    return (
        <>
            <ImageList
                sx={{
                    width: '100%',
                    padding: '16px'
                }}
                variant="quilted"
                cols={cols}
                gap={16}
                rowHeight="auto"
            >
                {
                    imgList.map((item, index) => (
                        <Link
                            to={`/project/${area}/${index + 1}`}
                            key={index}
                            style={{ textDecoration: 'none' }}
                        >
                            <ImageListItem
                                data-aos="zoom-in"
                                data-aos-once={true}
                                sx={{
                                    overflow: 'hidden',
                                    borderRadius: '16px',
                                    transition: 'transform 0.3s ease',
                                    cursor: 'pointer',
                                    "&:hover": {
                                        transform: 'scale(0.95)'
                                    }
                                }}
                            >
                                <img
                                    srcSet={`${item.thumbnail}?w=400&h=200&fit=crop&auto=format&dpr=2 2x`}
                                    src={`${item.thumbnail}?w=400&h=200&fit=crop&auto=format`}
                                    alt={item.title}
                                    loading="lazy"
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        aspectRatio: '2 / 1',
                                        objectFit: 'cover',
                                        objectPosition: 'center',
                                        display: 'block',
                                        borderRadius: '16px'
                                    }}
                                />

                                <ImageListItemBar
                                    title={item.title}
                                    subtitle={item.tag_line}
                                    sx={{
                                        borderRadius: '0px 0px 16px 16px',
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)'
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