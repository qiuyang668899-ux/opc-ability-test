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
        <Route path="support" element={<Support />} />
        <Route path="about" element={<About />} />
      </Route>
      <Route path="reset/:protocol?" element={<SystemReset />} />
      <Route path="visual" element={<VisualDiag />} />
    </Routes>
  )
}
