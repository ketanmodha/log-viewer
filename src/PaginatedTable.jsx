import React, { useMemo, useState } from "react";
import { Table, Container, Form, Card, Pagination } from "react-bootstrap";
import sampleData from "./data/sample.json";

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
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const columns = useMemo(() => extractNestedKeys(sampleData[0]), []);

  const filteredData = useMemo(() => {
    if (!filter) return sampleData;
    return sampleData.filter((row) =>
      Object.values(row).some((val) =>
        JSON.stringify(val).toLowerCase().includes(filter.toLowerCase())
      )
    );
  }, [filter]);

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
      // No nested columns — render normally
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

    // Handle rows with nested array columns
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
        <div className="page-body">
          <Container fluid>
            <Card className="dt-card-table overflow-y-auto">
              <Card.Header>
                <Card.Title as="h2">Data</Card.Title>
                <div className="card-actions">
                  <Form.Group style={{ minWidth: "400px" }}>
                    <Form.Control
                      type="text"
                      placeholder="Search..."
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setPage(1);
                      }}
                    />
                  </Form.Group>
                </div>
              </Card.Header>

              <div className="table-responsive h-100">
                <Table className="table-vcenter table-bordered mb-0 card-table">
                  <thead className="sticky-top bg-white">
                    {renderHeader(columns)}
                  </thead>
                  <tbody>
                    {paginatedData.map((row, i) => multiRender(row, i))}
                  </tbody>
                </Table>
              </div>

              <Card.Footer className="d-flex justify-content-between align-items-center">
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
