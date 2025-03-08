import React from "react";
import Header from "./components/Header";
import Main from "./components/Main";
import Footer from "./components/Footer";
import Wolf from '../img/handsymonster.svg'
import Zombie from '../img/zombieman.svg'
// import Bat from '../img/scarey-bat.svg'
import Death from '../img/deathspector.svg'
import LivingGhost from '../img/livingghost.svg'
import creepyFace from '../img/creepyFace.svg'


function App(){
  
    return (
        <>
        
            <Header imgLeft={LivingGhost}  imgRight={creepyFace} />
            <Main />
            <Footer/>
            
        
        </>
    )
}

export default App;