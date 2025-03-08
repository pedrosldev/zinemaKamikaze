import React from "react";
import MovingLetters from "./MovingLetters";




function Footer(){
    const word = "Piterxus"
    const letters = word.split("")
return (
   
    <footer>

    <div className="movingLetters">
        {letters.map((letter, index) => (
            <MovingLetters letter={letter} size={2} displacement={index/2} key={index}/>
        ))}
            <MovingLetters letter="©" />
    </div>
        {/* <MovingLetters letter="P" size={2} displacement={12}/>
        <MovingLetters letter="i" size={2} displacement={17} />
        <MovingLetters letter="t" size={2}/>
        <MovingLetters letter="e" size={2}/>
        <MovingLetters letter="r" size={2}/>
        <MovingLetters letter="x" size={2}/>
        <MovingLetters letter="u" size={2}/>
        <MovingLetters letter="s" size={2}/>
        <MovingLetters letter="©"/> */}
    </footer>
)
}

export default Footer;