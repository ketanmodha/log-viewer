import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import PaginatedTable from "./PaginatedTable";
import VirtualizedTable from "./VirtualizedTable";
import "./assets/style.css";
import { Container } from "react-bootstrap";

function App() {
  return (
    <Router>
      {/* <Container fluid> */}
        <Routes>
          <Route path="/paginated" element={<PaginatedTable />} />
          <Route path="/virtual" element={<VirtualizedTable />} />
          <Route path="*" element={<PaginatedTable />} /> {/* default */}
        </Routes>
      {/* </Container> */}
    </Router>
  );
}

export default App;