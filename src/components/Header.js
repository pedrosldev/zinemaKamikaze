import React from "react";

function Header({ imgLeft, imgRight, imgCenter }) {
  return (
    <header>
      <img className="imgHeaderLeft" src={imgLeft} alt="header-img" />
      <div className="centerHeader">  <h1>THE HAUNTED HOUSE OF PITERXUS</h1>
   
      </div>
      <img className="imgHeaderRight" src={imgRight} alt="header-img" />
    </header>
  );
}

export default Header;