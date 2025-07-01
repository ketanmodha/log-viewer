// Final Working Version: Recursive Multi-Header JSON Viewer with Correct Data Rendering

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  Container,
  Form,
  Card,
  Pagination,
} from "react-bootstrap";
import debounce from "lodash.debounce";
import Loader from "./components/Loader";
import defaultData from "./data.json";

// Recursively extract paths from object
function getColumnPaths(obj, prefix = "") {
  let paths = [];
  for (let key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      paths = paths.concat(getColumnPaths(obj[key], prefix + key + "."));
    } else if (Array.isArray(obj[key]) && obj[key].length && typeof obj[key][0] === "object") {
      paths = paths.concat(getColumnPaths(obj[key][0], prefix + key + "."));
    } else {
      paths.push(prefix + key);
    }
  }
  return paths;
}

function splitHeaderPath(path) {
  return path.split(".").map((segment, i) => ({ key: segment, depth: i }));
}

function buildHeaderTree(paths) {
  const tree = {};
  for (const path of paths) {
    let current = tree;
    const segments = path.split(".");
    for (const seg of segments) {
      if (!current[seg]) current[seg] = {};
      current = current[seg];
    }
  }
  return tree;
}

function renderHeaderRows(tree, depth = 0, maxDepth = 0) {
  const row = [];
  for (const key in tree) {
    const child = tree[key];
    const hasChildren = Object.keys(child).length > 0;
    row.push(
      <th
        key={key + depth}
        colSpan={hasChildren ? countLeafNodes(child) : 1}
        rowSpan={hasChildren ? 1 : maxDepth - depth + 1}
        className="text-nowrap text-dark"
      >
        {key}
      </th>
    );
  }
  const children = Object.values(tree).filter((child) => Object.keys(child).length > 0);
  return [<tr key={depth}>{row}</tr>].concat(
    children.length
      ? renderHeaderRows(
          Object.assign({}, ...Object.values(tree)),
          depth + 1,
          maxDepth
        )
      : []
  );
}

function countLeafNodes(tree) {
  let count = 0;
  for (const key in tree) {
    if (Object.keys(tree[key]).length === 0) count++;
    else count += countLeafNodes(tree[key]);
  }
  return count;
}

function getValueByPath(obj, path) {
  const parts = path.split(".");
  let value = obj;
  for (let p of parts) {
    if (!value) return "";
    value = value[p];
  }
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

function App() {
  const tableRef = useRef(null);
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [jsonData, setJsonData] = useState(defaultData);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const debouncedSetFilter = useRef(
    debounce((val) => setDebouncedFilter(val.toLowerCase().trim()), 300)
  ).current;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) setJsonData(parsed);
        else setJsonData([parsed]);
        setPage(1);
        setFilter("");
        setDebouncedFilter("");
      } catch (err) {
        alert("Invalid JSON");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (filter !== debouncedFilter) setIsLoading(true);
    else setIsLoading(false);
  }, [filter, debouncedFilter]);

  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, [page, debouncedFilter]);

  const allPaths = useMemo(() => getColumnPaths(jsonData[0] || {}), [jsonData]);
  const headerTree = useMemo(() => buildHeaderTree(allPaths), [allPaths]);
  const headerDepth = useMemo(() => Math.max(...allPaths.map(p => p.split(".").length)), [allPaths]);

  const filteredData = useMemo(() => {
    if (!debouncedFilter) return jsonData;
    return jsonData.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(debouncedFilter)
    );
  }, [debouncedFilter, jsonData]);

  const pageCount = Math.ceil(filteredData.length / pageSize);
  const currentPageData = useMemo(
    () => filteredData.slice((page - 1) * pageSize, page * pageSize),
    [filteredData, page]
  );

  const highlight = (text) => {
    if (!debouncedFilter || typeof text !== "string") return text;
    const regex = new RegExp(`(${debouncedFilter.replace(/[$()*+?.\\^{}|]/g, "\\$&")})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  return (
    <Container fluid className="my-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <Form.Group style={{ minWidth: 400 }} className="mb-0">
            <Form.Control
              type="text"
              placeholder="Search..."
              value={filter}
              onChange={(e) => {
                const val = e.target.value;
                setFilter(val);
                debouncedSetFilter(val);
                setPage(1);
              }}
            />
          </Form.Group>
          <Form.Group className="mb-0">
            <Form.Control type="file" accept=".json" onChange={handleFileUpload} />
          </Form.Group>
        </Card.Header>

        <div className="table-responsive" ref={tableRef}>
          <Loader isVisible={isLoading} />
          <Table bordered hover size="sm" className="mb-0">
            <thead className="sticky-top bg-white">
              {renderHeaderRows(headerTree, 0, headerDepth - 1)}
            </thead>
            <tbody>
              {currentPageData.length === 0 ? (
                <tr>
                  <td colSpan="100%" className="text-center py-5 text-muted">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                currentPageData.map((row, i) => (
                  <tr key={i}>
                    {allPaths.map((path) => (
                      <td key={path}>{highlight(getValueByPath(row, path))}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        <Card.Footer className="d-flex justify-content-between align-items-center">
          <div>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filteredData.length)} of {filteredData.length}
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev onClick={() => setPage(Math.max(page - 1, 1))} disabled={page === 1} />
            {[...Array(pageCount)].map((_, i) => (
              <Pagination.Item
                key={i}
                active={i + 1 === page}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setPage(Math.min(page + 1, pageCount))} disabled={page === pageCount} />
          </Pagination>
        </Card.Footer>
      </Card>
    </Container>
  );
}

export default App;