import { useState } from "react";

const Table = ({
  columns = [],
  data = [],
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  idKey = "id",
}) => {
  const [prevDataLength, setPrevDataLength] = useState(data.length);
  const [currentPage, setCurrentPage] = useState(1);

  if (data.length !== prevDataLength) {
    setPrevDataLength(data.length);
    setCurrentPage(1);
  }

  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  const currentRows = data.slice(startIndex, endIndex);

  const handleHeaderCheckboxChange = (e) => {
    if (onSelectAll) {
      onSelectAll(e.target.checked, currentRows);
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const isAllSelectedOnCurrentPage =
    currentRows.length > 0 &&
    currentRows.every((row) => selectedIds.includes(row[idKey]));

  const renderCell = (row, col) => {
    if (col.render) {
      return col.render(row);
    }
    const val = row[col.accessor];
    if (typeof val === "boolean") {
      return val ? "Yes" : "No";
    }
    return val !== undefined && val !== null ? String(val) : "";
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="overflow-x-auto border border-base-300 rounded-md">
        <table className="table w-full bg-base-100 text-sm">
          <thead>
            <tr className="bg-base-200">
              {onSelectAll && onSelectRow && (
                <th className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelectedOnCurrentPage}
                    onChange={handleHeaderCheckboxChange}
                    className="checkbox checkbox-sm"
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th key={idx} className={col.className || ""}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelectAll ? 1 : 0)}
                  className="text-center py-8 text-gray-500 italic"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              currentRows.map((row) => {
                const rowId = row[idKey];
                const isSelected = selectedIds.includes(rowId);

                return (
                  <tr key={rowId} className="hover:bg-base-200">
                    {onSelectAll && onSelectRow && (
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow(rowId)}
                          className="checkbox checkbox-sm"
                        />
                      </td>
                    )}
                    {columns.map((col, idx) => (
                      <td key={idx} className={col.className || ""}>
                        {renderCell(row, col)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 py-1 select-none">
          <div className="text-xs text-gray-500 font-semibold">
            Showing{" "}
            <span className="text-base-content">
              {data.length === 0 ? 0 : startIndex + 1}
            </span>{" "}
            to <span className="text-base-content">{endIndex}</span> of{" "}
            <span className="text-base-content">{data.length}</span> entries
          </div>

          <div className="join">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="join-item btn btn-xs btn-outline btn-neutral"
            >
              « Prev
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
              (pNum) => (
                <button
                  key={pNum}
                  onClick={() => handlePageChange(pNum)}
                  className={`join-item btn btn-xs ${
                    currentPage === pNum
                      ? "btn-primary text-primary-content"
                      : "btn-outline btn-neutral"
                  }`}
                >
                  {pNum}
                </button>
              )
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="join-item btn btn-xs btn-outline btn-neutral"
            >
              Next »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
