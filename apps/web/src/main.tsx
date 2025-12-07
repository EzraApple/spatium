import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { LandingPage } from "./pages/landing"
import { EditorPage } from "./pages/editor"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/edit/:id" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
