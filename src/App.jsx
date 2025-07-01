// Final Working Version: Recursive Multi-Header JSON Viewer with Correct Data Rendering and Multi-Row Support

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Table, Container, Form, Card, Pagination } from "react-bootstrap";
import debounce from "lodash.debounce";
import Loader from "./components/Loader";
import defaultData from "./data.json";

const deepNormalize = (input) => {
  if (Array.isArray(input)) {
    if (
      input.length === 1 &&
      typeof input[0] === "object" &&
      !Array.isArray(input[0])
    ) {
      return deepNormalize(input[0]);
    }
    return input.map(deepNormalize);
  } else if (input && typeof input === "object") {
    const result = {};
    for (const key in input) {
      result[key] = deepNormalize(input[key]);
    }
    return result;
  }
  return input;
};

function getColumnPaths(obj, prefix = "") {
  let paths = [];
  for (let key in obj) {
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      paths = paths.concat(getColumnPaths(obj[key], prefix + key + "."));
    } else if (
      Array.isArray(obj[key]) &&
      obj[key].length &&
      typeof obj[key][0] === "object"
    ) {
      const nestedPaths = getColumnPaths(obj[key][0], prefix + key + ".");
      paths = paths.concat(nestedPaths);
    } else {
      paths.push(prefix + key);
    }
  }
  return paths;
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
  const children = Object.values(tree).filter(
    (child) => Object.keys(child).length > 0
  );
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
  for (let i = 0; i < parts.length; i++) {
    if (!value) return "";
    const part = parts[i];
    if (Array.isArray(value)) {
      return value
        .map((item) => getValueByPath(item, parts.slice(i).join(".")))
        .join("\n");
    }
    value = value[part];
  }
  // Normalize line breaks just for rendering
  if (typeof value === "string") {
    return value.replace(/[\r\n]+/g, " ");
  }
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}

function App() {
  const tableRef = useRef(null);
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 100;
  const [jsonData, setJsonData] = useState(() =>
    Array.isArray(defaultData)
      ? defaultData.map(deepNormalize)
      : [deepNormalize(defaultData)]
  );

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
        const normalized = Array.isArray(parsed)
          ? parsed.map(deepNormalize)
          : [deepNormalize(parsed)];
        setJsonData(normalized);
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

  //   useEffect(() => {
  //     setIsLoading(filter !== debouncedFilter);
  //   }, [filter, debouncedFilter]);
  useEffect(() => {
    // Trigger loader immediately when user types
    if (filter !== debouncedFilter) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [filter, debouncedFilter]);

  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, [page, debouncedFilter]);

  const allPaths = useMemo(() => getColumnPaths(jsonData[0] || {}), [jsonData]);
  const headerTree = useMemo(() => buildHeaderTree(allPaths), [allPaths]);
  const headerDepth = useMemo(
    () => Math.max(...allPaths.map((p) => p.split(".").length)),
    [allPaths]
  );

  const filteredData = useMemo(() => {
    if (!debouncedFilter) return jsonData;
    return jsonData.filter((row) => {
      const normalizedRow = JSON.stringify(row)
        .replace(/\\[rn]/g, " ")
        .toLowerCase();
      return normalizedRow.includes(debouncedFilter);
    });
  }, [debouncedFilter, jsonData]);

  const pageCount = Math.ceil(filteredData.length / pageSize);
  const currentPageData = useMemo(
    () => filteredData.slice((page - 1) * pageSize, page * pageSize),
    [filteredData, page]
  );

  const highlight = (text) => {
    if (!debouncedFilter || typeof text !== "string") return text;
    const regex = new RegExp(
      `(${debouncedFilter.replace(/[$()*+?.\\^{}|]/g, "\\$&")})`,
      "gi"
    );
    return text
      .split(regex)
      .map((part, i) =>
        regex.test(part) ? <mark key={i}>{part}</mark> : part
      );
  };

  const getMaxRowsForRecord = (row) => {
    let max = 1;
    for (let path of allPaths) {
      const value = getValueByPath(row, path);
      if (typeof value === "string" && value.includes("\n")) {
        const lines = value.split("\n").length;
        if (lines > max) max = lines;
      }
    }
    return max;
  };

  return (
    <Container fluid className="my-4">
      <Card className="dt-card-table overflow-y-auto">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <Card.Title as="h2">JSON Record Viewer</Card.Title>
          <div className="card-actions d-flex gap-3">
            <Form.Group style={{ minWidth: 400 }} className="mb-0">
              <Form.Control
                type="text"
                placeholder="Search..."
                value={filter}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().trim();

                  setFilter(val);
                  debouncedSetFilter(val);
                  setPage(1);
                }}
              />
            </Form.Group>
            <Form.Group className="mb-0 position-relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                id="upload-json"
                style={{ display: "none" }}
              />
              <label htmlFor="upload-json" className="btn btn-outline-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="icon"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
                  <path d="M7 9l5 -5l5 5" />
                  <path d="M12 4l0 12" />
                </svg>
                Upload JSON
              </label>
            </Form.Group>
          </div>
        </Card.Header>

        <div className="table-responsive" ref={tableRef}>
          <Loader isVisible={isLoading} />
          <Table className="table-vcenter table-bordered mb-0 card-table">
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
                currentPageData.map((row, i) => {
                  const rowSpan = getMaxRowsForRecord(row);
                  const splitValues = allPaths.map((path) => {
                    const val = getValueByPath(row, path);
                    return typeof val === "string" ? val.split("\n") : [val];
                  });

                  return [...Array(rowSpan)].map((_, ri) => (
                    <tr key={`row-${i}-${ri}`}>
                      {splitValues.map((vals, ci) => {
                        if (ri === 0 || vals.length > 1) {
                          const isRowSpan = vals.length === 1;
                          return (
                            <td
                              key={`col-${ci}`}
                              className="cell-content align-top"
                              rowSpan={isRowSpan ? rowSpan : undefined}
                            >
                              <div data-long={vals[ri]?.length > 60}>
                                {highlight(vals[ri] ?? "")}
                              </div>
                            </td>
                          );
                        }
                        return null;
                      })}
                    </tr>
                  ));
                })
              )}
            </tbody>
          </Table>
        </div>

        <Card.Footer className="d-flex justify-content-between align-items-center border-top mt-n1">
          <div>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filteredData.length)} of{" "}
            {filteredData.length}
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev
              onClick={() => setPage(Math.max(page - 1, 1))}
              disabled={page === 1}
            />
            {page > 2 && (
              <>
                <Pagination.Item onClick={() => setPage(1)}>
                  {1}
                </Pagination.Item>
                {page > 3 && <Pagination.Ellipsis disabled />}
              </>
            )}
            {Array.from({ length: pageCount }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 1)
              .map((p) => (
                <Pagination.Item
                  key={p}
                  active={p === page}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Pagination.Item>
              ))}
            {page < pageCount - 1 && (
              <>
                {page < pageCount - 2 && <Pagination.Ellipsis disabled />}
                <Pagination.Item onClick={() => setPage(pageCount)}>
                  {pageCount}
                </Pagination.Item>
              </>
            )}
            <Pagination.Next
              onClick={() => setPage(Math.min(page + 1, pageCount))}
              disabled={page === pageCount}
            />
          </Pagination>
        </Card.Footer>
      </Card>
    </Container>
  );
}

export default App;
