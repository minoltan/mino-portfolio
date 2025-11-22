import { Avatar, Card, Stack, Typography } from "@mui/material";

const HeroCard = ({
    label,
    value,
    logo,
    cardSX
}) => {
    return (
        <>
            <Card
                elevation={10}
                sx={{
                    borderRadius: {xs: 2, md: 2, lg: 4},
                    position: 'absolute',
                    display: 'inline-block',
                    width: 'fit-content',
                    ...cardSX
                }}
            >
                <Stack
                    p={{xs: 1, md: 1, lg: 2}}
                    direction='row'
                    justifyContent='center'
                    alignItems='center'
                    bgcolor='white'
                >
                    <Avatar 
                        alt="country" 
                        src={logo}
                        sx={{
                            width: {xs: 20, md: 20, lg: 40},
                            height: {xs: 20, md: 20, lg: 40}
                        }}
                    />

                    <Stack
                        direction='column'
                        justifyContent='space-between'
                        alignItems='start'
                        px={1}
                    >
                        <Typography 
                            fontWeight={600}
                            fontSize={{xs: 12, md: 12, lg: 16}}
                        >
                            {label}
                        </Typography>

                        <Typography 
                            fontSize={{xs: 8, md: 8, lg: 10}}
                            mt={-0.1}
                            color="#222222"
                            style={{ 
                                wordWrap: "break-word",
                                lineHeight: 1.25
                            }}
                        >
                            {value}
                        </Typography>
                    </Stack>
                </Stack>
            </Card>
        </>
    );
}

export default HeroCard;