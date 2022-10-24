import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Drawing from './components/drawing/Drawing';
import Home from './components/home/Home';
import About from './components/About/About';
import Contact from './components/Contact/Conatct';
import {useState, useEffect} from 'react';
import Check from './components/drawing/check';
import Recive from './components/drawing/recive';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/drawing' element={<Check/>}/>
        <Route path='/drawing/:socketId' element={<Check/>}/>
        <Route path='/about' element={<About/>}/>
        <Route path='/contact' element={<Contact/>}/>
        // <Route path='/recive/:socketId' element={<Recive/>}/>
        // <Route path='/check' element={<Check/>}/>
      </Routes>
    </Router>
  );
}

export default App;
