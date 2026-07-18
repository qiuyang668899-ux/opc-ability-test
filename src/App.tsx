import { lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

const Home = lazy(() => import('./pages/Home'))
const Architect = lazy(() => import('./pages/Architect'))
const Journal = lazy(() => import('./pages/Journal'))
const BioSync = lazy(() => import('./pages/BioSync'))
const SystemReset = lazy(() => import('./pages/SystemReset'))
const VisualDiag = lazy(() => import('./pages/VisualDiag'))
const Activation = lazy(() => import('./pages/Activation'))
const Protocols = lazy(() => import('./pages/Protocols'))
const FlowLab = lazy(() => import('./pages/FlowLab'))
const MoodMusic = lazy(() => import('./pages/MoodMusic'))
const Support = lazy(() => import('./pages/Support'))
const About = lazy(() => import('./pages/About'))
const Tools = lazy(() => import('./pages/Tools'))
const Classics = lazy(() => import('./pages/Classics'))
const Evolution = lazy(() => import('./pages/Evolution'))
const DailyRitual = lazy(() => import('./pages/DailyRitual'))

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
      <Route path="ritual" element={<DailyRitual />} />
      <Route path="reset/:protocol?" element={<SystemReset />} />
    </Routes>
  )
}
