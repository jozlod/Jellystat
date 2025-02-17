import { Nav, Navbar as BootstrapNavbar } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { navData } from "../../../lib/navdata";
import LogoutBoxLineIcon from "remixicon-react/LogoutBoxLineIcon";
import logo_dark from "../../images/icon-b-512.png";
import "../../css/navbar.css";
import VersionCard from "./version-card";
import { Trans } from "react-i18next";

export default function Navbar() {
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("config");
    deleteLibraryTabKeys();
    window.location.reload();
  };

  const deleteLibraryTabKeys = () => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("PREF_")) {
        localStorage.removeItem(key);
      }
    }
  };

  const location = useLocation();

  return (
    <BootstrapNavbar variant="dark" className=" d-flex flex-column py-0 text-center sticky-top">
      <div className="sticky-top py-md-3">
        <BootstrapNavbar.Brand as={Link} to={"/"} className="d-none d-md-inline">
          <img src={logo_dark} style={{ height: "52px" }} className="px-2" alt="" />
          <span>
            <Trans i18nKey="JELLYSTAT" />
          </span>
        </BootstrapNavbar.Brand>

        <Nav className="flex-row flex-md-column w-100">
          {navData.map((item) => {
            const locationString = location.pathname.toLocaleLowerCase();
            const isActive =
              locationString.includes(("/" + item.link).toLocaleLowerCase()) &&
              ((locationString.length > 0 && item.link.length > 0) || (locationString.length === 1 && item.link.length === 0)); // check if the link is the current path
            return (
              <Nav.Link
                as={Link}
                key={item.id}
                className={`navitem${isActive ? " active" : ""} p-2`} // add the "active" class if the link is active
                to={item.link}
              >
                {item.icon}
                <span className="d-none d-md-block nav-text">{item.text}</span>
              </Nav.Link>
            );
          })}
          <Nav.Link className="navitem  p-2 logout" href="#logout" onClick={handleLogout}>
            <LogoutBoxLineIcon />
            <span className="d-none d-md-block nav-text">
              <Trans i18nKey="MENU_TABS.LOGOUT" />
            </span>
          </Nav.Link>
        </Nav>
      </div>
      <VersionCard />
    </BootstrapNavbar>
  );
}
