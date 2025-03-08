import React from "react";


function MovingLetters({letter, size, displacement}) {
    return (

        <p className="ondulation" style={{fontSize:`${size}rem`, animationDuration: `${displacement}s`}}>{letter}</p>
      
    );
}

export default MovingLetters;