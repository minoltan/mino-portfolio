import { Outlet } from "react-router-dom";
import FooterLayout from "../sections/footer/footerLayout";

const Layout = () => {
  return (
    <>
      <Outlet />
      <FooterLayout />
    </>
  )
};

export default Layout;