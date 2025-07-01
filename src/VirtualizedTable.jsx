import React, { useMemo, useState } from "react";
import { Table, Container, Form, Card } from "react-bootstrap";
import sampleData from "./data/40MB.json";

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

function ScrollableTable() {
  const [filter, setFilter] = useState("");

  const columns = useMemo(() => extractNestedKeys(sampleData[0]), []);
  const filteredData = useMemo(() => {
    if (!filter) return sampleData;
    return sampleData.filter((row) =>
      Object.values(row).some((val) =>
        JSON.stringify(val).toLowerCase().includes(filter.toLowerCase())
      )
    );
  }, [filter]);

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

  return (
    <div className="page">
      <div className="page-wrapper">
        <div className="page-body">
          <Container fluid>
            <Card className="dt-card-table overflow-hidden">
              <Card.Header>
                <Card.Title as="h2">Data</Card.Title>
                <div className="card-actions">
                  <Form.Group style={{ minWidth: "400px" }}>
                    <Form.Control
                      type="text"
                      placeholder="Search..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  </Form.Group>
                </div>
              </Card.Header>

              <div
                className="table-responsive sticky-table"
                // style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}
              >
                <Table className="table-vcenter table-bordered mb-0 card-table">
                  <thead className="sticky-top bg-white">
                    {renderHeader(columns)}
                  </thead>
                  <tbody>
                    {filteredData.map((row, i) => multiRender(row, i))}
                  </tbody>
                </Table>
              </div>
            </Card>
          </Container>
        </div>
      </div>
    </div>
  );
}

export default ScrollableTable;