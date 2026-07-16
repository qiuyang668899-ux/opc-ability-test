import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Architect from './pages/Architect'
import Journal from './pages/Journal'
import BioSync from './pages/BioSync'
import SystemReset from './pages/SystemReset'
import VisualDiag from './pages/VisualDiag'
import Activation from './pages/Activation'
import Protocols from './pages/Protocols'
import FlowLab from './pages/FlowLab'
import MoodMusic from './pages/MoodMusic'
import Support from './pages/Support'
import About from './pages/About'
import Tools from './pages/Tools'
import Classics from './pages/Classics'
import Evolution from './pages/Evolution'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="architect" element={<Architect />} />
        <Route path="journal" element={<Journal />} />
        <Route path="biosync" element={<BioSync />} />
        <Route path="activation" element={<Activation />} />
        <Route path="protocols" element={<Protocols />} />
        <Route path="flow" element={<FlowLab />} />
        <Route path="music" element={<MoodMusic />} />
        <Route path="tools" element={<Tools />} />
        <Route path="classics" element={<Classics />} />
        <Route path="evolution" element={<Evolution />} />
        <Route path="support" element={<Support />} />
        <Route path="about" element={<About />} />
        <Route path="visual" element={<VisualDiag />} />
      </Route>
      <Route path="reset/:protocol?" element={<SystemReset />} />
    </Routes>
  )
}
