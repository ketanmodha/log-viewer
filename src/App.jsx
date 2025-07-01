import debounce from "lodash.debounce";
import { useRef, useMemo, useState, useEffect } from "react";
import {
  Table,
  Container,
  Form,
  Card,
  Pagination,
  Button,
} from "react-bootstrap";
import defaultData from "./data.json";
import Loader from "./components/Loader";

const extractNestedKeys = (obj) => {
  if (typeof obj !== "object" || obj === null) return [];
  return Object.keys(obj).map((key) => {
    const val = obj[key];
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
      return { key, sub: extractNestedKeys(val[0]) };
    }
    return key;
  });
};

function App() {
  const tableRef = useRef(null);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const debouncedSetFilter = useRef(
    debounce((val) => setDebouncedFilter(val), 300)
  ).current;
  const [jsonData, setJsonData] = useState(defaultData);
  const [isLoading, setIsLoading] = useState(false);
  const pageSize = 100;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true); // <-- show loader

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          setJsonData(parsed);
          setPage(1);
          setFilter("");
          setDebouncedFilter("");
        } else {
          alert("Uploaded JSON must be an array of objects.");
        }
      } catch (error) {
        console.log("🚀 ~ handleFileUpload ~ error:", error);
        alert("Invalid JSON file.");
      } finally {
        setIsLoading(false); // <-- hide loader
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    // Trigger loader immediately when user types
    if (filter !== debouncedFilter) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [filter, debouncedFilter]);

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
    }
  }, [page, debouncedFilter]);

  const columns = useMemo(() => extractNestedKeys(jsonData[0]), [jsonData]);

  const filteredData = useMemo(() => {
    if (!debouncedFilter) return jsonData;
    return jsonData.filter((row) =>
      Object.values(row).some((val) =>
        JSON.stringify(val)
          .toLowerCase()
          .includes(debouncedFilter.toLowerCase())
      )
    );
  }, [debouncedFilter, jsonData]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page]);

  const renderHeader = (cols) => (
    <>
      <tr>
        {cols.map((col) =>
          typeof col === "string" ? (
            <th
              key={col}
              rowSpan={2}
              className="text-nowrap fw-semibold text-dark"
            >
              {col}
            </th>
          ) : (
            <th
              key={col.key}
              colSpan={col.sub.length}
              className="text-nowrap fw-semibold text-dark"
            >
              {col.key}
            </th>
          )
        )}
      </tr>
      <tr>
        {cols.flatMap((col) =>
          typeof col === "object"
            ? col.sub.map((sub) => (
                <th key={`${col.key}.${sub}`} className="text-nowrap">
                  {sub}
                </th>
              ))
            : []
        )}
      </tr>
    </>
  );

  const multiRender = (row, rowIndex) => {
    const nestedColumns = columns.filter((col) => typeof col === "object");
    if (nestedColumns.length === 0) {
      return (
        <tr key={`row-${rowIndex}`}>
          {columns.map((col) => {
            let val = row[col];
            if (Array.isArray(val)) val = val.join(", ");
            const str = String(val ?? "");
            return (
              <td key={`${col}-${rowIndex}`} className="cell-content align-top">
                <div data-long={str.length > 60}>{str}</div>
              </td>
            );
          })}
        </tr>
      );
    }

    const firstNested = nestedColumns[0];
    const nestedData = row[firstNested.key] ?? [];
    const rowSpan = nestedData.length || 1;

    return (nestedData.length ? nestedData : [null]).map((_, nestedIndex) => (
      <tr key={`row-${rowIndex}-${nestedIndex}`}>
        {columns.map((col) => {
          if (typeof col === "string") {
            let val = row[col];
            if (Array.isArray(val)) val = val.join(", ");
            const str = String(val ?? "");
            return nestedIndex === 0 ? (
              <td
                key={`${col}-${rowIndex}`}
                rowSpan={rowSpan}
                className="cell-content align-top"
              >
                <div data-long={str.length > 60}>{str}</div>
              </td>
            ) : null;
          } else if (typeof col === "object") {
            return col.sub.map((sub) => {
              const subVal = row[col.key]?.[nestedIndex]?.[sub] ?? "";
              return (
                <td
                  key={`${col.key}.${sub}-${rowIndex}-${nestedIndex}`}
                  className="cell-content align-top"
                >
                  <div data-long={String(subVal).length > 60}>{subVal}</div>
                </td>
              );
            });
          }
          return null;
        })}
      </tr>
    ));
  };

  const pageCount = Math.ceil(filteredData.length / pageSize);

  return (
    <div className="page">
      <div className="page-wrapper">
        <div className="page-body my-3">
          <Container fluid>
            <Card className="dt-card-table overflow-y-auto">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <Card.Title as="h2">JSON Record Viewer</Card.Title>
                <div className="card-actions d-flex gap-3">
                  <Form.Group style={{ minWidth: "400px" }} className="mb-0">
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
                  <Form.Group className="mb-0 position-relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      id="upload-json"
                      style={{ display: "none" }}
                    />
                    <label
                      htmlFor="upload-json"
                      className="btn btn-outline-primary d-flex align-items-center gap-1 mb-0"
                    >
                      {/* Tabler upload icon */}
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

              <div ref={tableRef} className="table-responsive h-100">
                <Loader isVisible={isLoading} />
                <Table className="table-vcenter table-bordered mb-0 card-table">
                  <thead className="sticky-top bg-muted">
                    {renderHeader(columns)}
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr className="border-0">
                        <td
                          colSpan="100%"
                          className="text-center text-muted py-5 fs-3"
                        >
                          No matching records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((row, i) => multiRender(row, i))
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
        </div>
      </div>
    </div>
  );
}

export default App;
